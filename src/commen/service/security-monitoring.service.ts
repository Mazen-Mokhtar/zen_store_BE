import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';

// Define security event types
export enum SecurityEventType {
  FAILED_LOGIN = 'security.login.failed',
  BRUTE_FORCE_ATTEMPT = 'security.brute_force',
  SUSPICIOUS_ACTIVITY = 'security.suspicious',
  RATE_LIMIT_EXCEEDED = 'security.rate_limit',
  INVALID_TOKEN = 'security.invalid_token',
  UNAUTHORIZED_ACCESS = 'security.unauthorized',
}

// Security event payload interface
export interface SecurityEvent {
  type: SecurityEventType;
  timestamp: Date;
  ip: string;
  userId?: string;
  email?: string;
  path?: string;
  details?: any;
}

@Injectable()
export class SecurityMonitoringService {
  private readonly logger = new Logger(SecurityMonitoringService.name);

  // Track failed login attempts by IP
  private failedLoginAttempts: Map<
    string,
    { count: number; firstAttempt: Date }
  > = new Map();

  // Track suspicious IPs
  private suspiciousIPs: Set<string> = new Set();

  constructor(private eventEmitter: EventEmitter2) {}

  /**
   * Report a security event
   */
  reportEvent(event: SecurityEvent): void {
    // Log the security event
    this.logger.warn(
      `Security event: ${event.type} | IP: ${event.ip} | Path: ${event.path || 'N/A'} | User: ${event.userId || event.email || 'anonymous'}`,
      event.details,
    );

    // Emit the event for other services to react
    this.eventEmitter.emit(event.type, event);

    // Process specific event types
    if (event.type === SecurityEventType.FAILED_LOGIN) {
      this.processFailedLogin(event);
    }
  }

  /**
   * Process failed login attempts to detect brute force attacks
   */
  private processFailedLogin(event: SecurityEvent): void {
    const ip = event.ip;
    const now = new Date();

    // Get or initialize tracking for this IP
    const tracking = this.failedLoginAttempts.get(ip) || {
      count: 0,
      firstAttempt: now,
    };

    // Increment the counter
    tracking.count++;

    // Check if this is a potential brute force attack (5+ attempts within 10 minutes)
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

    if (tracking.count >= 5 && tracking.firstAttempt > tenMinutesAgo) {
      // This looks like a brute force attempt
      this.suspiciousIPs.add(ip);

      // Report brute force attempt
      this.eventEmitter.emit(SecurityEventType.BRUTE_FORCE_ATTEMPT, {
        type: SecurityEventType.BRUTE_FORCE_ATTEMPT,
        timestamp: now,
        ip,
        email: event.email,
        details: {
          attemptCount: tracking.count,
          timeWindowMinutes: Math.round(
            (now.getTime() - tracking.firstAttempt.getTime()) / 60000,
          ),
        },
      });

      // Reset counter after reporting
      tracking.count = 0;
      tracking.firstAttempt = now;
    }

    // Update the tracking map
    this.failedLoginAttempts.set(ip, tracking);
  }

  /**
   * Check if an IP is suspicious
   */
  isSuspiciousIP(ip: string): boolean {
    return this.suspiciousIPs.has(ip);
  }

  /**
   * Handle brute force attempts
   */
  @OnEvent(SecurityEventType.BRUTE_FORCE_ATTEMPT)
  handleBruteForceAttempt(event: SecurityEvent): void {
    this.logger.error(
      `ALERT: Potential brute force attack detected from IP: ${event.ip}`,
      event.details,
    );

    // Here you would implement notification logic (email, SMS, etc.)
    // For example, send an email to the security team
    // this.notificationService.sendSecurityAlert('Brute Force Attack', event);
  }

  /**
   * Handle rate limit exceeded events
   */
  @OnEvent(SecurityEventType.RATE_LIMIT_EXCEEDED)
  handleRateLimitExceeded(event: SecurityEvent): void {
    this.logger.warn(
      `Rate limit exceeded for IP: ${event.ip} | Path: ${event.path}`,
      event.details,
    );

    // Check if this is a repeated offender
    if (this.isSuspiciousIP(event.ip)) {
      this.logger.error(
        `ALERT: Suspicious IP ${event.ip} has exceeded rate limits multiple times`,
      );

      // Here you would implement notification logic
    }
  }

  /**
   * Periodic cleanup of tracking data (call this method from a scheduled task)
   */
  cleanupTrackingData(): void {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Clean up failed login attempts older than 1 day
    for (const [ip, data] of this.failedLoginAttempts.entries()) {
      if (data.firstAttempt < oneDayAgo) {
        this.failedLoginAttempts.delete(ip);
      }
    }

    // In a real implementation, you might want to persist suspicious IPs to a database
    // and have a more sophisticated cleanup strategy
  }
}
