/**
 * Memory Manager for Large Artifact Processing
 *
 * This service manages memory usage during large artifact processing to prevent
 * browser crashes, maintain responsiveness, and optimize resource utilization.
 * It includes streaming processing, chunked operations, and memory monitoring.
 */

export interface MemoryConfig {
  maxMemoryMB: number;
  chunkSizeMB: number;
  gcThresholdMB: number;
  maxConcurrentChunks: number;
  enableStreaming: boolean;
  monitoringIntervalMs: number;
}

export interface MemoryMetrics {
  currentUsageMB: number;
  peakUsageMB: number;
  availableMemoryMB: number;
  chunksProcessed: number;
  gcTriggers: number;
  streamingOperations: number;
  memoryPressureLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface ProcessingChunk {
  id: string;
  data: string;
  size: number;
  processed: boolean;
  result?: any;
}

export class MemoryManager {
  private config: MemoryConfig = {
    maxMemoryMB: 200, // 200MB limit for artifact processing
    chunkSizeMB: 10,  // 10MB chunks
    gcThresholdMB: 150, // Trigger GC at 150MB
    maxConcurrentChunks: 3,
    enableStreaming: true,
    monitoringIntervalMs: 1000
  };

  private metrics: MemoryMetrics = {
    currentUsageMB: 0,
    peakUsageMB: 0,
    availableMemoryMB: 0,
    chunksProcessed: 0,
    gcTriggers: 0,
    streamingOperations: 0,
    memoryPressureLevel: 'low'
  };

  private activeChunks = new Map<string, ProcessingChunk>();
  private monitoringInterval?: NodeJS.Timeout;
  private observers: Array<(metrics: MemoryMetrics) => void> = [];

  constructor(config?: Partial<MemoryConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    this.startMonitoring();
  }

  /**
   * Process large content with memory management
   */
  async processLargeContent<T>(
    content: string,
    processor: (chunk: string, index: number, isLast: boolean) => Promise<T>,
    options?: {
      chunkSize?: number;
      enableStreaming?: boolean;
      onProgress?: (progress: number) => void;
    }
  ): Promise<T[]> {
    const startTime = performance.now();
    const chunkSize = options?.chunkSize || this.calculateOptimalChunkSize(content.length);

    // Check if we need streaming
    if (this.shouldUseStreaming(content.length) || options?.enableStreaming) {
      return this.processWithStreaming(content, processor, chunkSize, options);
    }

    // Process in chunks
    return this.processInChunks(content, processor, chunkSize, options);
  }

  /**
   * Process content using streaming approach
   */
  private async processWithStreaming<T>(
    content: string,
    processor: (chunk: string, index: number, isLast: boolean) => Promise<T>,
    chunkSize: number,
    options?: {
      onProgress?: (progress: number) => void;
    }
  ): Promise<T[]> {
    this.metrics.streamingOperations++;

    const results: T[] = [];
    const reader = this.createStringReader(content, chunkSize);
    let chunkIndex = 0;

    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;

        // Check memory pressure before processing
        await this.checkMemoryPressure();

        const isLast = chunkIndex === Math.ceil(content.length / chunkSize) - 1;
        const result = await processor(chunk.value, chunkIndex, isLast);
        results.push(result);

        chunkIndex++;
        this.metrics.chunksProcessed++;

        // Report progress
        if (options?.onProgress) {
          const progress = (chunkIndex * chunkSize) / content.length;
          options.onProgress(Math.min(progress, 1));
        }

        // Yield to event loop
        await this.yieldToEventLoop();
      }

