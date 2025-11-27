/**
 * AI Bridge - Natural language processing and action plan generation
 * Converts user intents into executable action plans
 */

import {
  LiveSDKHost,
  ActionPlan,
  ActionStep,
  ActionResult,
  ModuleManifest,
} from '@frontdocker/livesdk';

/**
 * Intent processing result
 */
export interface IntentResult {
  success: boolean;
  plan: ActionPlan;
  explanation: string;
  suggestedResponse?: string;
}

/**
 * LLM configuration for external AI integration
 */
export interface LLMConfig {
  apiKey: string;
  endpoint: string;
  model: string;
}

/**
 * AI Bridge class for intent processing
 */
export class AIBridge {
  private host: LiveSDKHost;
  private llmConfig: LLMConfig | null = null;
  private debug: boolean;

  // Rule patterns for rule-based processing
  private patterns: Array<{
    regex: RegExp;
    handler: (match: RegExpMatchArray, context: ProcessingContext) => ActionStep[];
  }> = [];

  constructor(host: LiveSDKHost, options?: { debug?: boolean }) {
    this.host = host;
    this.debug = options?.debug ?? false;
    this.initializePatterns();
  }

  /**
   * Log debug messages
   */
  private log(...args: unknown[]): void {
    if (this.debug) {
      console.log('[AI Bridge]', ...args);
    }
  }

