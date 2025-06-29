/**
 * Alerting and Monitoring Configuration
 * 
 * Set up alerts for critical events and thresholds
 */

import { log } from './logger';

// Alert types
export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

export enum AlertCategory {
  PERFORMANCE = 'performance',
  SECURITY = 'security',
  AVAILABILITY = 'availability',
  BUSINESS = 'business',
  INFRASTRUCTURE = 'infrastructure',
}

// Alert configuration
interface Alert {
  id: string;
  severity: AlertSeverity;
  category: AlertCategory;
  title: string;
  message: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

// Alert channels
interface AlertChannel {
  send(alert: Alert): Promise<void>;
}

// Slack channel
class SlackChannel implements AlertChannel {
  private webhookUrl: string;
  
  constructor(webhookUrl: string) {
    this.webhookUrl = webhookUrl;
  }
  
  async send(alert: Alert): Promise<void> {
    const color = {
      [AlertSeverity.INFO]: '#36a64f',
      [AlertSeverity.WARNING]: '#ff9800',
      [AlertSeverity.ERROR]: '#f44336',
      [AlertSeverity.CRITICAL]: '#d32f2f',
    }[alert.severity];
    
    const emoji = {
      [AlertSeverity.INFO]: 'ℹ️',
      [AlertSeverity.WARNING]: '⚠️',
      [AlertSeverity.ERROR]: '❌',
      [AlertSeverity.CRITICAL]: '🚨',
    }[alert.severity];
    
    const payload = {
      attachments: [{
        color,
        fallback: `${emoji} ${alert.title}`,
        title: `${emoji} ${alert.title}`,
        text: alert.message,
        fields: alert.metadata ? Object.entries(alert.metadata).map(([key, value]) => ({
          title: key,
          value: String(value),
          short: true,
        })) : [],
        footer: 'Yaumy Monitoring',
        ts: Math.floor(alert.timestamp.getTime() / 1000),
      }],
    };
    
    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        throw new Error(`Slack webhook failed: ${response.status}`);
      }
    } catch (error) {
      log.error({ error }, 'Failed to send Slack alert');
      throw error;
    }
  }
}

// PagerDuty channel
class PagerDutyChannel implements AlertChannel {
  private apiKey: string;
  private serviceId: string;
  
  constructor(apiKey: string, serviceId: string) {
    this.apiKey = apiKey;
    this.serviceId = serviceId;
  }
  
