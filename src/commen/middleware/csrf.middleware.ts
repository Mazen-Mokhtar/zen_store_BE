import {
  Injectable,
  NestMiddleware,
  BadRequestException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { CsrfService } from '../service/csrf.service';

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  constructor(private csrfService: CsrfService) {}

  // List of methods that require CSRF protection
  private readonly protectedMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];

  // Import security config for exempt paths
  private readonly exemptPaths = require('../config/security.config')
    .SecurityConfig.csrf.exemptPaths;

  use(req: Request, res: Response, next: NextFunction) {
    // Skip CSRF check for exempt paths or non-protected methods
    if (
      !this.protectedMethods.includes(req.method) ||
      this.exemptPaths.some((path) => req.path.startsWith(path))
    ) {
      return next();
    }

    // Import security config
    const { SecurityConfig } = require('../config/security.config');

    // For API requests, check the CSRF token in the header
    const csrfToken = req.headers[SecurityConfig.csrf.headerName] as string;
    const cookieToken = req.cookies?.[SecurityConfig.csrf.cookieName];

    // If no CSRF token in cookie, generate one for future requests
    if (!cookieToken) {
      return this.setNewCsrfToken(res, next);
    }

    // Validate the CSRF token
    if (!csrfToken || !this.csrfService.validateToken(csrfToken, cookieToken)) {
      return next(new BadRequestException('Invalid CSRF token'));
    }

    next();
  }

  /**
   * Generate and set a new CSRF token
   */
  private setNewCsrfToken(res: Response, next: NextFunction) {
    // Import security config
    const { SecurityConfig } = require('../config/security.config');

    const token = this.csrfService.generateToken();

    // Set the CSRF token as a cookie with secure attributes from config
    res.cookie(SecurityConfig.csrf.cookieName, token, {
      httpOnly: true, // Not accessible via JavaScript
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'strict', // Strict same-site policy
      path: '/', // Available across the site
      maxAge: SecurityConfig.csrf.cookieMaxAge,
    });

    next();
  }
}
