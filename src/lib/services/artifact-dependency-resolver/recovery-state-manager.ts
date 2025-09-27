/**
 * Recovery State Manager for UI Coordination
 *
 * This service manages the state coordination between different UI components
 * during artifact recovery processes, ensuring consistent state updates
 * and preventing race conditions between recovery attempts.
 */

import { writable, derived, type Writable, type Readable } from 'svelte/store';
import type { RecoveryResult } from './strategy-executor';

export interface RecoverySessionState {
  sessionId: string;
  artifactId: string;
  status: 'idle' | 'analyzing' | 'recovering' | 'completed' | 'failed';
  currentStage: string;
  progress: number;
  result?: RecoveryResult;
  error?: string;
  startTime?: number;
  endTime?: number;
  userInteraction?: 'required' | 'pending' | 'completed';
}

export interface UIComponentState {
  componentId: string;
  artifactId: string;
  isVisible: boolean;
  isProcessing: boolean;
  hasError: boolean;
  lastUpdate: number;
}

export interface RecoveryCoordinationEvent {
  type: 'session_started' | 'session_completed' | 'session_failed' | 'ui_update' | 'user_action';
  sessionId: string;
  artifactId: string;
  timestamp: number;
  data?: any;
}

/**
 * Central state manager for coordinating recovery operations across UI components
 */
export class RecoveryStateManager {
  private sessionStore: Writable<Map<string, RecoverySessionState>> = writable(new Map());
  private componentStore: Writable<Map<string, UIComponentState>> = writable(new Map());
  private eventStore: Writable<RecoveryCoordinationEvent[]> = writable([]);