      return results;
    } finally {
      reader.release();
    }
  }

  /**
   * Process content in managed chunks
   */
  private async processInChunks<T>(
    content: string,
    processor: (chunk: string, index: number, isLast: boolean) => Promise<T>,
    chunkSize: number,
    options?: {
      onProgress?: (progress: number) => void;
    }
  ): Promise<T[]> {
    const chunks = this.createChunks(content, chunkSize);
    const results: T[] = [];

    // Process chunks with concurrency control
    const semaphore = new Semaphore(this.config.maxConcurrentChunks);

    const processChunk = async (chunk: ProcessingChunk, index: number): Promise<T> => {
      await semaphore.acquire();

      try {
        await this.checkMemoryPressure();

        const isLast = index === chunks.length - 1;
        const result = await processor(chunk.data, index, isLast);

        chunk.processed = true;
        chunk.result = result;
        this.metrics.chunksProcessed++;

        // Progress reporting
        if (options?.onProgress) {
          const completedChunks = chunks.filter(c => c.processed).length;
          options.onProgress(completedChunks / chunks.length);
        }

        return result;
      } finally {
        semaphore.release();
        this.cleanupChunk(chunk.id);
      }
    };

    // Process all chunks
    const promises = chunks.map((chunk, index) => processChunk(chunk, index));
    const chunkResults = await Promise.all(promises);

    return chunkResults;
  }

  /**
   * Create chunks from large content
   */
  private createChunks(content: string, chunkSize: number): ProcessingChunk[] {
    const chunks: ProcessingChunk[] = [];
    const bytesPerChunk = chunkSize * 1024 * 1024; // Convert MB to bytes

    for (let i = 0; i < content.length; i += bytesPerChunk) {
      const chunkData = content.slice(i, i + bytesPerChunk);
      const chunk: ProcessingChunk = {
        id: `chunk_${i}_${Date.now()}`,
        data: chunkData,
        size: chunkData.length,
        processed: false
      };

      chunks.push(chunk);
      this.activeChunks.set(chunk.id, chunk);
    }

    return chunks;
  }

  /**
   * Create a streaming reader for large content
   */
  private createStringReader(content: string, chunkSize: number): {
    read(): Promise<{ done: boolean; value: string }>;
    release(): void;
  } {
    let position = 0;
    const bytesPerChunk = chunkSize * 1024 * 1024;

    return {
      async read() {
        if (position >= content.length) {
          return { done: true, value: '' };
        }

        const chunk = content.slice(position, position + bytesPerChunk);
        position += bytesPerChunk;

        return { done: false, value: chunk };
      },

      release() {
        // Cleanup any resources
        position = 0;
      }
    };
  }

  /**
   * Calculate optimal chunk size based on content size and memory constraints
   */
  private calculateOptimalChunkSize(contentLength: number): number {
    const contentSizeMB = contentLength / (1024 * 1024);
    const availableMemory = this.getAvailableMemory();

    // Use smaller chunks if memory is limited
    if (availableMemory < 50) {
      return Math.max(1, this.config.chunkSizeMB / 4); // 2.5MB chunks
    }

    if (availableMemory < 100) {
      return Math.max(2, this.config.chunkSizeMB / 2); // 5MB chunks
    }

    // For very large content, use smaller chunks to maintain responsiveness
    if (contentSizeMB > 100) {
      return Math.max(5, this.config.chunkSizeMB / 2); // 5MB chunks
    }

    return this.config.chunkSizeMB;
  }

  /**
   * Check if streaming should be used
   */
  private shouldUseStreaming(contentLength: number): boolean {
    if (!this.config.enableStreaming) {
      return false;
    }

    const contentSizeMB = contentLength / (1024 * 1024);
    const availableMemory = this.getAvailableMemory();

    // Use streaming for large content or low memory situations
    return contentSizeMB > 50 || availableMemory < 100;
  }

  /**
   * Check memory pressure and take action if needed
   */
  private async checkMemoryPressure(): Promise<void> {
    const currentUsage = this.getCurrentMemoryUsage();
    this.updateMemoryMetrics(currentUsage);

    switch (this.metrics.memoryPressureLevel) {
      case 'critical':
        // Aggressive cleanup
        await this.performEmergencyCleanup();
        // Wait longer for GC
        await this.sleep(100);
        break;

      case 'high':
        // Trigger GC and cleanup
        this.triggerGarbageCollection();
        this.cleanupInactiveChunks();
        await this.sleep(50);
        break;

      case 'medium':
        // Light cleanup
        this.cleanupInactiveChunks();
        await this.sleep(10);
        break;

      case 'low':
      default:
        // No action needed
        break;
    }
  }

  /**
   * Get current memory usage
   */
  private getCurrentMemoryUsage(): number {
    if (typeof performance !== 'undefined' && performance.memory) {
      return performance.memory.usedJSHeapSize / (1024 * 1024); // Convert to MB
    }

    // Fallback estimation
    const chunkMemory = Array.from(this.activeChunks.values())
      .reduce((total, chunk) => total + chunk.size, 0) / (1024 * 1024);

    return chunkMemory;
  }

  /**
   * Get available memory
   */
  private getAvailableMemory(): number {
    if (typeof performance !== 'undefined' && performance.memory) {
      const totalHeap = performance.memory.totalJSHeapSize / (1024 * 1024);
      const usedHeap = performance.memory.usedJSHeapSize / (1024 * 1024);
      return Math.max(0, this.config.maxMemoryMB - usedHeap);
    }

    return this.config.maxMemoryMB / 2; // Conservative estimate
  }

  /**
   * Update memory metrics and pressure level
   */
  private updateMemoryMetrics(currentUsage: number): void {
    this.metrics.currentUsageMB = currentUsage;
    this.metrics.peakUsageMB = Math.max(this.metrics.peakUsageMB, currentUsage);
    this.metrics.availableMemoryMB = this.getAvailableMemory();

    // Determine pressure level
    const usageRatio = currentUsage / this.config.maxMemoryMB;

    if (usageRatio >= 0.9) {
      this.metrics.memoryPressureLevel = 'critical';
    } else if (usageRatio >= 0.75) {
      this.metrics.memoryPressureLevel = 'high';
    } else if (usageRatio >= 0.5) {
      this.metrics.memoryPressureLevel = 'medium';
    } else {
      this.metrics.memoryPressureLevel = 'low';
    }

    // Notify observers
    this.notifyObservers();
  }

  /**
   * Trigger garbage collection if available
   */
  private triggerGarbageCollection(): void {
    if (global.gc) {
      global.gc();
      this.metrics.gcTriggers++;
    }
  }

  /**
   * Clean up inactive chunks
   */
  private cleanupInactiveChunks(): void {
    const chunksToDelete: string[] = [];

    for (const [id, chunk] of this.activeChunks) {
      if (chunk.processed) {
        chunksToDelete.push(id);
      }
    }

    for (const id of chunksToDelete) {
      this.activeChunks.delete(id);
    }
  }

  /**
   * Perform emergency cleanup
   */
  private async performEmergencyCleanup(): Promise<void> {
    // Clear all processed chunks
    this.cleanupInactiveChunks();

    // Force garbage collection multiple times
    for (let i = 0; i < 3; i++) {
      this.triggerGarbageCollection();
      await this.sleep(50);
    }

    // Clear any additional caches or temporary data
    this.clearTemporaryData();
  }

  /**
   * Clear temporary data
   */
  private clearTemporaryData(): void {
    // Implementation would clear any temporary caches or buffers
    // This is a placeholder for actual cleanup logic
  }

  /**
   * Clean up a specific chunk
   */
  private cleanupChunk(chunkId: string): void {
    const chunk = this.activeChunks.get(chunkId);
    if (chunk && chunk.processed) {
      this.activeChunks.delete(chunkId);
    }
  }

  /**
   * Yield to the event loop to maintain responsiveness
   */
  private async yieldToEventLoop(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 0));
  }

  /**
   * Sleep for specified milliseconds
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Start memory monitoring
   */
  private startMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(() => {
      const currentUsage = this.getCurrentMemoryUsage();
      this.updateMemoryMetrics(currentUsage);
    }, this.config.monitoringIntervalMs);
  }

  /**
   * Stop memory monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
  }

  /**
   * Add memory metrics observer
   */
  addObserver(observer: (metrics: MemoryMetrics) => void): void {
    this.observers.push(observer);
  }

  /**
   * Remove memory metrics observer
   */
  removeObserver(observer: (metrics: MemoryMetrics) => void): void {
    const index = this.observers.indexOf(observer);
    if (index > -1) {
      this.observers.splice(index, 1);
    }
  }

  /**
   * Notify all observers of metrics update
   */
  private notifyObservers(): void {
    for (const observer of this.observers) {
      try {
        observer(this.metrics);
      } catch (error) {
        console.warn('Memory manager observer error:', error);
      }
    }
  }

  /**
   * Get current memory metrics
   */
  getMetrics(): MemoryMetrics {
    return { ...this.metrics };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<MemoryConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): MemoryConfig {
    return { ...this.config };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      currentUsageMB: 0,
      peakUsageMB: 0,
      availableMemoryMB: 0,
      chunksProcessed: 0,
      gcTriggers: 0,
      streamingOperations: 0,
      memoryPressureLevel: 'low'
    };
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.stopMonitoring();
    this.activeChunks.clear();
    this.observers.length = 0;
  }
}

