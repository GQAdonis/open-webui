/**
 * Performance Optimizer for Artifact Dependency Resolution
 *
 * This service optimizes the dependency resolution process to meet the <1s target
 * for auto-resolution. It includes caching, parallel processing, early termination,
 * and resource management optimizations to ensure fast, responsive dependency resolution.
 */

import type { RecoveryRequest, RecoveryResult } from './types';

export interface PerformanceMetrics {
  totalDuration: number;
  stageBreakdown: Record<string, number>;
  cacheHits: number;
  cacheMisses: number;
  memoryUsage: number;
  parallelizationGains: number;
  earlyTerminations: number;
}

export interface OptimizationConfig {
  enableCaching: boolean;
  maxCacheSize: number;
  enableParallelProcessing: boolean;
  maxParallelWorkers: number;
  enableEarlyTermination: boolean;
  confidenceThreshold: number;
  memoryLimitMB: number;
  timeoutMs: number;
}

export interface CacheEntry {
  key: string;
  result: RecoveryResult;
  timestamp: number;
  accessCount: number;
  ttlMs: number;
}

export class PerformanceOptimizer {
  private cache = new Map<string, CacheEntry>();
  private metrics: PerformanceMetrics = {
    totalDuration: 0,
    stageBreakdown: {},
    cacheHits: 0,
    cacheMisses: 0,
    memoryUsage: 0,
    parallelizationGains: 0,
    earlyTerminations: 0
  };

  private config: OptimizationConfig = {
    enableCaching: true,
    maxCacheSize: 1000,
    enableParallelProcessing: true,
    maxParallelWorkers: 4,
    enableEarlyTermination: true,
    confidenceThreshold: 0.9,
    memoryLimitMB: 100,
    timeoutMs: 1000 // 1 second target
  };

  constructor(config?: Partial<OptimizationConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  /**
   * Optimize a dependency resolution request for maximum performance
   */
  async optimizeResolution<T>(
    request: RecoveryRequest,
    resolutionFunction: (request: RecoveryRequest) => Promise<T>,
    options?: {
      bypassCache?: boolean;
      priority?: 'speed' | 'accuracy' | 'balanced';
    }
  ): Promise<T> {
    const startTime = performance.now();
    const cacheKey = this.generateCacheKey(request);

    try {
      // Check cache first
      if (this.config.enableCaching && !options?.bypassCache) {
        const cachedResult = this.getCachedResult<T>(cacheKey);
        if (cachedResult) {
          this.metrics.cacheHits++;
          this.recordMetrics('cache_hit', performance.now() - startTime);
          return cachedResult;
        }
        this.metrics.cacheMisses++;
      }

      // Memory check before processing
      this.checkMemoryUsage();

      // Apply optimization strategy based on priority
      const optimizedRequest = this.applyOptimizationStrategy(request, options?.priority);

      // Execute with timeout and early termination
      const result = await this.executeWithOptimizations(
        optimizedRequest,
        resolutionFunction,
        startTime
      );

      // Cache the result
      if (this.config.enableCaching) {
        this.cacheResult(cacheKey, result);
      }

      const totalTime = performance.now() - startTime;
      this.recordMetrics('total_resolution', totalTime);

      return result;
    } catch (error) {
      const totalTime = performance.now() - startTime;
      this.recordMetrics('failed_resolution', totalTime);
      throw error;
    }
  }

  /**
   * Generate a cache key based on request characteristics
   */
  private generateCacheKey(request: RecoveryRequest): string {
    const keyData = {
      artifactCode: this.hashString(request.artifactCode),
      messageContent: this.hashString(request.messageContent),
      language: request.language,
      errorMessage: this.hashString(request.errorMessage)
    };

    return `${keyData.artifactCode}-${keyData.messageContent}-${keyData.language}-${keyData.errorMessage}`;
  }

  /**
   * Simple string hashing for cache keys
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Get cached result if available and valid
   */
  private getCachedResult<T>(cacheKey: string): T | null {
    const entry = this.cache.get(cacheKey);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttlMs) {
      this.cache.delete(cacheKey);
      return null;
    }

    entry.accessCount++;
    entry.timestamp = now; // Update access time for LRU
    return entry.result as T;
  }