  async send(alert: Alert): Promise<void> {
    // Only send critical alerts to PagerDuty
    if (alert.severity !== AlertSeverity.CRITICAL) {
      return;
    }
    
    const payload = {
      incident: {
        type: 'incident',
        title: alert.title,
        service: {
          id: this.serviceId,
          type: 'service_reference',
        },
        body: {
          type: 'incident_body',
          details: alert.message,
        },
        incident_key: alert.id,
        urgency: 'high',
      },
    };
    
    try {
      const response = await fetch('https://api.pagerduty.com/incidents', {
        method: 'POST',
        headers: {
          'Authorization': `Token token=${this.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.pagerduty+json;version=2',
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        throw new Error(`PagerDuty API failed: ${response.status}`);
      }
    } catch (error) {
      log.error({ error }, 'Failed to send PagerDuty alert');
      throw error;
    }
  }
}

// Email channel (using SendGrid)
class EmailChannel implements AlertChannel {
  private apiKey: string;
  private fromEmail: string;
  private toEmails: string[];
  
  constructor(apiKey: string, fromEmail: string, toEmails: string[]) {
    this.apiKey = apiKey;
    this.fromEmail = fromEmail;
    this.toEmails = toEmails;
  }
  
  async send(alert: Alert): Promise<void> {
    const payload = {
      personalizations: [{
        to: this.toEmails.map(email => ({ email })),
      }],
      from: { email: this.fromEmail },
      subject: `[${alert.severity.toUpperCase()}] ${alert.title}`,
      content: [{
        type: 'text/html',
        value: `
          <h2>${alert.title}</h2>
          <p>${alert.message}</p>
          <hr>
          <h3>Details:</h3>
          <pre>${JSON.stringify(alert.metadata, null, 2)}</pre>
          <hr>
          <p><small>Time: ${alert.timestamp.toISOString()}</small></p>
        `,
      }],
    };
    
    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        throw new Error(`SendGrid API failed: ${response.status}`);
      }
    } catch (error) {
      log.error({ error }, 'Failed to send email alert');
      throw error;
    }
  }
}

// Alert manager
class AlertManager {
  private channels: AlertChannel[] = [];
  private recentAlerts: Map<string, Date> = new Map();
  private deduplicationWindow = 5 * 60 * 1000; // 5 minutes
  
  addChannel(channel: AlertChannel) {
    this.channels.push(channel);
  }
  
  async sendAlert(alert: Alert) {
    // Deduplicate alerts
    const alertKey = `${alert.category}:${alert.title}`;
    const lastSent = this.recentAlerts.get(alertKey);
    
    if (lastSent && Date.now() - lastSent.getTime() < this.deduplicationWindow) {
      log.info({ alert }, 'Alert deduplicated');
      return;
    }
    
    // Log alert
    log.warn({ alert }, 'Sending alert');
    
    // Send to all channels
    const results = await Promise.allSettled(
      this.channels.map(channel => channel.send(alert))
    );
    
    // Track sent alerts
    this.recentAlerts.set(alertKey, alert.timestamp);
    
    // Clean old entries
    for (const [key, time] of this.recentAlerts.entries()) {
      if (Date.now() - time.getTime() > this.deduplicationWindow * 2) {
        this.recentAlerts.delete(key);
      }
    }
    
    // Check for failures
    const failures = results.filter(r => r.status === 'rejected');
    if (failures.length > 0) {
      log.error({ failures }, 'Some alert channels failed');
    }
  }
}

// Create alert manager instance
export const alertManager = new AlertManager();

// Initialize alert channels
export function initializeAlerts() {
  // Slack
  if (process.env.SLACK_WEBHOOK_URL) {
    alertManager.addChannel(new SlackChannel(process.env.SLACK_WEBHOOK_URL));
  }
  
  // PagerDuty
  if (process.env.PAGERDUTY_API_KEY && process.env.PAGERDUTY_SERVICE_ID) {
    alertManager.addChannel(new PagerDutyChannel(
      process.env.PAGERDUTY_API_KEY,
      process.env.PAGERDUTY_SERVICE_ID
    ));
  }
  
  // Email
  if (process.env.SENDGRID_API_KEY && process.env.ALERT_EMAIL_FROM && process.env.ALERT_EMAIL_TO) {
    alertManager.addChannel(new EmailChannel(
      process.env.SENDGRID_API_KEY,
      process.env.ALERT_EMAIL_FROM,
      process.env.ALERT_EMAIL_TO.split(',')
    ));
  }
}

// Alert helper functions
export async function alertPerformanceIssue(
  metric: string,
  value: number,
  threshold: number,
  unit = 'ms'
) {
  await alertManager.sendAlert({
    id: `perf-${metric}-${Date.now()}`,
    severity: AlertSeverity.WARNING,
    category: AlertCategory.PERFORMANCE,
    title: `Performance degradation: ${metric}`,
    message: `${metric} is ${value}${unit}, exceeding threshold of ${threshold}${unit}`,
    metadata: { metric, value, threshold, unit },
    timestamp: new Date(),
  });
}

export async function alertSecurityEvent(
  event: string,
  details: string,
  metadata?: Record<string, any>
) {
  await alertManager.sendAlert({
    id: `sec-${event}-${Date.now()}`,
    severity: AlertSeverity.ERROR,
    category: AlertCategory.SECURITY,
    title: `Security event: ${event}`,
    message: details,
    metadata,
    timestamp: new Date(),
  });
}

export async function alertSystemDown(
  service: string,
  error: string,
  metadata?: Record<string, any>
) {
  await alertManager.sendAlert({
    id: `down-${service}-${Date.now()}`,
    severity: AlertSeverity.CRITICAL,
    category: AlertCategory.AVAILABILITY,
    title: `Service down: ${service}`,
    message: error,
    metadata,
    timestamp: new Date(),
  });
}

export async function alertBusinessMetric(
  metric: string,
  message: string,
  severity: AlertSeverity = AlertSeverity.INFO,
  metadata?: Record<string, any>
) {
  await alertManager.sendAlert({
    id: `biz-${metric}-${Date.now()}`,
    severity,
    category: AlertCategory.BUSINESS,
    title: `Business metric: ${metric}`,
    message,
    metadata,
    timestamp: new Date(),
  });
}

// Monitor critical metrics
export function startMetricMonitoring() {
  // Memory monitoring
  setInterval(() => {
    const usage = process.memoryUsage();
    const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
    
    if (heapUsedMB > 400) { // 400MB threshold
      alertPerformanceIssue('heap_memory', heapUsedMB, 400, 'MB');
    }
  }, 60000); // Every minute
  
  // Event loop monitoring
  let lastCheck = Date.now();
  setInterval(() => {
    const now = Date.now();
    const delay = now - lastCheck - 1000;
    
    if (delay > 100) { // 100ms threshold
      alertPerformanceIssue('event_loop_delay', delay, 100);
    }
    
    lastCheck = now;
  }, 1000);
}