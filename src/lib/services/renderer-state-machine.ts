/**
 * Renderer State Machine Service
 *
 * Manages the complete lifecycle of artifact rendering with proper state transitions,
 * timeout handling, error recovery, and performance monitoring integration.
 */

export type RendererState =
  | 'idle'           // Initial state, waiting for rendering request
  | 'initializing'   // Setting up renderer dependencies and configuration
  | 'loading'        // Loading external dependencies (React, Sandpack, etc.)
  | 'configuring'    // Generating configuration and preparing sandbox
  | 'mounting'       // Mounting components and creating DOM elements
  | 'bundling'       // Bundling code and resolving dependencies
  | 'rendering'      // Actively rendering the component
  | 'ready'          // Successfully rendered and interactive
  | 'error'          // Error state with recovery options
  | 'retrying'       // Attempting to recover from error
  | 'timeout'        // Timeout occurred, circuit breaker may be active
  | 'destroyed'      // Clean shutdown, resources released

export type RendererEvent =
  | 'START'          // Begin rendering process
  | 'DEPENDENCIES_LOADED'  // External dependencies loaded successfully
  | 'CONFIG_READY'   // Configuration generated and validated
  | 'MOUNTED'        // DOM elements created and mounted
  | 'BUNDLED'        // Code bundled successfully
  | 'RENDERED'       // Component rendered successfully
  | 'ERROR'          // Error occurred during any phase
  | 'TIMEOUT'        // Operation timed out
  | 'RETRY'          // User or system initiated retry
  | 'RESET'          // Reset to initial state
  | 'DESTROY'        // Clean up and destroy

export interface RendererContext {
  componentId: string;
  artifactType: string;
  startTime: number;
  currentPhaseStartTime: number;
  retryCount: number;
  maxRetries: number;
  error?: string;
  timeoutDuration?: number;
  performanceMetrics: {
    initializationTime?: number;
    loadingTime?: number;
    configuringTime?: number;
    mountingTime?: number;
    bundlingTime?: number;
    renderingTime?: number;
    totalTime?: number;
  };
}

export interface StateTransition {
  from: RendererState;
  event: RendererEvent;
  to: RendererState;
  condition?: (context: RendererContext) => boolean;
  action?: (context: RendererContext) => void;
}

export interface StateDefinition {
  onEnter?: (context: RendererContext) => void;
  onExit?: (context: RendererContext) => void;
  timeout?: number;
  timeoutEvent?: RendererEvent;
}

class RendererStateMachine {
  private state: RendererState = 'idle';
  private context: RendererContext;
  private stateDefinitions: Map<RendererState, StateDefinition> = new Map();
  private transitions: StateTransition[] = [];
  private timeoutId: NodeJS.Timeout | null = null;
  private listeners: Map<string, ((state: RendererState, context: RendererContext) => void)[]> = new Map();

  constructor(componentId: string, artifactType: string) {
    this.context = {
      componentId,
      artifactType,
      startTime: Date.now(),
      currentPhaseStartTime: Date.now(),
      retryCount: 0,
      maxRetries: 3,
      performanceMetrics: {}
    };

    this.setupStates();
    this.setupTransitions();
  }

