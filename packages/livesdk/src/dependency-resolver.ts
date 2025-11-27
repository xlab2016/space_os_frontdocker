/**
 * Dependency Resolver - resolves and orders MFE dependencies
 */

import type { ModuleManifest, DependencyResolutionResult } from './types.js';

/**
 * Parse a semver version string
 */
function parseVersion(version: string): { major: number; minor: number; patch: number } | null {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
  };
}

/**
 * Parse a dependency requirement (e.g., "auth@^1.0.0")
 */
function parseDependency(dep: string): { name: string; range: string } {
  const match = dep.match(/^([^@]+)@(.+)$/);
  if (match) {
    return { name: match[1], range: match[2] };
  }
  return { name: dep, range: '*' };
}

/**
 * Check if a version satisfies a semver range
 */
function satisfiesRange(version: string, range: string): boolean {
  if (range === '*' || range === 'latest') return true;

  const parsed = parseVersion(version);
  if (!parsed) return false;

  // Handle ^ (caret) - allows minor and patch updates
  if (range.startsWith('^')) {
    const rangeVersion = parseVersion(range.slice(1));
    if (!rangeVersion) return false;

    if (parsed.major !== rangeVersion.major) return false;
    if (parsed.major === 0) {
      // For 0.x.x, caret is more restrictive
      return parsed.minor === rangeVersion.minor && parsed.patch >= rangeVersion.patch;
    }
    return (
      parsed.minor > rangeVersion.minor ||
      (parsed.minor === rangeVersion.minor && parsed.patch >= rangeVersion.patch)
    );
  }

  // Handle ~ (tilde) - allows only patch updates
  if (range.startsWith('~')) {
    const rangeVersion = parseVersion(range.slice(1));
    if (!rangeVersion) return false;

    return (
      parsed.major === rangeVersion.major &&
      parsed.minor === rangeVersion.minor &&
      parsed.patch >= rangeVersion.patch
    );
  }

  // Handle >=
  if (range.startsWith('>=')) {
    const rangeVersion = parseVersion(range.slice(2));
    if (!rangeVersion) return false;

    if (parsed.major > rangeVersion.major) return true;
    if (parsed.major < rangeVersion.major) return false;
    if (parsed.minor > rangeVersion.minor) return true;
    if (parsed.minor < rangeVersion.minor) return false;
    return parsed.patch >= rangeVersion.patch;
  }

  // Exact match
  const rangeVersion = parseVersion(range);
  if (!rangeVersion) return false;

  return (
    parsed.major === rangeVersion.major &&
    parsed.minor === rangeVersion.minor &&
    parsed.patch === rangeVersion.patch
  );
}

/**
 * Topological sort using Kahn's algorithm
 */
function topologicalSort(
  modules: Map<string, ModuleManifest>,
  dependencyMap: Map<string, string[]>
): string[] {
  const inDegree = new Map<string, number>();
  const result: string[] = [];

  // Initialize in-degrees
  for (const name of modules.keys()) {
    inDegree.set(name, 0);
  }

  // Calculate in-degrees
  for (const [, deps] of dependencyMap) {
    for (const dep of deps) {
      if (modules.has(dep)) {
        inDegree.set(dep, (inDegree.get(dep) || 0) + 1);
      }
    }
  }

  // Find all nodes with in-degree 0
  const queue: string[] = [];
  for (const [name, degree] of inDegree) {
    if (degree === 0) {
      queue.push(name);
    }
  }

  // Process nodes
  while (queue.length > 0) {
    const node = queue.shift()!;
    result.push(node);

    const deps = dependencyMap.get(node) || [];
    for (const dep of deps) {
      if (modules.has(dep)) {
        const newDegree = (inDegree.get(dep) || 1) - 1;
        inDegree.set(dep, newDegree);
        if (newDegree === 0) {
          queue.push(dep);
        }
      }
    }
  }

  // Reverse to get correct load order (dependencies first)
  return result.reverse();
}

/**
 * Resolve dependencies for a set of module manifests
 */
export function resolveDependencies(
  manifests: ModuleManifest[],
  availableManifests: Map<string, ModuleManifest>
): DependencyResolutionResult {
  const resolved = new Map<string, ModuleManifest>();
  const conflicts: DependencyResolutionResult['conflicts'] = [];
  const dependencyMap = new Map<string, string[]>();

  // Build the full set of modules to consider
  const allModules = new Map<string, ModuleManifest>(availableManifests);
  for (const manifest of manifests) {
    allModules.set(manifest.name, manifest);
  }

  // Process each manifest and its dependencies
  const toProcess = [...manifests];
  const processed = new Set<string>();

  while (toProcess.length > 0) {
    const manifest = toProcess.shift()!;

    if (processed.has(manifest.name)) continue;
    processed.add(manifest.name);

    resolved.set(manifest.name, manifest);
    const deps: string[] = [];

    if (manifest.dependencies) {
      for (const depStr of manifest.dependencies) {
        const { name: depName, range } = parseDependency(depStr);
        deps.push(depName);

        const depManifest = allModules.get(depName);

        if (depManifest) {
          if (!satisfiesRange(depManifest.version, range)) {
            conflicts.push({
              module: manifest.name,
              required: depStr,
              available: `${depName}@${depManifest.version}`,
            });
          } else if (!processed.has(depName)) {
            toProcess.push(depManifest);
          }
        } else {
          // Dependency not found - this is a conflict
          conflicts.push({
            module: manifest.name,
            required: depStr,
            available: 'not found',
          });
        }
      }
    }

    dependencyMap.set(manifest.name, deps);
  }

  // Calculate load order
  const loadOrder = topologicalSort(resolved, dependencyMap);

  return {
    loadOrder,
    resolved,
    conflicts,
  };
}

/**
 * Check if all dependencies are satisfied
 */
export function areDependenciesSatisfied(
  manifest: ModuleManifest,
  loadedModules: Map<string, ModuleManifest>
): boolean {
  if (!manifest.dependencies || manifest.dependencies.length === 0) {
    return true;
  }

  for (const depStr of manifest.dependencies) {
    const { name: depName, range } = parseDependency(depStr);
    const loadedDep = loadedModules.get(depName);

    if (!loadedDep || !satisfiesRange(loadedDep.version, range)) {
      return false;
    }
  }

  return true;
}

export { parseVersion, parseDependency, satisfiesRange };
