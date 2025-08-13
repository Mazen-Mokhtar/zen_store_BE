import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { CsrfService } from '../service/csrf.service';

@Controller('csrf')
export class CsrfController {
  constructor(private csrfService: CsrfService) {}

  /**
   * Get a new CSRF token
   * This endpoint is used by the frontend to obtain a CSRF token
   */
  @Get('token')
  getCsrfToken(@Res({ passthrough: true }) res: Response) {
    // Import security config
    const { SecurityConfig } = require('../config/security.config');
    
    const token = this.csrfService.generateToken();
    
    // Set the token as a cookie using config
    res.cookie(SecurityConfig.csrf.cookieName, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: SecurityConfig.csrf.cookieMaxAge,
    });
    
    // Return the token in the response body for the frontend to use in headers
    return { token };
  }
}