  private maxEventHistory = 100;
  private sessionTimeout = 300000; // 5 minutes
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanupTimer();
  }

  /**
   * Get observable store for all recovery sessions
   */
  get sessions(): Readable<Map<string, RecoverySessionState>> {
    return { subscribe: this.sessionStore.subscribe };
  }

  /**
   * Get observable store for UI component states
   */
  get components(): Readable<Map<string, UIComponentState>> {
    return { subscribe: this.componentStore.subscribe };
  }

  /**
   * Get observable store for coordination events
   */
  get events(): Readable<RecoveryCoordinationEvent[]> {
    return { subscribe: this.eventStore.subscribe };
  }

  /**
   * Get derived store for sessions by artifact ID
   */
  getSessionsForArtifact(artifactId: string): Readable<RecoverySessionState[]> {
    return derived(this.sessionStore, ($sessions) => {
      return Array.from($sessions.values()).filter(session => session.artifactId === artifactId);
    });
  }

  /**
   * Get derived store for active recovery sessions
   */
  get activeSessions(): Readable<RecoverySessionState[]> {
    return derived(this.sessionStore, ($sessions) => {
      return Array.from($sessions.values()).filter(session =>
        session.status === 'analyzing' || session.status === 'recovering'
      );
    });
  }

  /**
   * Get derived store for components by artifact ID
   */
  getComponentsForArtifact(artifactId: string): Readable<UIComponentState[]> {
    return derived(this.componentStore, ($components) => {
      return Array.from($components.values()).filter(component => component.artifactId === artifactId);
    });
  }

  /**
   * Start a new recovery session
   */
  startRecoverySession(artifactId: string, initialStage: string = 'Initializing'): string {
    const sessionId = `recovery-${artifactId}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const session: RecoverySessionState = {
      sessionId,
      artifactId,
      status: 'analyzing',
      currentStage: initialStage,
      progress: 0,
      startTime: Date.now()
    };

    this.sessionStore.update(sessions => {
      sessions.set(sessionId, session);
      return sessions;
    });

    this.emitEvent({
      type: 'session_started',
      sessionId,
      artifactId,
      timestamp: Date.now(),
      data: { stage: initialStage }
    });

    console.log(`🔄 [Recovery State] Started session ${sessionId} for artifact ${artifactId}`);
    return sessionId;
  }

  /**
   * Update recovery session state
   */
  updateRecoverySession(sessionId: string, updates: Partial<RecoverySessionState>): void {
    this.sessionStore.update(sessions => {
      const session = sessions.get(sessionId);
      if (session) {
        const updatedSession = { ...session, ...updates };
        sessions.set(sessionId, updatedSession);

        console.log(`🔄 [Recovery State] Updated session ${sessionId}:`, updates);
      }
      return sessions;
    });

    this.emitEvent({
      type: 'ui_update',
      sessionId,
      artifactId: this.getSession(sessionId)?.artifactId || '',
      timestamp: Date.now(),
      data: updates
    });
  }

  /**
   * Complete a recovery session
   */
  completeRecoverySession(sessionId: string, result: RecoveryResult): void {
    this.sessionStore.update(sessions => {
      const session = sessions.get(sessionId);
      if (session) {
        const completedSession: RecoverySessionState = {
          ...session,
          status: result.success ? 'completed' : 'failed',
          progress: 100,
          result,
          endTime: Date.now(),
          error: result.success ? undefined : result.errors.join(', ')
        };
        sessions.set(sessionId, completedSession);

        console.log(`✅ [Recovery State] Completed session ${sessionId}: ${result.success ? 'success' : 'failed'}`);
      }
      return sessions;
    });

    const session = this.getSession(sessionId);
    this.emitEvent({
      type: result.success ? 'session_completed' : 'session_failed',
      sessionId,
      artifactId: session?.artifactId || '',
      timestamp: Date.now(),
      data: { result }
    });
  }

  /**
   * Get a specific recovery session
   */
  getSession(sessionId: string): RecoverySessionState | undefined {
    let session: RecoverySessionState | undefined;
    this.sessionStore.subscribe(sessions => {
      session = sessions.get(sessionId);
    })();
    return session;
  }

  /**
   * Register a UI component
   */
  registerComponent(componentId: string, artifactId: string): void {
    const componentState: UIComponentState = {
      componentId,
      artifactId,
      isVisible: true,
      isProcessing: false,
      hasError: false,
      lastUpdate: Date.now()
    };

    this.componentStore.update(components => {
      components.set(componentId, componentState);
      return components;
    });

    console.log(`📱 [Recovery State] Registered component ${componentId} for artifact ${artifactId}`);
  }

  /**
   * Update UI component state
   */
  updateComponent(componentId: string, updates: Partial<UIComponentState>): void {
    this.componentStore.update(components => {
      const component = components.get(componentId);
      if (component) {
        const updatedComponent = {
          ...component,
          ...updates,
          lastUpdate: Date.now()
        };
        components.set(componentId, updatedComponent);

        console.log(`📱 [Recovery State] Updated component ${componentId}:`, updates);
      }
      return components;
    });
  }

  /**
   * Unregister a UI component
   */
  unregisterComponent(componentId: string): void {
    this.componentStore.update(components => {
      components.delete(componentId);
      return components;
    });

    console.log(`📱 [Recovery State] Unregistered component ${componentId}`);
  }

  /**
   * Get UI component state
   */
  getComponent(componentId: string): UIComponentState | undefined {
    let component: UIComponentState | undefined;
    this.componentStore.subscribe(components => {
      component = components.get(componentId);
    })();
    return component;
  }

  /**
   * Check if artifact has active recovery sessions
   */
  hasActiveRecovery(artifactId: string): boolean {
    let hasActive = false;
    this.sessionStore.subscribe(sessions => {
      hasActive = Array.from(sessions.values()).some(session =>
        session.artifactId === artifactId &&
        (session.status === 'analyzing' || session.status === 'recovering')
      );
    })();
    return hasActive;
  }

  /**
   * Cancel all active sessions for an artifact
   */
  cancelArtifactRecovery(artifactId: string): void {
    this.sessionStore.update(sessions => {
      for (const [sessionId, session] of sessions.entries()) {
        if (session.artifactId === artifactId &&
            (session.status === 'analyzing' || session.status === 'recovering')) {
          sessions.set(sessionId, {
            ...session,
            status: 'failed',
            error: 'Cancelled by user',
            endTime: Date.now()
          });
        }
      }
      return sessions;
    });

    console.log(`❌ [Recovery State] Cancelled all recovery sessions for artifact ${artifactId}`);
  }

  /**
   * Get recovery statistics for an artifact
   */
  getArtifactStats(artifactId: string): {
    totalSessions: number;
    activeSessions: number;
    successfulSessions: number;
    failedSessions: number;
    averageProcessingTime: number;
  } {
    const stats = {
      totalSessions: 0,
      activeSessions: 0,
      successfulSessions: 0,
      failedSessions: 0,
      averageProcessingTime: 0
    };

    this.sessionStore.subscribe(sessions => {
      const artifactSessions = Array.from(sessions.values())
        .filter(session => session.artifactId === artifactId);

      stats.totalSessions = artifactSessions.length;
      stats.activeSessions = artifactSessions.filter(s =>
        s.status === 'analyzing' || s.status === 'recovering'
      ).length;
      stats.successfulSessions = artifactSessions.filter(s => s.status === 'completed').length;
      stats.failedSessions = artifactSessions.filter(s => s.status === 'failed').length;

      const completedSessions = artifactSessions.filter(s => s.endTime && s.startTime);
      if (completedSessions.length > 0) {
        const totalTime = completedSessions.reduce((sum, s) =>
          sum + (s.endTime! - s.startTime!), 0
        );
        stats.averageProcessingTime = totalTime / completedSessions.length;
      }
    })();

    return stats;
  }

  /**
   * Emit coordination event
   */
  private emitEvent(event: RecoveryCoordinationEvent): void {
    this.eventStore.update(events => {
      events.push(event);

      // Trim event history if it gets too large
      if (events.length > this.maxEventHistory) {
        events.splice(0, events.length - this.maxEventHistory);
      }

      return events;
    });
  }

  /**
   * Start cleanup timer for old sessions
   */
  private startCleanupTimer(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldSessions();
    }, 60000); // Clean up every minute
  }

  /**
   * Clean up old completed/failed sessions
   */
  private cleanupOldSessions(): void {
    const now = Date.now();
    let cleanedCount = 0;

    this.sessionStore.update(sessions => {
      for (const [sessionId, session] of sessions.entries()) {
        const sessionAge = now - (session.startTime || now);
        const isOld = sessionAge > this.sessionTimeout;
        const isInactive = session.status === 'completed' || session.status === 'failed';

        if (isOld && isInactive) {
          sessions.delete(sessionId);
          cleanedCount++;
        }
      }
      return sessions;
    });

    if (cleanedCount > 0) {
      console.log(`🧹 [Recovery State] Cleaned up ${cleanedCount} old sessions`);
    }
  }

  /**
   * Reset all state (useful for testing or app reset)
   */
  reset(): void {
    this.sessionStore.set(new Map());
    this.componentStore.set(new Map());
    this.eventStore.set([]);
    console.log('🔄 [Recovery State] Reset all state');
  }

  /**
   * Destroy the state manager and clean up resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.reset();
    console.log('💀 [Recovery State] Destroyed state manager');
  }
}

// Export singleton instance
export const recoveryStateManager = new RecoveryStateManager();