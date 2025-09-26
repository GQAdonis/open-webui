/**
 * Performance Monitor Service
 *
 * Provides comprehensive performance monitoring and timeout handling
 * for the artifact system and chat interactions.
 */

export interface PerformanceMetrics {
  startTime: number;
  endTime?: number;
  duration?: number;
  memoryUsage?: {
    used: number;
    total: number;
    percentage: number;
  };
  operations: {
    [key: string]: {
      count: number;
      totalTime: number;
      averageTime: number;
      errors: number;
    };
  };
}

export interface TimeoutConfig {
  intentClassification: number;
  promptEnhancement: number;
  artifactDetection: number;
  artifactRendering: number;
  default: number;
}

export interface PerformanceAlert {
  type: 'warning' | 'error' | 'info';
  operation: string;
  message: string;
  timestamp: number;
  metrics?: any;
}

class PerformanceMonitorService {
  private metrics: Map<string, PerformanceMetrics> = new Map();
  private activeTimers: Map<string, number> = new Map();
  private timeoutConfig: TimeoutConfig = {
    intentClassification: 5000,  // 5 seconds
    promptEnhancement: 8000,     // 8 seconds
    artifactDetection: 10000,    // 10 seconds
    artifactRendering: 30000,    // 30 seconds
    default: 15000               // 15 seconds
  };
  private alertCallbacks: ((alert: PerformanceAlert) => void)[] = [];
  private isMonitoring = false;

  /**
   * Start monitoring session
   */
  startMonitoring(sessionId: string): void {
    console.log('🚀 [PerformanceMonitor] Starting monitoring session:', sessionId);

    this.metrics.set(sessionId, {
      startTime: Date.now(),
      operations: {}
    });

    this.isMonitoring = true;
  }

  /**
   * Stop monitoring session and return final metrics
   */
  stopMonitoring(sessionId: string): PerformanceMetrics | null {
    const metrics = this.metrics.get(sessionId);
    if (!metrics) {
      console.warn('🚨 [PerformanceMonitor] No metrics found for session:', sessionId);
      return null;
    }

    metrics.endTime = Date.now();
    metrics.duration = metrics.endTime - metrics.startTime;
    metrics.memoryUsage = this.getMemoryUsage();

    console.log('🏁 [PerformanceMonitor] Session completed:', {
      sessionId: sessionId.substring(0, 8),
      duration: metrics.duration,
      operations: Object.keys(metrics.operations).length,
      memoryUsage: metrics.memoryUsage
    });

    this.metrics.delete(sessionId);
    return metrics;
  }

  /**
   * Start timing an operation
   */
  startOperation(sessionId: string, operationName: string): string {
    const operationId = `${sessionId}-${operationName}-${Date.now()}`;
    this.activeTimers.set(operationId, Date.now());

    console.log('⏱️ [PerformanceMonitor] Starting operation:', operationName);
    return operationId;
  }

