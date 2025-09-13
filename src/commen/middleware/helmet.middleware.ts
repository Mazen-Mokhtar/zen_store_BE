import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { SecurityConfig } from '../config/security.config';

@Injectable()
export class HelmetMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Apply Helmet with a comprehensive security configuration
    helmet({
      // Content Security Policy
      contentSecurityPolicy: {
        directives: SecurityConfig.csp.directives,
        reportOnly: false,
      },
      // Cross-Origin options
      crossOriginEmbedderPolicy: true,
      crossOriginOpenerPolicy: { policy: 'same-origin' },
      crossOriginResourcePolicy: { policy: 'same-origin' },

      // Browser features and security
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      hsts: SecurityConfig.hsts,
      noSniff: true, // X-Content-Type-Options
      originAgentCluster: true,
      dnsPrefetchControl: { allow: false },

      // Framing controls
      frameguard: { action: 'deny' }, // X-Frame-Options

      // Additional protections
      permittedCrossDomainPolicies: { permittedPolicies: 'none' },
      xssFilter: true, // X-XSS-Protection

      // Disable features
      ieNoOpen: true,
    })(req, res, next);
  }
}