  private setupStates(): void {
    // Idle state - waiting for work
    this.stateDefinitions.set('idle', {
      onEnter: (context) => {
        console.log(`🔄 [StateMachine] ${context.componentId}: Entered idle state`);
      }
    });

    // Initializing state - setting up basic configuration
    this.stateDefinitions.set('initializing', {
      onEnter: (context) => {
        context.currentPhaseStartTime = Date.now();
        console.log(`🚀 [StateMachine] ${context.componentId}: Initializing renderer`);
      },
      timeout: 5000,
      timeoutEvent: 'TIMEOUT'
    });

    // Loading state - loading external dependencies
    this.stateDefinitions.set('loading', {
      onEnter: (context) => {
        const initTime = Date.now() - context.currentPhaseStartTime;
        context.performanceMetrics.initializationTime = initTime;
        context.currentPhaseStartTime = Date.now();
        console.log(`📦 [StateMachine] ${context.componentId}: Loading dependencies`);
      },
      timeout: 10000,
      timeoutEvent: 'TIMEOUT'
    });

    // Configuring state - generating Sandpack config
    this.stateDefinitions.set('configuring', {
      onEnter: (context) => {
        const loadTime = Date.now() - context.currentPhaseStartTime;
        context.performanceMetrics.loadingTime = loadTime;
        context.currentPhaseStartTime = Date.now();
        console.log(`⚙️ [StateMachine] ${context.componentId}: Configuring sandbox`);
      },
      timeout: 3000,
      timeoutEvent: 'TIMEOUT'
    });

    // Mounting state - creating DOM elements
    this.stateDefinitions.set('mounting', {
      onEnter: (context) => {
        const configTime = Date.now() - context.currentPhaseStartTime;
        context.performanceMetrics.configuringTime = configTime;
        context.currentPhaseStartTime = Date.now();
        console.log(`🏗️ [StateMachine] ${context.componentId}: Mounting components`);
      },
      timeout: 5000,
      timeoutEvent: 'TIMEOUT'
    });

    // Bundling state - bundling and resolving dependencies
    this.stateDefinitions.set('bundling', {
      onEnter: (context) => {
        const mountTime = Date.now() - context.currentPhaseStartTime;
        context.performanceMetrics.mountingTime = mountTime;
        context.currentPhaseStartTime = Date.now();
        console.log(`📦 [StateMachine] ${context.componentId}: Bundling code`);
      },
      timeout: 15000,
      timeoutEvent: 'TIMEOUT'
    });

    // Rendering state - actual component rendering
    this.stateDefinitions.set('rendering', {
      onEnter: (context) => {
        const bundleTime = Date.now() - context.currentPhaseStartTime;
        context.performanceMetrics.bundlingTime = bundleTime;
        context.currentPhaseStartTime = Date.now();
        console.log(`🎨 [StateMachine] ${context.componentId}: Rendering component`);
      },
      timeout: 8000,
      timeoutEvent: 'TIMEOUT'
    });

    // Ready state - successfully rendered
    this.stateDefinitions.set('ready', {
      onEnter: (context) => {
        const renderTime = Date.now() - context.currentPhaseStartTime;
        context.performanceMetrics.renderingTime = renderTime;
        context.performanceMetrics.totalTime = Date.now() - context.startTime;

        console.log(`✅ [StateMachine] ${context.componentId}: Rendering complete`, {
          totalTime: context.performanceMetrics.totalTime,
          metrics: context.performanceMetrics
        });
      }
    });

    // Error state - error occurred
    this.stateDefinitions.set('error', {
      onEnter: (context) => {
        console.error(`🔴 [StateMachine] ${context.componentId}: Error state`, {
          error: context.error,
          retryCount: context.retryCount,
          canRetry: context.retryCount < context.maxRetries
        });
      }
    });

    // Retrying state - attempting recovery
    this.stateDefinitions.set('retrying', {
      onEnter: (context) => {
        context.retryCount++;
        context.startTime = Date.now();
        context.currentPhaseStartTime = Date.now();
        console.log(`🔄 [StateMachine] ${context.componentId}: Retrying (${context.retryCount}/${context.maxRetries})`);
      },
      timeout: 2000,
      timeoutEvent: 'START' // After retry delay, start over
    });

    // Timeout state - operation timed out
    this.stateDefinitions.set('timeout', {
      onEnter: (context) => {
        const elapsedTime = Date.now() - context.currentPhaseStartTime;
        context.timeoutDuration = elapsedTime;
        console.warn(`⏰ [StateMachine] ${context.componentId}: Timeout after ${elapsedTime}ms`);
      }
    });

    // Destroyed state - clean shutdown
    this.stateDefinitions.set('destroyed', {
      onEnter: (context) => {
        console.log(`🔥 [StateMachine] ${context.componentId}: Resources destroyed`);
      }
    });
  }

