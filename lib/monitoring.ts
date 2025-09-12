// Comprehensive monitoring and metrics collection

import { logger } from './logger';

interface MetricData {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
  unit?: string;
}

interface AlertRule {
  name: string;
  condition: (value: number) => boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  cooldown: number; // minutes
  lastTriggered?: number;
}

class MetricsCollector {
  private metrics: Map<string, MetricData[]> = new Map();
  private alertRules: AlertRule[] = [];
  private maxMetricsPerKey = 1000; // Prevent memory leaks
  
  constructor() {
    this.setupDefaultAlerts();
    this.startCleanupInterval();
  }
  
  // Record a metric
  record(name: string, value: number, tags?: Record<string, string>, unit?: string): void {
    const metric: MetricData = {
      name,
      value,
      timestamp: Date.now(),
      tags,
      unit,
    };
    
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    const metricArray = this.metrics.get(name)!;
    metricArray.push(metric);
    
    // Keep only the most recent metrics
    if (metricArray.length > this.maxMetricsPerKey) {
      metricArray.shift();
    }
    
    // Check alert rules
    this.checkAlerts(name, value);
  }
  
  // Increment a counter
  increment(name: string, tags?: Record<string, string>): void {
    const current = this.getLatestValue(name) || 0;
    this.record(name, current + 1, tags, 'count');
  }
  
  // Record a timing metric
  timing(name: string, duration: number, tags?: Record<string, string>): void {
    this.record(name, duration, tags, 'ms');
  }
  
  // Record a gauge (current value)
  gauge(name: string, value: number, tags?: Record<string, string>): void {
    this.record(name, value, tags, 'gauge');
  }
  
  // Get latest value for a metric
  getLatestValue(name: string): number | null {
    const metrics = this.metrics.get(name);
    if (!metrics || metrics.length === 0) return null;
    return metrics[metrics.length - 1].value;
  }
  
  // Get metrics for a time range
  getMetrics(name: string, fromTime?: number, toTime?: number): MetricData[] {
    const metrics = this.metrics.get(name) || [];
    
    if (!fromTime && !toTime) return metrics;
    
    return metrics.filter(metric => {
      if (fromTime && metric.timestamp < fromTime) return false;
      if (toTime && metric.timestamp > toTime) return false;
      return true;
    });
  }
  
  // Calculate average for a metric over time period
  getAverage(name: string, minutes: number = 5): number | null {
    const fromTime = Date.now() - (minutes * 60 * 1000);
    const metrics = this.getMetrics(name, fromTime);
    
    if (metrics.length === 0) return null;
    
    const sum = metrics.reduce((acc, metric) => acc + metric.value, 0);
    return sum / metrics.length;
  }
  
  // Get percentile for a metric
  getPercentile(name: string, percentile: number, minutes: number = 5): number | null {
    const fromTime = Date.now() - (minutes * 60 * 1000);
    const metrics = this.getMetrics(name, fromTime);
    
    if (metrics.length === 0) return null;
    
    const values = metrics.map(m => m.value).sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * values.length) - 1;
    return values[Math.max(0, index)];
  }
  
  // Add custom alert rule
  addAlertRule(rule: AlertRule): void {
    this.alertRules.push(rule);
  }
  
  // Setup default alert rules
  private setupDefaultAlerts(): void {
    this.alertRules = [
      {
        name: 'high_response_time',
        condition: (value) => value > 5000, // 5 seconds
        severity: 'high',
        message: 'API response time is too high',
        cooldown: 5,
      },
      {
        name: 'high_error_rate',
        condition: (value) => value > 10, // 10% error rate
        severity: 'critical',
        message: 'Error rate is critically high',
        cooldown: 2,
      },
      {
        name: 'high_memory_usage',
        condition: (value) => value > 85, // 85% memory usage
        severity: 'medium',
        message: 'Memory usage is high',
        cooldown: 10,
      },
      {
        name: 'database_slow_query',
        condition: (value) => value > 2000, // 2 seconds
        severity: 'medium',
        message: 'Database query is slow',
        cooldown: 5,
      },
    ];
  }
  
  // Check alert rules
  private checkAlerts(metricName: string, value: number): void {
    const now = Date.now();
    
    for (const rule of this.alertRules) {
      // Skip if in cooldown period
      if (rule.lastTriggered && (now - rule.lastTriggered) < (rule.cooldown * 60 * 1000)) {
        continue;
      }
      
      if (rule.condition(value)) {
        this.triggerAlert(rule, metricName, value);
        rule.lastTriggered = now;
      }
    }
  }
  
  // Trigger an alert
  private triggerAlert(rule: AlertRule, metricName: string, value: number): void {
    const alertData = {
      rule: rule.name,
      metric: metricName,
      value,
      severity: rule.severity,
      message: rule.message,
      timestamp: new Date().toISOString(),
    };
    
    // Log the alert
    logger.warn('Alert triggered', alertData);
    
    // In production, you would send this to your alerting system
    // Examples: PagerDuty, Slack, email, etc.
    this.sendAlert(alertData);
  }
  
  // Send alert to external systems (implement based on your needs)
  private async sendAlert(alertData: any): Promise<void> {
    // Example implementations:
    
    // Slack webhook
    if (process.env.SLACK_WEBHOOK_URL) {
      try {
        await fetch(process.env.SLACK_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `🚨 Alert: ${alertData.message}`,
            attachments: [{
              color: this.getSeverityColor(alertData.severity),
              fields: [
                { title: 'Metric', value: alertData.metric, short: true },
                { title: 'Value', value: alertData.value.toString(), short: true },
                { title: 'Severity', value: alertData.severity, short: true },
                { title: 'Time', value: alertData.timestamp, short: true },
              ],
            }],
          }),
        });
      } catch (error) {
        logger.error('Failed to send Slack alert', error instanceof Error ? error : new Error(String(error)));
      }
    }
    
    // Email alert (using a service like SendGrid, SES, etc.)
    if (process.env.ALERT_EMAIL && process.env.SENDGRID_API_KEY) {
      // Implementation would go here
    }
    
    // PagerDuty integration
    if (process.env.PAGERDUTY_INTEGRATION_KEY && alertData.severity === 'critical') {
      // Implementation would go here
    }
  }
  
  private getSeverityColor(severity: string): string {
    switch (severity) {
      case 'critical': return 'danger';
      case 'high': return 'warning';
      case 'medium': return '#ff9500';
      case 'low': return 'good';
      default: return '#808080';
    }
  }
  
  // Clean up old metrics periodically
  private startCleanupInterval(): void {
    setInterval(() => {
      const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
      
      for (const [name, metrics] of this.metrics.entries()) {
        const filteredMetrics = metrics.filter(metric => metric.timestamp > cutoffTime);
        this.metrics.set(name, filteredMetrics);
      }
    }, 60 * 60 * 1000); // Run every hour
  }
  
  // Get all metrics summary
  getSummary(): Record<string, any> {
    const summary: Record<string, any> = {};
    
    for (const [name, metrics] of this.metrics.entries()) {
      if (metrics.length === 0) continue;
      
      const latest = metrics[metrics.length - 1];
      const avg5min = this.getAverage(name, 5);
      const p95 = this.getPercentile(name, 95, 5);
      
      summary[name] = {
        latest: latest.value,
        average_5min: avg5min,
        p95_5min: p95,
        count: metrics.length,
        unit: latest.unit,
      };
    }
    
    return summary;
  }
}

