/**
 * Artifact Memory Manager Service (T047)
 *
 * Provides memory usage optimization for artifact storage with
 * intelligent caching, cleanup strategies, and memory monitoring.
 */

import type { ParsedArtifact } from '$lib/utils/artifacts/xml-artifact-parser';
import type { DetectedArtifact } from '$lib/artifacts/detectArtifacts';

export interface MemoryStats {
  totalStoredArtifacts: number;
  memoryUsageBytes: number;
  cacheHitRate: number;
  lastCleanupTime: number;
  averageArtifactSize: number;
}

export interface StorageConfig {
  maxMemoryUsage: number; // Maximum memory usage in bytes
  maxArtifacts: number; // Maximum number of artifacts to store
  cleanupThreshold: number; // Memory usage percentage to trigger cleanup
  maxAge: number; // Maximum age of artifacts in milliseconds
  compressionEnabled: boolean; // Enable content compression
  priorityFactors: {
    recency: number; // Weight for recently accessed artifacts
    frequency: number; // Weight for frequently accessed artifacts
    size: number; // Weight for smaller artifacts (negative preference for large ones)
  };
}

export interface StoredArtifact {
  id: string;
  artifact: ParsedArtifact | DetectedArtifact;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
  compressedSize?: number;
  originalSize: number;
  priority: number;
}

const DEFAULT_CONFIG: StorageConfig = {
  maxMemoryUsage: 50 * 1024 * 1024, // 50MB
  maxArtifacts: 1000,
  cleanupThreshold: 0.8, // Cleanup when 80% full
  maxAge: 30 * 60 * 1000, // 30 minutes
  compressionEnabled: true,
  priorityFactors: {
    recency: 0.4,
    frequency: 0.3,
    size: 0.3
  }
};

class ArtifactMemoryManager {
  private storage = new Map<string, StoredArtifact>();
  private config: StorageConfig;
  private currentMemoryUsage = 0;
  private totalAccesses = 0;
  private cacheHits = 0;
  private lastCleanupTime = Date.now();

  constructor(config: Partial<StorageConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Set up periodic cleanup
    if (typeof window !== 'undefined') {
      setInterval(() => this.performPeriodicCleanup(), 5 * 60 * 1000); // Every 5 minutes
    }
  }

  /**
   * Store an artifact with memory optimization
   */
  store(id: string, artifact: ParsedArtifact | DetectedArtifact): boolean {
    try {
      const now = Date.now();
      const originalSize = this.calculateArtifactSize(artifact);

      // Check if we need cleanup before storing
      if (this.shouldTriggerCleanup(originalSize)) {
        this.performCleanup();
      }

      // Check if we still can't fit after cleanup
      if (this.currentMemoryUsage + originalSize > this.config.maxMemoryUsage) {
        console.warn('🧠 [MemoryManager] Cannot store artifact, insufficient memory after cleanup');
        return false;
      }

      // Remove existing artifact if updating
      if (this.storage.has(id)) {
        this.remove(id);
      }

      const storedArtifact: StoredArtifact = {
        id,
        artifact: this.config.compressionEnabled ? this.compressArtifact(artifact) : artifact,
        timestamp: now,
        accessCount: 1,
        lastAccessed: now,
        originalSize,
        compressedSize: this.config.compressionEnabled ? this.calculateArtifactSize(artifact) : undefined,
        priority: this.calculatePriority({ accessCount: 1, lastAccessed: now, originalSize })
      };

      this.storage.set(id, storedArtifact);
      this.currentMemoryUsage += storedArtifact.compressedSize || originalSize;

      console.log(`🧠 [MemoryManager] Stored artifact ${id}, memory usage: ${this.formatBytes(this.currentMemoryUsage)}`);
      return true;

    } catch (error) {
      console.error('🧠 [MemoryManager] Error storing artifact:', error);
      return false;
    }
  }

  /**
   * Retrieve an artifact from storage
   */
  retrieve(id: string): (ParsedArtifact | DetectedArtifact) | null {
    this.totalAccesses++;

    const stored = this.storage.get(id);
    if (!stored) {
      return null;
    }

    // Update access statistics
    this.cacheHits++;
    stored.accessCount++;
    stored.lastAccessed = Date.now();
    stored.priority = this.calculatePriority(stored);

    // Decompress if needed
    const artifact = this.config.compressionEnabled
      ? this.decompressArtifact(stored.artifact)
      : stored.artifact;

    console.log(`🧠 [MemoryManager] Retrieved artifact ${id} (${stored.accessCount} accesses)`);
    return artifact;
  }