  private setupTransitions(): void {
    // Normal flow transitions
    this.addTransition('idle', 'START', 'initializing');
    this.addTransition('initializing', 'DEPENDENCIES_LOADED', 'loading');
    this.addTransition('loading', 'CONFIG_READY', 'configuring');
    this.addTransition('configuring', 'MOUNTED', 'mounting');
    this.addTransition('mounting', 'BUNDLED', 'bundling');
    this.addTransition('bundling', 'RENDERED', 'rendering');
    this.addTransition('rendering', 'RENDERED', 'ready');

    // Error transitions from any state
    this.addTransition('*', 'ERROR', 'error');
    this.addTransition('*', 'TIMEOUT', 'timeout');

    // Retry transitions
    this.addTransition('error', 'RETRY', 'retrying', (context) => context.retryCount < context.maxRetries);
    this.addTransition('timeout', 'RETRY', 'retrying', (context) => context.retryCount < context.maxRetries);
    this.addTransition('retrying', 'START', 'initializing');

    // Reset transitions
    this.addTransition('*', 'RESET', 'idle', undefined, (context) => {
      context.retryCount = 0;
      context.error = undefined;
      context.timeoutDuration = undefined;
      context.performanceMetrics = {};
    });

    // Destroy transitions
    this.addTransition('*', 'DESTROY', 'destroyed');
  }

  private addTransition(
    from: RendererState | '*',
    event: RendererEvent,
    to: RendererState,
    condition?: (context: RendererContext) => boolean,
    action?: (context: RendererContext) => void
  ): void {
    this.transitions.push({ from, event, to, condition, action });
  }

  /**
   * Send an event to the state machine
   */
  send(event: RendererEvent, errorMessage?: string): boolean {
    const currentState = this.state;

    // Find applicable transition
    const transition = this.transitions.find(t =>
      (t.from === currentState || t.from === '*') &&
      t.event === event &&
      (!t.condition || t.condition(this.context))
    );

    if (!transition) {
      console.warn(`🚫 [StateMachine] ${this.context.componentId}: No transition from ${currentState} on ${event}`);
      return false;
    }

    // Execute exit action for current state
    const currentStateDefinition = this.stateDefinitions.get(currentState);
    if (currentStateDefinition?.onExit) {
      currentStateDefinition.onExit(this.context);
    }

    // Clear any existing timeout
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    // Set error message if provided
    if (errorMessage) {
      this.context.error = errorMessage;
    }

    // Execute transition action
    if (transition.action) {
      transition.action(this.context);
    }

    // Change state
    const previousState = this.state;
    this.state = transition.to;

    console.log(`🔄 [StateMachine] ${this.context.componentId}: ${previousState} → ${this.state} (${event})`);

    // Execute enter action for new state
    const newStateDefinition = this.stateDefinitions.get(this.state);
    if (newStateDefinition?.onEnter) {
      newStateDefinition.onEnter(this.context);
    }

    // Set timeout for new state if defined
    if (newStateDefinition?.timeout && newStateDefinition?.timeoutEvent) {
      this.timeoutId = setTimeout(() => {
        this.send(newStateDefinition.timeoutEvent!);
      }, newStateDefinition.timeout);
    }

    // Notify listeners
    this.notifyListeners(this.state, this.context);

    return true;
  }

  /**
   * Get current state
   */
  getState(): RendererState {
    return this.state;
  }

  /**
   * Get current context
   */
  getContext(): RendererContext {
    return { ...this.context };
  }

  /**
   * Check if state machine can accept retry
   */
  canRetry(): boolean {
    return this.context.retryCount < this.context.maxRetries &&
           (this.state === 'error' || this.state === 'timeout');
  }

  /**
   * Check if state machine is in terminal state
   */
  isTerminal(): boolean {
    return this.state === 'ready' || this.state === 'destroyed';
  }

  /**
   * Check if state machine is in error state
   */
  isError(): boolean {
    return this.state === 'error' || this.state === 'timeout';
  }

  /**
   * Get performance summary
   */
  getPerformanceMetrics(): RendererContext['performanceMetrics'] {
    return { ...this.context.performanceMetrics };
  }

  /**
   * Subscribe to state changes
   */
  onStateChange(callback: (state: RendererState, context: RendererContext) => void): () => void {
    const id = Math.random().toString(36);
    if (!this.listeners.has(id)) {
      this.listeners.set(id, []);
    }
    this.listeners.get(id)!.push(callback);

    return () => {
      this.listeners.delete(id);
    };
  }

  private notifyListeners(state: RendererState, context: RendererContext): void {
    this.listeners.forEach(callbacks => {
      callbacks.forEach(callback => {
        try {
          callback(state, context);
        } catch (error) {
          console.error('Error in state change listener:', error);
        }
      });
    });
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.listeners.clear();
    this.send('DESTROY');
  }
}

export { RendererStateMachine };