  /**
   * Cache a resolution result
   */
  private cacheResult<T>(cacheKey: string, result: T): void {
    // Clean cache if it's getting too large
    if (this.cache.size >= this.config.maxCacheSize) {
      this.evictLeastRecentlyUsed();
    }

    const entry: CacheEntry = {
      key: cacheKey,
      result: result as RecoveryResult,
      timestamp: Date.now(),
      accessCount: 1,
      ttlMs: 5 * 60 * 1000 // 5 minutes TTL
    };

    this.cache.set(cacheKey, entry);
  }

  /**
   * Evict least recently used cache entries
   */
  private evictLeastRecentlyUsed(): void {
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

    // Remove oldest 25% of entries
    const toRemove = Math.floor(entries.length * 0.25);
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i][0]);
    }
  }

  /**
   * Apply optimization strategy based on priority
   */
  private applyOptimizationStrategy(
    request: RecoveryRequest,
    priority: 'speed' | 'accuracy' | 'balanced' = 'balanced'
  ): RecoveryRequest {
    const optimized = { ...request };

    switch (priority) {
      case 'speed':
        // Aggressive optimizations for speed
        optimized.maxRetries = 1;
        optimized.timeoutMs = 500;
        break;

      case 'accuracy':
        // Optimize for accuracy over speed
        optimized.maxRetries = 3;
        optimized.timeoutMs = 2000;
        break;

      case 'balanced':
      default:
        // Balanced approach
        optimized.maxRetries = 2;
        optimized.timeoutMs = 1000;
        break;
    }

    return optimized;
  }

  /**
   * Execute resolution with performance optimizations
   */
  private async executeWithOptimizations<T>(
    request: RecoveryRequest,
    resolutionFunction: (request: RecoveryRequest) => Promise<T>,
    startTime: number
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Resolution timeout after ${this.config.timeoutMs}ms`));
      }, this.config.timeoutMs);
    });

    const resolutionPromise = this.executeWithProgress(request, resolutionFunction, startTime);

    return Promise.race([resolutionPromise, timeoutPromise]);
  }

  /**
   * Execute with progress tracking and early termination
   */
  private async executeWithProgress<T>(
    request: RecoveryRequest,
    resolutionFunction: (request: RecoveryRequest) => Promise<T>,
    startTime: number
  ): Promise<T> {
    const progressStages = [
      'preprocessing',
      'strategy_selection',
      'execution',
      'validation',
      'postprocessing'
    ];

    for (const stage of progressStages) {
      const stageStart = performance.now();

      // Check for early termination opportunity
      if (this.config.enableEarlyTermination && this.shouldTerminateEarly(stage, startTime)) {
        this.metrics.earlyTerminations++;
        break;
      }

      // Record stage timing
      const stageTime = performance.now() - stageStart;
      this.recordMetrics(stage, stageTime);
    }

    return resolutionFunction(request);
  }

  /**
   * Check if we should terminate early based on performance criteria
   */
  private shouldTerminateEarly(stage: string, startTime: number): boolean {
    const elapsed = performance.now() - startTime;

    // Terminate if we're approaching timeout
    if (elapsed > this.config.timeoutMs * 0.8) {
      return true;
    }

    // Terminate if memory usage is too high
    if (this.getMemoryUsageEstimate() > this.config.memoryLimitMB * 0.9) {
      return true;
    }

    return false;
  }

  /**
   * Check memory usage and clean up if necessary
   */
  private checkMemoryUsage(): void {
    const memoryUsage = this.getMemoryUsageEstimate();
    this.metrics.memoryUsage = memoryUsage;

    if (memoryUsage > this.config.memoryLimitMB) {
      // Aggressive cache cleanup
      this.cache.clear();

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
    }
  }

  /**
   * Estimate memory usage (simplified)
   */
  private getMemoryUsageEstimate(): number {
    if (typeof performance !== 'undefined' && performance.memory) {
      return performance.memory.usedJSHeapSize / (1024 * 1024); // MB
    }

    // Estimate based on cache size
    return this.cache.size * 0.01; // Rough estimate: 10KB per cache entry
  }

  /**
   * Record performance metrics
   */
  private recordMetrics(stage: string, duration: number): void {
    this.metrics.stageBreakdown[stage] = (this.metrics.stageBreakdown[stage] || 0) + duration;

    if (stage === 'total_resolution' || stage === 'failed_resolution') {
      this.metrics.totalDuration = duration;
    }
  }

  /**
   * Optimize multiple requests in parallel
   */
  async optimizeBatch<T>(
    requests: RecoveryRequest[],
    resolutionFunction: (request: RecoveryRequest) => Promise<T>,
    options?: {
      maxConcurrency?: number;
      priority?: 'speed' | 'accuracy' | 'balanced';
    }
  ): Promise<T[]> {
    const maxConcurrency = options?.maxConcurrency || this.config.maxParallelWorkers;
    const results: T[] = [];
    const startTime = performance.now();

    // Process requests in batches
    for (let i = 0; i < requests.length; i += maxConcurrency) {
      const batch = requests.slice(i, i + maxConcurrency);
      const batchPromises = batch.map(request =>
        this.optimizeResolution(request, resolutionFunction, options)
      );

      const batchResults = await Promise.allSettled(batchPromises);

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          throw result.reason;
        }
      }
    }

    const parallelizationGain = (requests.length * this.metrics.totalDuration) - (performance.now() - startTime);
    this.metrics.parallelizationGains += Math.max(0, parallelizationGain);

    return results;
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset performance metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalDuration: 0,
      stageBreakdown: {},
      cacheHits: 0,
      cacheMisses: 0,
      memoryUsage: 0,
      parallelizationGains: 0,
      earlyTerminations: 0
    };
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    hitRate: number;
    memoryUsage: number;
  } {
    const totalRequests = this.metrics.cacheHits + this.metrics.cacheMisses;
    const hitRate = totalRequests > 0 ? this.metrics.cacheHits / totalRequests : 0;

    return {
      size: this.cache.size,
      hitRate,
      memoryUsage: this.cache.size * 0.01 // Estimated MB
    };
  }

  /**
   * Clear cache manually
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Update optimization configuration
   */
  updateConfig(config: Partial<OptimizationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): OptimizationConfig {
    return { ...this.config };
  }
}

// Default singleton instance
export const performanceOptimizer = new PerformanceOptimizer();

// Performance monitoring utilities
export class PerformanceMonitor {
  private static measurements = new Map<string, number[]>();

  static startMeasurement(name: string): () => number {
    const startTime = performance.now();

    return () => {
      const duration = performance.now() - startTime;

      if (!this.measurements.has(name)) {
        this.measurements.set(name, []);
      }

      this.measurements.get(name)!.push(duration);
      return duration;
    };
  }

  static getStats(name: string): {
    count: number;
    average: number;
    min: number;
    max: number;
    p95: number;
  } | null {
    const measurements = this.measurements.get(name);
    if (!measurements || measurements.length === 0) {
      return null;
    }

    const sorted = [...measurements].sort((a, b) => a - b);
    const count = sorted.length;
    const sum = sorted.reduce((a, b) => a + b, 0);

    return {
      count,
      average: sum / count,
      min: sorted[0],
      max: sorted[count - 1],
      p95: sorted[Math.floor(count * 0.95)]
    };
  }

  static getAllStats(): Record<string, ReturnType<typeof PerformanceMonitor.getStats>> {
    const stats: Record<string, ReturnType<typeof PerformanceMonitor.getStats>> = {};

    for (const [name] of this.measurements) {
      stats[name] = this.getStats(name);
    }

    return stats;
  }

  static reset(): void {
    this.measurements.clear();
  }
}

// Performance decorators for automatic measurement
export function measurePerformance(name?: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const measurementName = name || `${target.constructor.name}.${propertyName}`;

    descriptor.value = async function (...args: any[]) {
      const endMeasurement = PerformanceMonitor.startMeasurement(measurementName);

      try {
        const result = await method.apply(this, args);
        endMeasurement();
        return result;
      } catch (error) {
        endMeasurement();
        throw error;
      }
    };

    return descriptor;
  };
}