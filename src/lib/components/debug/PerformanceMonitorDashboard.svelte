<!--
Performance Monitor Dashboard Component

Displays real-time performance metrics for artifact processing pipeline.
Only visible in development mode or when explicitly enabled.
-->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { performanceMonitor } from '$lib/services/performance-monitor';
  import type { PerformanceAlert } from '$lib/services/performance-monitor';

  interface Props {
    visible?: boolean;
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  }

  let { visible = $bindable(false), position = 'bottom-right' }: Props = $props();

  let alerts: PerformanceAlert[] = $state([]);
  let globalStats = $state({
    activeSessions: 0,
    activeOperations: 0,
    totalMetrics: 0,
    memoryUsage: { used: 0, total: 0, percentage: 0 }
  });
  let timeoutConfig = $state(performanceMonitor.getTimeoutConfig());

  let alertUnsubscribe: (() => void) | null = null;
  let statsInterval: NodeJS.Timeout | null = null;

  // Show only in development or when explicitly enabled
  let showDashboard = $derived(visible || (typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')));

  onMount(() => {
    if (!showDashboard) return;

    // Subscribe to performance alerts
    alertUnsubscribe = performanceMonitor.onAlert((alert) => {
      alerts = [alert, ...alerts.slice(0, 9)]; // Keep last 10 alerts
    });

    // Update stats every 2 seconds
    statsInterval = setInterval(() => {
      globalStats = performanceMonitor.getGlobalStats();
    }, 2000);

    // Initial stats load
    globalStats = performanceMonitor.getGlobalStats();
  });

  onDestroy(() => {
    if (alertUnsubscribe) {
      alertUnsubscribe();
    }
    if (statsInterval) {
      clearInterval(statsInterval);
    }
  });

  function clearAlerts() {
    alerts = [];
  }

  function updateTimeout(type: string, value: number) {
    const config = { [type]: value };
    performanceMonitor.updateTimeoutConfig(config);
    timeoutConfig = performanceMonitor.getTimeoutConfig();
  }

  function getAlertIcon(type: 'warning' | 'error' | 'info'): string {
    switch (type) {
      case 'error': return '🔴';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '📊';
    }
  }

  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  }
</script>

{#if showDashboard}
  <div class="performance-dashboard {position}" class:visible>
    <!-- Header -->
    <div class="dashboard-header">
      <div class="title">
        <span class="icon">📊</span>
        <span>Performance Monitor</span>
      </div>
      <button
        class="toggle-btn"
        onclick={() => visible = !visible}
        aria-label="Toggle performance dashboard"
      >
        {visible ? '−' : '+'}
      </button>
    </div>

    {#if visible}
      <!-- Global Statistics -->
      <div class="stats-section">
        <h4>System Status</h4>
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-label">Active Sessions</span>
            <span class="stat-value">{globalStats.activeSessions}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Operations</span>
            <span class="stat-value">{globalStats.activeOperations}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Memory</span>
            <span class="stat-value">
              {formatBytes(globalStats.memoryUsage.used)}
              ({globalStats.memoryUsage.percentage.toFixed(1)}%)
            </span>
          </div>
        </div>
      </div>

      <!-- Timeout Configuration -->
      <div class="config-section">
        <h4>Timeout Settings (ms)</h4>
        <div class="config-grid">
          {#each Object.entries(timeoutConfig) as [key, value]}
            <div class="config-item">
              <label class="config-label">{key}</label>
              <input
                type="number"
                bind:value={timeoutConfig[key]}
                onchange={() => updateTimeout(key, timeoutConfig[key])}
                class="config-input"
                min="1000"
                step="1000"
              />
            </div>
          {/each}
        </div>
      </div>

      <!-- Recent Alerts -->
      <div class="alerts-section">
        <div class="alerts-header">
          <h4>Recent Alerts ({alerts.length})</h4>
          {#if alerts.length > 0}
            <button class="clear-btn" onclick={clearAlerts}>Clear</button>
          {/if}
        </div>

        <div class="alerts-list">
          {#if alerts.length === 0}
            <div class="no-alerts">No performance alerts</div>
          {:else}
            {#each alerts as alert}
              <div class="alert-item alert-{alert.type}">
                <div class="alert-icon">{getAlertIcon(alert.type)}</div>
                <div class="alert-content">
                  <div class="alert-operation">{alert.operation}</div>
                  <div class="alert-message">{alert.message}</div>
                  <div class="alert-time">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            {/each}
          {/if}
        </div>
      </div>

      <!-- Performance Tips -->
      <div class="tips-section">
        <h4>Performance Tips</h4>
        <ul class="tips-list">
          <li>Operations over 10s may indicate performance issues</li>
          <li>High memory usage (>80%) can cause slowdowns</li>
          <li>Frequent timeouts suggest infrastructure problems</li>
          <li>Monitor artifact detection for processing delays</li>
        </ul>
      </div>
    {/if}
  </div>
{/if}

<style>
  .performance-dashboard {
    position: fixed;
    z-index: 9999;
    width: 320px;
    max-height: 500px;
    background: rgba(0, 0, 0, 0.9);
    color: white;
    border-radius: 8px;
    border: 1px solid #333;
    font-family: monospace;
    font-size: 12px;
    backdrop-filter: blur(10px);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    overflow: hidden;
  }

  .performance-dashboard.top-left {
    top: 20px;
    left: 20px;
  }

  .performance-dashboard.top-right {
    top: 20px;
    right: 20px;
  }

  .performance-dashboard.bottom-left {
    bottom: 20px;
    left: 20px;
  }

  .performance-dashboard.bottom-right {
    bottom: 20px;
    right: 20px;
  }

  .dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #1a1a1a;
    padding: 8px 12px;
    border-bottom: 1px solid #333;
  }

  .title {
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 600;
  }

  .toggle-btn {
    background: none;
    border: 1px solid #555;
    color: white;
    width: 24px;
    height: 24px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .toggle-btn:hover {
    background: #333;
  }

  .performance-dashboard:not(.visible) {
    height: 40px;
  }

  .performance-dashboard.visible {
    overflow-y: auto;
  }

  .stats-section, .config-section, .alerts-section, .tips-section {
    padding: 12px;
    border-bottom: 1px solid #333;
  }

  .stats-section:last-child, .config-section:last-child,
  .alerts-section:last-child, .tips-section:last-child {
    border-bottom: none;
  }

  h4 {
    margin: 0 0 8px 0;
    color: #ccc;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 6px;
  }

  .stat-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .stat-label {
    color: #999;
  }

  .stat-value {
    color: #4ade80;
    font-weight: 600;
  }

  .config-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 6px;
  }

  .config-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .config-label {
    color: #999;
    font-size: 10px;
  }

  .config-input {
    width: 80px;
    background: #333;
    border: 1px solid #555;
    color: white;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 10px;
  }

  .alerts-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .clear-btn {
    background: #dc2626;
    border: none;
    color: white;
    padding: 2px 8px;
    border-radius: 3px;
    cursor: pointer;
    font-size: 10px;
  }

  .clear-btn:hover {
    background: #b91c1c;
  }

  .alerts-list {
    max-height: 120px;
    overflow-y: auto;
  }

  .no-alerts {
    color: #666;
    font-style: italic;
    text-align: center;
    padding: 16px;
  }

  .alert-item {
    display: flex;
    gap: 8px;
    padding: 6px;
    margin-bottom: 4px;
    border-radius: 4px;
    border-left: 3px solid;
  }

  .alert-item.alert-error {
    background: rgba(220, 38, 38, 0.1);
    border-left-color: #dc2626;
  }

  .alert-item.alert-warning {
    background: rgba(245, 158, 11, 0.1);
    border-left-color: #f59e0b;
  }

  .alert-item.alert-info {
    background: rgba(59, 130, 246, 0.1);
    border-left-color: #3b82f6;
  }

  .alert-icon {
    font-size: 14px;
    line-height: 1;
  }

  .alert-content {
    flex: 1;
    min-width: 0;
  }

  .alert-operation {
    font-weight: 600;
    color: white;
    margin-bottom: 2px;
  }

  .alert-message {
    color: #ccc;
    font-size: 10px;
    margin-bottom: 2px;
    word-wrap: break-word;
  }

  .alert-time {
    color: #666;
    font-size: 9px;
  }

  .tips-list {
    margin: 0;
    padding-left: 16px;
    color: #999;
  }

  .tips-list li {
    font-size: 10px;
    margin-bottom: 4px;
    line-height: 1.3;
  }

  /* Custom scrollbar */
  .alerts-list::-webkit-scrollbar,
  .performance-dashboard::-webkit-scrollbar {
    width: 4px;
  }

  .alerts-list::-webkit-scrollbar-track,
  .performance-dashboard::-webkit-scrollbar-track {
    background: #333;
  }

  .alerts-list::-webkit-scrollbar-thumb,
  .performance-dashboard::-webkit-scrollbar-thumb {
    background: #666;
    border-radius: 2px;
  }

  .alerts-list::-webkit-scrollbar-thumb:hover,
  .performance-dashboard::-webkit-scrollbar-thumb:hover {
    background: #888;
  }
</style>