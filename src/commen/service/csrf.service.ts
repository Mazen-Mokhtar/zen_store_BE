import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class CsrfService {
  /**
   * Generate a new CSRF token
   */
  generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Validate a CSRF token against the expected value
   */
  validateToken(token: string, expectedToken: string): boolean {
    // Import security config
    const { SecurityConfig } = require('../config/security.config');

    if (!token || !expectedToken) {
      return false;
    }

    // Check if tokens have the same length before comparison
    if (token.length !== expectedToken.length) {
      return false;
    }

    // Use timing-safe comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(token),
      Buffer.from(expectedToken),
    );
  }
}
