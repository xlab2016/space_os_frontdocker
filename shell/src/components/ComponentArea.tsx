import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useLiveSDK } from '../context/LiveSDKContext';
import styles from './ComponentArea.module.css';

interface PlacedComponent {
  id: string;
  moduleName: string;
  componentName: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Component Area - Drag and drop area for placing MFE components
 */
export function ComponentArea() {
  const { registry, host } = useLiveSDK();
  const [placedComponents, setPlacedComponents] = useState<PlacedComponent[]>([]);
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const areaRef = useRef<HTMLDivElement>(null);

  // Get all loaded modules with their components
  const loadedModules = Array.from(registry.entries.entries())
    .filter(([, entry]) => entry.status === 'loaded')
    .map(([name, entry]) => ({
      name,
      components: entry.manifest.components,
    }));

  // Handle drag start from component palette
  const handleDragStart = (e: React.DragEvent, moduleName: string, componentName: string) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      moduleName,
      componentName,
    }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  // Handle drop on the canvas area
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();

    const data = e.dataTransfer.getData('application/json');
    if (!data) return;

    const { moduleName, componentName } = JSON.parse(data);
    const rect = areaRef.current?.getBoundingClientRect();

    if (rect) {
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const newComponent: PlacedComponent = {
        id: `${moduleName}-${componentName}-${Date.now()}`,
        moduleName,
        componentName,
        x,
        y,
        width: 300,
        height: 200,
      };

      setPlacedComponents((prev) => [...prev, newComponent]);
    }
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleRemoveComponent = (id: string) => {
    setPlacedComponents((prev) => prev.filter((c) => c.id !== id));
  };

  // Render an MFE component
  const renderMFEComponent = useCallback((placed: PlacedComponent) => {
    const module = host.getModule(placed.moduleName);
    if (!module?.exports) return null;

    const Component = module.exports[placed.componentName];
    if (!Component || typeof Component !== 'function') {
      return (
        <div className={styles.componentError}>
          Component "{placed.componentName}" not found or not a valid React component
        </div>
      );
    }

    try {
      return React.createElement(Component as React.ComponentType);
    } catch (error) {
      return (
        <div className={styles.componentError}>
          Error rendering component: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      );
    }
  }, [host]);

  return (
    <div className={styles.container}>
      {/* Component Palette */}
      <div className={styles.palette}>
        <h3 className={styles.paletteTitle}>Components</h3>
        <div className={styles.paletteList}>
          {loadedModules.map(({ name, components }) => (
            <div key={name} className={styles.moduleGroup}>
              <div className={styles.moduleGroupTitle}>{name}</div>
              {components.map((componentName) => (
                <div
                  key={`${name}-${componentName}`}
                  className={styles.componentItem}
                  draggable
                  onDragStart={(e) => handleDragStart(e, name, componentName)}
                >
                  <span className={styles.componentIcon}>{'<>'}</span>
                  <span className={styles.componentName}>{componentName}</span>
                </div>
              ))}
            </div>
          ))}

          {loadedModules.length === 0 && (
            <div className={styles.emptyPalette}>
              Load modules from the registry to see available components.
            </div>
          )}
        </div>
      </div>

      {/* Canvas Area */}
      <div
        ref={areaRef}
        className={styles.canvas}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {placedComponents.map((placed) => (
          <div
            key={placed.id}
            className={`${styles.placedComponent} ${selectedComponent === placed.id ? styles.selected : ''}`}
            style={{
              left: placed.x,
              top: placed.y,
              width: placed.width,
              height: placed.height,
            }}
            onClick={() => setSelectedComponent(placed.id)}
          >
            <div className={styles.componentHeader}>
              <span className={styles.componentTitle}>
                {placed.moduleName}/{placed.componentName}
              </span>
              <button
                className={styles.removeButton}
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveComponent(placed.id);
                }}
              >
                x
              </button>
            </div>
            <div className={styles.componentContent}>
              {renderMFEComponent(placed)}
            </div>
          </div>
        ))}

        {placedComponents.length === 0 && (
          <div className={styles.canvasPlaceholder}>
            <div className={styles.placeholderIcon}>{'{ }'}</div>
            <div className={styles.placeholderText}>
              Drag components from the palette to build your UI
            </div>
            <div className={styles.placeholderSubtext}>
              LiveUI - Interface of your dreams
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