/**
 * Semaphore for controlling concurrency
 */
class Semaphore {
  private permits: number;
  private waiting: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return;
    }

    return new Promise(resolve => {
      this.waiting.push(resolve);
    });
  }

  release(): void {
    this.permits++;

    if (this.waiting.length > 0) {
      const resolve = this.waiting.shift()!;
      this.permits--;
      resolve();
    }
  }
}

// Default singleton instance
export const memoryManager = new MemoryManager();

// Memory utilities
export class MemoryUtils {
  /**
   * Estimate memory usage of a string
   */
  static estimateStringMemory(str: string): number {
    // Each character in JavaScript uses 2 bytes (UTF-16)
    return str.length * 2;
  }

  /**
   * Estimate memory usage of an object
   */
  static estimateObjectMemory(obj: any): number {
    const seen = new WeakSet();

    function calculate(item: any): number {
      if (item === null || typeof item !== 'object') {
        if (typeof item === 'string') {
          return item.length * 2;
        }
        return 8; // Rough estimate for primitives
      }

      if (seen.has(item)) {
        return 0; // Avoid circular references
      }

      seen.add(item);

      let bytes = 0;

      if (Array.isArray(item)) {
        bytes += item.length * 8; // Array overhead
        for (const element of item) {
          bytes += calculate(element);
        }
      } else {
        bytes += Object.keys(item).length * 40; // Object overhead
        for (const [key, value] of Object.entries(item)) {
          bytes += key.length * 2; // Key memory
          bytes += calculate(value); // Value memory
        }
      }

      return bytes;
    }

    return calculate(obj);
  }

  /**
   * Check if memory API is available
   */
  static isMemoryAPIAvailable(): boolean {
    return typeof performance !== 'undefined' &&
           performance.memory !== undefined;
  }

  /**
   * Get memory info if available
   */
  static getMemoryInfo(): {
    used: number;
    total: number;
    limit: number;
  } | null {
    if (!this.isMemoryAPIAvailable()) {
      return null;
    }

    const memory = performance.memory!;
    return {
      used: memory.usedJSHeapSize / (1024 * 1024),
      total: memory.totalJSHeapSize / (1024 * 1024),
      limit: memory.jsHeapSizeLimit / (1024 * 1024)
    };
  }
}