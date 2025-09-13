import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { sanitize } from 'class-sanitizer';

@Injectable()
export class SanitizationMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Sanitize request body
    if (req.body) {
      this.sanitizeObject(req.body);
    }

    // Sanitize query parameters
    if (req.query) {
      this.sanitizeObject(req.query);
    }

    // Sanitize URL parameters
    if (req.params) {
      this.sanitizeObject(req.params);
    }

    next();
  }

  private sanitizeObject(obj: any) {
    if (!obj || typeof obj !== 'object') {
      return;
    }

    Object.keys(obj).forEach((key) => {
      const value = obj[key];

      if (typeof value === 'string') {
        // Sanitize string values to prevent XSS
        obj[key] = this.sanitizeString(value);
      } else if (typeof value === 'object' && value !== null) {
        // Recursively sanitize nested objects
        this.sanitizeObject(value);
      }
    });
  }

  private sanitizeString(value: string): string {
    // Replace potentially dangerous HTML characters
    return value
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }
}