  /**
   * End timing an operation
   */
  endOperation(operationId: string, sessionId: string, operationName: string, success: boolean = true): number {
    const startTime = this.activeTimers.get(operationId);
    if (!startTime) {
      console.warn('🚨 [PerformanceMonitor] No start time found for operation:', operationId);
      return 0;
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    this.activeTimers.delete(operationId);
    this.recordOperation(sessionId, operationName, duration, success);

    console.log('✅ [PerformanceMonitor] Operation completed:', {
      operation: operationName,
      duration,
      success
    });

    return duration;
  }

  /**
   * Record operation metrics
   */
  private recordOperation(sessionId: string, operationName: string, duration: number, success: boolean): void {
    const metrics = this.metrics.get(sessionId);
    if (!metrics) return;

    if (!metrics.operations[operationName]) {
      metrics.operations[operationName] = {
        count: 0,
        totalTime: 0,
        averageTime: 0,
        errors: 0
      };
    }

    const operation = metrics.operations[operationName];
    operation.count++;
    operation.totalTime += duration;
    operation.averageTime = operation.totalTime / operation.count;

    if (!success) {
      operation.errors++;
    }

    // Check for performance alerts
    this.checkPerformanceAlerts(operationName, duration, success);
  }

  /**
   * Create timeout promise for operations
   */
  createTimeoutPromise<T>(
    promise: Promise<T>,
    operationType: keyof TimeoutConfig,
    operationName: string = 'operation'
  ): Promise<T> {
    const timeout = this.timeoutConfig[operationType] || this.timeoutConfig.default;

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        this.emitAlert({
          type: 'error',
          operation: operationName,
          message: `Operation timed out after ${timeout}ms`,
          timestamp: Date.now()
        });
        reject(new Error(`${operationName} timed out after ${timeout}ms`));
      }, timeout);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  /**
   * Create timeout for specific operation with custom timeout
   */
  createCustomTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    operationName: string = 'operation'
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        this.emitAlert({
          type: 'error',
          operation: operationName,
          message: `Operation timed out after ${timeoutMs}ms`,
          timestamp: Date.now()
        });
        reject(new Error(`${operationName} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  /**
   * Check for performance alerts
   */
  private checkPerformanceAlerts(operationName: string, duration: number, success: boolean): void {
    const thresholds = {
      intentClassification: 3000,
      promptEnhancement: 5000,
      artifactDetection: 7000,
      artifactRendering: 20000,
      default: 10000
    };

    const threshold = thresholds[operationName as keyof typeof thresholds] || thresholds.default;

    if (duration > threshold) {
      this.emitAlert({
        type: 'warning',
        operation: operationName,
        message: `Operation took ${duration}ms (threshold: ${threshold}ms)`,
        timestamp: Date.now(),
        metrics: { duration, threshold }
      });
    }

    if (!success) {
      this.emitAlert({
        type: 'error',
        operation: operationName,
        message: `Operation failed after ${duration}ms`,
        timestamp: Date.now(),
        metrics: { duration }
      });
    }
  }

  /**
   * Get current memory usage
   */
  private getMemoryUsage(): { used: number; total: number; percentage: number } {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100
      };
    }

    return { used: 0, total: 0, percentage: 0 };
  }

  /**
   * Get performance summary for a session
   */
  getPerformanceSummary(sessionId: string): PerformanceMetrics | null {
    return this.metrics.get(sessionId) || null;
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): string[] {
    return Array.from(this.metrics.keys());
  }

  /**
   * Clean up stale sessions
   */
  cleanupStaleSessions(maxAgeMs: number = 300000): void {
    const now = Date.now();
    const staleSessionIds: string[] = [];

    this.metrics.forEach((metrics, sessionId) => {
      if (now - metrics.startTime > maxAgeMs) {
        staleSessionIds.push(sessionId);
      }
    });

    staleSessionIds.forEach(sessionId => {
      console.log('🧹 [PerformanceMonitor] Cleaning up stale session:', sessionId);
      this.metrics.delete(sessionId);
    });

    // Clean up stale timers
    const staleOperationIds: string[] = [];
    this.activeTimers.forEach((startTime, operationId) => {
      if (now - startTime > maxAgeMs) {
        staleOperationIds.push(operationId);
      }
    });

    staleOperationIds.forEach(operationId => {
      this.activeTimers.delete(operationId);
    });
  }

  /**
   * Subscribe to performance alerts
   */
  onAlert(callback: (alert: PerformanceAlert) => void): () => void {
    this.alertCallbacks.push(callback);

    return () => {
      const index = this.alertCallbacks.indexOf(callback);
      if (index > -1) {
        this.alertCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Emit performance alert
   */
  private emitAlert(alert: PerformanceAlert): void {
    console.log('🚨 [PerformanceMonitor] Alert:', alert);
    this.alertCallbacks.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        console.error('Error in performance alert callback:', error);
      }
    });
  }

  /**
   * Update timeout configuration
   */
  updateTimeoutConfig(config: Partial<TimeoutConfig>): void {
    this.timeoutConfig = { ...this.timeoutConfig, ...config };
    console.log('⚙️ [PerformanceMonitor] Timeout config updated:', this.timeoutConfig);
  }

  /**
   * Get current timeout configuration
   */
  getTimeoutConfig(): TimeoutConfig {
    return { ...this.timeoutConfig };
  }

  /**
   * Create performance wrapper for functions
   */
  wrapWithPerformanceMonitoring<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    operationName: string,
    sessionId: string,
    timeoutType?: keyof TimeoutConfig
  ): T {
    return (async (...args: any[]) => {
      const operationId = this.startOperation(sessionId, operationName);

      try {
        const promise = fn(...args);
        const result = timeoutType
          ? await this.createTimeoutPromise(promise, timeoutType, operationName)
          : await promise;

        this.endOperation(operationId, sessionId, operationName, true);
        return result;
      } catch (error) {
        this.endOperation(operationId, sessionId, operationName, false);
        throw error;
      }
    }) as T;
  }

  /**
   * Get performance statistics
   */
  getGlobalStats(): {
    activeSessions: number;
    activeOperations: number;
    totalMetrics: number;
    memoryUsage: { used: number; total: number; percentage: number };
  } {
    return {
      activeSessions: this.metrics.size,
      activeOperations: this.activeTimers.size,
      totalMetrics: Array.from(this.metrics.values()).reduce((sum, metrics) =>
        sum + Object.keys(metrics.operations).length, 0),
      memoryUsage: this.getMemoryUsage()
    };
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitorService();

// Cleanup stale sessions every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    performanceMonitor.cleanupStaleSessions();
  }, 300000);
}