  /**
   * Remove an artifact from storage
   */
  remove(id: string): boolean {
    const stored = this.storage.get(id);
    if (!stored) {
      return false;
    }

    this.currentMemoryUsage -= stored.compressedSize || stored.originalSize;
    this.storage.delete(id);

    console.log(`🧠 [MemoryManager] Removed artifact ${id}, memory usage: ${this.formatBytes(this.currentMemoryUsage)}`);
    return true;
  }

  /**
   * Clear all stored artifacts
   */
  clear(): void {
    this.storage.clear();
    this.currentMemoryUsage = 0;
    this.totalAccesses = 0;
    this.cacheHits = 0;
    console.log('🧠 [MemoryManager] Cleared all artifacts');
  }

  /**
   * Get memory usage statistics
   */
  getStats(): MemoryStats {
    const totalSize = Array.from(this.storage.values())
      .reduce((sum, artifact) => sum + artifact.originalSize, 0);

    return {
      totalStoredArtifacts: this.storage.size,
      memoryUsageBytes: this.currentMemoryUsage,
      cacheHitRate: this.totalAccesses > 0 ? this.cacheHits / this.totalAccesses : 0,
      lastCleanupTime: this.lastCleanupTime,
      averageArtifactSize: this.storage.size > 0 ? totalSize / this.storage.size : 0
    };
  }

  /**
   * Check if cleanup should be triggered
   */
  private shouldTriggerCleanup(additionalSize: number = 0): boolean {
    const projectedUsage = (this.currentMemoryUsage + additionalSize) / this.config.maxMemoryUsage;
    return projectedUsage >= this.config.cleanupThreshold ||
           this.storage.size >= this.config.maxArtifacts;
  }

  /**
   * Perform memory cleanup based on priority and age
   */
  private performCleanup(): void {
    const startTime = Date.now();
    const initialCount = this.storage.size;
    const initialMemory = this.currentMemoryUsage;

    console.log('🧹 [MemoryManager] Starting cleanup...', {
      artifacts: initialCount,
      memory: this.formatBytes(initialMemory)
    });

    // Get all artifacts sorted by priority (lowest first for removal)
    const artifactList = Array.from(this.storage.values())
      .sort((a, b) => a.priority - b.priority);

    const targetMemory = this.config.maxMemoryUsage * (this.config.cleanupThreshold - 0.1); // Clean to 10% below threshold
    const targetCount = Math.floor(this.config.maxArtifacts * 0.8); // Keep 80% of max artifacts

    // Remove old artifacts first
    const now = Date.now();
    for (const artifact of artifactList) {
      if (now - artifact.timestamp > this.config.maxAge) {
        this.remove(artifact.id);
      }
    }

    // Remove low-priority artifacts if still needed
    const remainingArtifacts = Array.from(this.storage.values())
      .sort((a, b) => a.priority - b.priority);

    for (const artifact of remainingArtifacts) {
      if (this.currentMemoryUsage <= targetMemory && this.storage.size <= targetCount) {
        break;
      }
      this.remove(artifact.id);
    }

    this.lastCleanupTime = Date.now();
    const cleanupTime = this.lastCleanupTime - startTime;

    console.log('🧹 [MemoryManager] Cleanup completed', {
      duration: `${cleanupTime}ms`,
      removed: initialCount - this.storage.size,
      memorySaved: this.formatBytes(initialMemory - this.currentMemoryUsage),
      remaining: this.storage.size
    });
  }

  /**
   * Periodic cleanup for maintenance
   */
  private performPeriodicCleanup(): void {
    if (this.shouldTriggerCleanup()) {
      this.performCleanup();
    }

    // Update priorities for all artifacts
    const now = Date.now();
    for (const [id, artifact] of this.storage.entries()) {
      artifact.priority = this.calculatePriority(artifact);
    }
  }