// Performance monitoring decorator
export function monitor(metricName: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const start = Date.now();
      
      try {
        const result = await method.apply(this, args);
        const duration = Date.now() - start;
        
        metrics.timing(`${metricName}.duration`, duration);
        metrics.increment(`${metricName}.success`);
        
        return result;
      } catch (error) {
        const duration = Date.now() - start;
        
        metrics.timing(`${metricName}.duration`, duration);
        metrics.increment(`${metricName}.error`);
        
        throw error;
      }
    };
    
    return descriptor;
  };
}

// API monitoring middleware
export function createApiMonitoringMiddleware() {
  return (req: any, res: any, next: any) => {
    const start = Date.now();
    const route = req.route?.path || req.path || 'unknown';
    const method = req.method;
    
    // Track request
    metrics.increment('api.requests.total', {
      method,
      route,
    });
    
    // Override res.end to capture response metrics
    const originalEnd = res.end;
    res.end = function (...args: any[]) {
      const duration = Date.now() - start;
      const statusCode = res.statusCode;
      
      // Record metrics
      metrics.timing('api.response_time', duration, {
        method,
        route,
        status_code: statusCode.toString(),
      });
      
      metrics.increment('api.responses.total', {
        method,
        route,
        status_code: statusCode.toString(),
      });
      
      // Track error rates
      if (statusCode >= 400) {
        metrics.increment('api.errors.total', {
          method,
          route,
          status_code: statusCode.toString(),
        });
      }
      
      originalEnd.apply(this, args);
    };
    
    next();
  };
}

// System metrics collection
export function collectSystemMetrics(): void {
  // Memory usage
  const memUsage = process.memoryUsage();
  metrics.gauge('system.memory.heap_used', memUsage.heapUsed / 1024 / 1024); // MB
  metrics.gauge('system.memory.heap_total', memUsage.heapTotal / 1024 / 1024); // MB
  metrics.gauge('system.memory.rss', memUsage.rss / 1024 / 1024); // MB
  
  // CPU usage (simplified)
  const cpuUsage = process.cpuUsage();
  metrics.gauge('system.cpu.user', cpuUsage.user / 1000); // ms
  metrics.gauge('system.cpu.system', cpuUsage.system / 1000); // ms
  
  // Event loop lag
  const start = process.hrtime.bigint();
  setImmediate(() => {
    const lag = Number(process.hrtime.bigint() - start) / 1000000; // Convert to ms
    metrics.gauge('system.event_loop_lag', lag);
  });
}

// Start system metrics collection
export function startSystemMetricsCollection(intervalMs: number = 30000): void {
  collectSystemMetrics();
  setInterval(collectSystemMetrics, intervalMs);
}

// Global metrics instance
export const metrics = new MetricsCollector();

// Export types
export type { MetricData, AlertRule };
export { MetricsCollector };

// Health check integration
export function getHealthMetrics() {
  return {
    response_time_avg: metrics.getAverage('api.response_time', 5),
    response_time_p95: metrics.getPercentile('api.response_time', 95, 5),
    error_rate: calculateErrorRate(),
    memory_usage: metrics.getLatestValue('system.memory.heap_used'),
    event_loop_lag: metrics.getLatestValue('system.event_loop_lag'),
  };
}

function calculateErrorRate(): number {
  const totalRequests = metrics.getLatestValue('api.requests.total') || 0;
  const totalErrors = metrics.getLatestValue('api.errors.total') || 0;
  
  if (totalRequests === 0) return 0;
  return (totalErrors / totalRequests) * 100;
}