  /**
   * Initialize rule-based patterns
   */
  private initializePatterns(): void {
    // Pattern: "open/show order [number]"
    this.patterns.push({
      regex: /(?:open|show|display|view)\s+(?:order|the order)\s+(?:#)?(\d+)/i,
      handler: (match, ctx) => {
        const orderId = parseInt(match[1], 10);
        const steps: ActionStep[] = [];

        // Check if auth is required
        if (ctx.hasModule('auth')) {
          steps.push({
            id: steps.length + 1,
            module: 'auth',
            method: 'ensureAuthenticated',
            args: [],
            waitFor: true,
            description: 'Ensure user is authenticated',
          });
        }

        steps.push({
          id: steps.length + 1,
          module: 'orders',
          method: 'openOrder',
          args: [orderId],
          waitFor: true,
          description: `Open order #${orderId}`,
        });

        return steps;
      },
    });

    // Pattern: "set status to [status]" or "mark as [status]"
    this.patterns.push({
      regex: /(?:set\s+status\s+(?:to|as)|mark\s+(?:order\s+)?(?:as|to))\s+['"]?(\w+)['"]?/i,
      handler: (match) => {
        const status = match[1];
        return [{
          id: 1,
          module: 'orders',
          method: 'setStatus',
          args: [status],
          waitFor: true,
          description: `Set order status to "${status}"`,
        }];
      },
    });

    // Pattern: "get/show analytics/summary/dashboard"
    this.patterns.push({
      regex: /(?:get|show|display|view)\s+(?:the\s+)?(?:analytics|summary|dashboard|stats)/i,
      handler: () => {
        return [{
          id: 1,
          module: 'analytics',
          method: 'getSummary',
          args: [],
          waitFor: true,
          description: 'Get analytics summary',
        }];
      },
    });

    // Pattern: "login/authenticate [user] [pass]"
    this.patterns.push({
      regex: /(?:login|authenticate|sign\s*in)(?:\s+(?:as\s+)?['"]?(\w+)['"]?)?(?:\s+(?:with\s+password\s+)?['"]?(\w+)['"]?)?/i,
      handler: (match) => {
        const user = match[1] || 'user';
        const pass = match[2] || 'password';
        return [{
          id: 1,
          module: 'auth',
          method: 'login',
          args: [user, pass],
          waitFor: true,
          description: `Login as "${user}"`,
        }];
      },
    });

    // Pattern: "logout/sign out"
    this.patterns.push({
      regex: /(?:logout|sign\s*out|log\s*out)/i,
      handler: () => {
        return [{
          id: 1,
          module: 'auth',
          method: 'logout',
          args: [],
          waitFor: true,
          description: 'Logout user',
        }];
      },
    });

    // Combined pattern: "open order X and mark as Y"
    this.patterns.push({
      regex: /(?:open|show)\s+(?:order|the order)\s+(?:#)?(\d+)\s+(?:and|then)\s+(?:set|mark)\s+(?:it\s+)?(?:as|to|status\s+(?:to|as))\s+['"]?(\w+)['"]?/i,
      handler: (match, ctx) => {
        const orderId = parseInt(match[1], 10);
        const status = match[2];
        const steps: ActionStep[] = [];

        // Check if auth is required
        if (ctx.hasModule('auth')) {
          steps.push({
            id: steps.length + 1,
            module: 'auth',
            method: 'ensureAuthenticated',
            args: [],
            waitFor: true,
            description: 'Ensure user is authenticated',
          });
        }

        steps.push({
          id: steps.length + 1,
          module: 'orders',
          method: 'openOrder',
          args: [orderId],
          waitFor: true,
          description: `Open order #${orderId}`,
        });

        steps.push({
          id: steps.length + 1,
          module: 'orders',
          method: 'setStatus',
          args: [status],
          waitFor: true,
          description: `Set order status to "${status}"`,
        });

        return steps;
      },
    });

    // Russian patterns
    // Pattern: "открой заказ [number]"
    this.patterns.push({
      regex: /(?:открой|покажи|отобрази)\s+(?:заказ)\s+(?:#)?(\d+)/i,
      handler: (match, ctx) => {
        const orderId = parseInt(match[1], 10);
        const steps: ActionStep[] = [];

        if (ctx.hasModule('auth')) {
          steps.push({
            id: steps.length + 1,
            module: 'auth',
            method: 'ensureAuthenticated',
            args: [],
            waitFor: true,
            description: 'Проверка аутентификации',
          });
        }

        steps.push({
          id: steps.length + 1,
          module: 'orders',
          method: 'openOrder',
          args: [orderId],
          waitFor: true,
          description: `Открыть заказ #${orderId}`,
        });

        return steps;
      },
    });

    // Pattern: "открой заказ X и пометь как Y"
    this.patterns.push({
      regex: /(?:открой|покажи)\s+(?:заказ)\s+(?:#)?(\d+)\s+(?:и|затем)\s+(?:пометь|установи|поставь)\s+(?:как|статус)\s+['"]?(\w+)['"]?/i,
      handler: (match, ctx) => {
        const orderId = parseInt(match[1], 10);
        const status = match[2];
        const steps: ActionStep[] = [];

        if (ctx.hasModule('auth')) {
          steps.push({
            id: steps.length + 1,
            module: 'auth',
            method: 'ensureAuthenticated',
            args: [],
            waitFor: true,
            description: 'Проверка аутентификации',
          });
        }

        steps.push({
          id: steps.length + 1,
          module: 'orders',
          method: 'openOrder',
          args: [orderId],
          waitFor: true,
          description: `Открыть заказ #${orderId}`,
        });

        steps.push({
          id: steps.length + 1,
          module: 'orders',
          method: 'setStatus',
          args: [status],
          waitFor: true,
          description: `Установить статус "${status}"`,
        });

        return steps;
      },
    });

    // Pattern: "покажи аналитику/статистику"
    this.patterns.push({
      regex: /(?:покажи|отобрази|получи)\s+(?:аналитику|статистику|дашборд)/i,
      handler: () => {
        return [{
          id: 1,
          module: 'analytics',
          method: 'getSummary',
          args: [],
          waitFor: true,
          description: 'Получить сводку аналитики',
        }];
      },
    });
  }

  /**
   * Configure LLM for advanced intent processing
   */
  configureLLM(config: LLMConfig): void {
    this.llmConfig = config;
  }

  /**
   * Process a natural language intent
   */
  async processIntent(intent: string): Promise<IntentResult> {
    this.log('Processing intent:', intent);

    // Get available modules
    const manifests = this.host.getManifests();
    const context: ProcessingContext = {
      manifests,
      hasModule: (name: string) => manifests.some((m) => m.name === name),
      getModuleAPI: (name: string) => manifests.find((m) => m.name === name)?.api || {},
    };

    // Try rule-based processing first
    const rulePlan = this.processWithRules(intent, context);
    if (rulePlan.length > 0) {
      return {
        success: true,
        plan: rulePlan,
        explanation: `Generated plan with ${rulePlan.length} step(s) using rule-based processing`,
        suggestedResponse: this.generateResponse(rulePlan),
      };
    }

    // Try LLM if configured
    if (this.llmConfig) {
      try {
        const llmPlan = await this.processWithLLM(intent, context);
        if (llmPlan.length > 0) {
          return {
            success: true,
            plan: llmPlan,
            explanation: `Generated plan with ${llmPlan.length} step(s) using LLM`,
            suggestedResponse: this.generateResponse(llmPlan),
          };
        }
      } catch (error) {
        this.log('LLM processing failed:', error);
      }
    }

    // Could not process intent
    return {
      success: false,
      plan: [],
      explanation: 'Could not understand the intent. Available modules: ' +
        manifests.map((m) => m.name).join(', '),
    };
  }

  /**
   * Process intent using rule-based patterns
   */
  private processWithRules(intent: string, context: ProcessingContext): ActionPlan {
    // Sort patterns by regex length (longer patterns first for more specific matches)
    const sortedPatterns = [...this.patterns].sort(
      (a, b) => b.regex.source.length - a.regex.source.length
    );

    for (const pattern of sortedPatterns) {
      const match = intent.match(pattern.regex);
      if (match) {
        const steps = pattern.handler(match, context);
        // Validate that required modules exist
        const validSteps = steps.filter((step) => context.hasModule(step.module));
        if (validSteps.length === steps.length) {
          this.log('Matched pattern:', pattern.regex.source);
          return validSteps;
        }
      }
    }

    return [];
  }

  /**
   * Process intent using external LLM
   */
  private async processWithLLM(intent: string, context: ProcessingContext): Promise<ActionPlan> {
    if (!this.llmConfig) {
      return [];
    }

    const systemPrompt = this.buildSystemPrompt(context.manifests);

    const response = await fetch(this.llmConfig.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.llmConfig.apiKey}`,
      },
      body: JSON.stringify({
        model: this.llmConfig.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: intent },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`LLM request failed: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return [];
    }

    // Try to parse JSON from response
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as ActionPlan;
      }
    } catch {
      this.log('Failed to parse LLM response as JSON');
    }

    return [];
  }

  /**
   * Build system prompt for LLM
   */
  private buildSystemPrompt(manifests: ModuleManifest[]): string {
    const modulesInfo = manifests.map((m) => {
      const apiMethods = Object.entries(m.api).map(([name, def]) => {
        return `    - ${name}(${def.args.join(', ')}): ${def.returns}`;
      }).join('\n');

      return `Module: ${m.name} (v${m.version})
  Components: ${m.components.join(', ')}
  API:
${apiMethods}`;
    }).join('\n\n');

    return `You are an orchestration agent for a micro-frontend system called FrontDocker/LiveUI.
Your task is to convert natural language user intents into a sequence of API calls.

Available modules and their APIs:
${modulesInfo}

Instructions:
1. Analyze the user's intent
2. Identify which modules and methods need to be called
3. Consider dependencies (auth before data operations)
4. Return ONLY a JSON array of action steps

Output format (JSON array):
[
  { "id": 1, "module": "module_name", "method": "method_name", "args": [arg1, arg2], "waitFor": true, "description": "What this step does" }
]

Rules:
- Always include auth steps if auth module is available
- Use waitFor: true for sequential operations
- Keep descriptions concise
- Only use modules and methods that exist in the available list`;
  }

  /**
   * Generate a human-readable response for a plan
   */
  private generateResponse(plan: ActionPlan): string {
    if (plan.length === 0) {
      return 'No actions needed.';
    }

    const steps = plan.map((step, i) => {
      return `${i + 1}. ${step.description || `Call ${step.module}.${step.method}`}`;
    }).join('\n');

    return `I will execute the following steps:\n${steps}`;
  }

  /**
   * Execute an action plan
   */
  async executePlan(plan: ActionPlan): Promise<ActionResult[]> {
    const results: ActionResult[] = [];

    for (const step of plan) {
      const startTime = Date.now();

      try {
        this.log('Executing step:', step.id, step.module, step.method);
        const result = await this.host.call(step.module, step.method, step.args);
        const duration = Date.now() - startTime;

        results.push({
          stepId: step.id,
          success: true,
          result,
          duration,
        });

        this.log('Step completed:', step.id, 'result:', result);
      } catch (error) {
        const duration = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : String(error);

        results.push({
          stepId: step.id,
          success: false,
          error: errorMessage,
          duration,
        });

        this.log('Step failed:', step.id, 'error:', errorMessage);

        // Stop execution on error if waitFor is true
        if (step.waitFor) {
          break;
        }
      }
    }

    return results;
  }

  /**
   * Execute an intent directly (process + execute)
   */
  async executeIntent(intent: string): Promise<{
    intentResult: IntentResult;
    executionResults: ActionResult[];
  }> {
    const intentResult = await this.processIntent(intent);

    if (!intentResult.success || intentResult.plan.length === 0) {
      return {
        intentResult,
        executionResults: [],
      };
    }

    const executionResults = await this.executePlan(intentResult.plan);

    return {
      intentResult,
      executionResults,
    };
  }
}

/**
 * Processing context for rule handlers
 */
interface ProcessingContext {
  manifests: ModuleManifest[];
  hasModule: (name: string) => boolean;
  getModuleAPI: (name: string) => Record<string, unknown>;
}
