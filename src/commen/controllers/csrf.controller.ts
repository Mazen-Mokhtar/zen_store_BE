import { Controller, Get, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { CsrfService } from '../service/csrf.service';

@ApiTags('Security')
@Controller('csrf')
export class CsrfController {
  constructor(private csrfService: CsrfService) {}

  @ApiOperation({
    summary: 'Get CSRF token',
    description: 'Generate and return a new CSRF token for security protection',
  })
  @ApiResponse({
    status: 200,
    description: 'CSRF token generated successfully',
    schema: {
      example: {
        token: 'csrf-token-example-123',
      },
    },
  })
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