  /**
   * Calculate priority score for an artifact (higher = more important)
   */
  private calculatePriority(artifact: { accessCount: number; lastAccessed: number; originalSize: number }): number {
    const now = Date.now();
    const age = now - artifact.lastAccessed;
    const maxAge = this.config.maxAge;

    // Recency factor (0-1, higher for recently accessed)
    const recencyFactor = Math.max(0, 1 - (age / maxAge));

    // Frequency factor (normalized access count)
    const maxAccess = Math.max(...Array.from(this.storage.values()).map(a => a.accessCount));
    const frequencyFactor = maxAccess > 0 ? artifact.accessCount / maxAccess : 0;

    // Size factor (0-1, higher for smaller artifacts)
    const maxSize = Math.max(...Array.from(this.storage.values()).map(a => a.originalSize));
    const sizeFactor = maxSize > 0 ? 1 - (artifact.originalSize / maxSize) : 0;

    // Weighted priority score
    return (
      recencyFactor * this.config.priorityFactors.recency +
      frequencyFactor * this.config.priorityFactors.frequency +
      sizeFactor * this.config.priorityFactors.size
    );
  }

  /**
   * Calculate the memory size of an artifact
   */
  private calculateArtifactSize(artifact: ParsedArtifact | DetectedArtifact): number {
    try {
      // Simple JSON serialization size calculation
      const jsonString = JSON.stringify(artifact);
      return new Blob([jsonString]).size;
    } catch (error) {
      // Fallback: estimate based on content length
      console.warn('🧠 [MemoryManager] Error calculating artifact size, using fallback');

      if ('files' in artifact) {
        return artifact.files.reduce((sum, file) => sum + file.content.length, 0) + 1000; // Base overhead
      } else if ('entryCode' in artifact) {
        return artifact.entryCode.length + (artifact.css?.length || 0) + 1000; // Base overhead
      } else {
        return 1000; // Minimum size estimate
      }
    }
  }

  /**
   * Compress an artifact (basic implementation)
   */
  private compressArtifact(artifact: ParsedArtifact | DetectedArtifact): ParsedArtifact | DetectedArtifact {
    // In a real implementation, you would use actual compression libraries
    // For now, we'll implement basic content optimization
    if ('files' in artifact) {
      return {
        ...artifact,
        files: artifact.files.map(file => ({
          ...file,
          content: this.compressContent(file.content)
        }))
      };
    } else if ('entryCode' in artifact) {
      return {
        ...artifact,
        entryCode: this.compressContent(artifact.entryCode),
        css: artifact.css ? this.compressContent(artifact.css) : artifact.css
      };
    }
    return artifact;
  }

  /**
   * Decompress an artifact
   */
  private decompressArtifact(artifact: ParsedArtifact | DetectedArtifact): ParsedArtifact | DetectedArtifact {
    // This would reverse the compression process
    if ('files' in artifact) {
      return {
        ...artifact,
        files: artifact.files.map(file => ({
          ...file,
          content: this.decompressContent(file.content)
        }))
      };
    } else if ('entryCode' in artifact) {
      return {
        ...artifact,
        entryCode: this.decompressContent(artifact.entryCode),
        css: artifact.css ? this.decompressContent(artifact.css) : artifact.css
      };
    }
    return artifact;
  }

  /**
   * Basic content compression (whitespace removal for code)
   */
  private compressContent(content: string): string {
    // Remove extra whitespace while preserving code structure
    return content
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
      .replace(/\/\/.*$/gm, '') // Remove line comments
      .replace(/^\s+/gm, '') // Remove leading whitespace
      .replace(/\s*\n\s*/g, '\n') // Normalize line breaks
      .trim();
  }

  /**
   * Decompress content (identity function for basic compression)
   */
  private decompressContent(content: string): string {
    return content; // No actual decompression needed for basic whitespace removal
  }

  /**
   * Format bytes for human-readable display
   */
  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<StorageConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('🧠 [MemoryManager] Configuration updated:', newConfig);
  }

  /**
   * Get current configuration
   */
  getConfig(): StorageConfig {
    return { ...this.config };
  }

  /**
   * Force garbage collection if available
   */
  forceGarbageCollection(): void {
    if (typeof window !== 'undefined' && 'gc' in window) {
      try {
        (window as any).gc();
        console.log('🧠 [MemoryManager] Forced garbage collection');
      } catch (error) {
        console.warn('🧠 [MemoryManager] Garbage collection not available');
      }
    }
  }
}

// Export singleton instance
export const artifactMemoryManager = new ArtifactMemoryManager();

// Auto-cleanup on page visibility change
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // Perform cleanup when page becomes hidden
      const stats = artifactMemoryManager.getStats();
      if (stats.memoryUsageBytes > 10 * 1024 * 1024) { // If using more than 10MB
        console.log('🧠 [MemoryManager] Page hidden, performing cleanup');
        setTimeout(() => {
          artifactMemoryManager.forceGarbageCollection();
        }, 1000);
      }
    }
  });
}