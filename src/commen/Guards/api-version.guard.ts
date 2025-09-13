import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import {
  API_VERSION_KEY,
  API_DEPRECATED_KEY,
  API_SUNSET_KEY,
} from '../Decorator/api-version.decorator';

@Injectable()
export class ApiVersionGuard implements CanActivate {
  private readonly logger = new Logger(ApiVersionGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // Get the requested API version (set by ApiVersionInterceptor)
    const requestedVersion = request['apiVersion'] || 'v1';

    // Get supported versions for this endpoint
    const supportedVersions = this.reflector.getAllAndOverride<string[]>(
      API_VERSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no versions specified, allow all versions
    if (!supportedVersions || supportedVersions.length === 0) {
      return true;
    }

    // Check if requested version is supported
    if (!supportedVersions.includes(requestedVersion)) {
      throw new BadRequestException(
        `API version '${requestedVersion}' is not supported for this endpoint. Supported versions: ${supportedVersions.join(', ')}`,
      );
    }

    // Handle deprecation warnings
    this.handleDeprecation(context, request, response, requestedVersion);

    // Handle sunset warnings
    this.handleSunset(context, response);

    return true;
  }

  private handleDeprecation(
    context: ExecutionContext,
    request: Request,
    response: Response,
    requestedVersion: string,
  ): void {
    const deprecationInfo = this.reflector.getAllAndOverride<{
      version: string;
      message: string;
      sunsetDate?: string;
    }>(API_DEPRECATED_KEY, [context.getHandler(), context.getClass()]);

    if (deprecationInfo && requestedVersion === deprecationInfo.version) {
      // Add deprecation headers
      response.setHeader('X-API-Deprecation-Warning', deprecationInfo.message);

      if (deprecationInfo.sunsetDate) {
        response.setHeader('X-API-Sunset-Date', deprecationInfo.sunsetDate);
      }

      // Log deprecation usage
      this.logger.warn(
        `Deprecated API endpoint accessed: ${request.method} ${request.path} (version: ${requestedVersion})`,
        {
          ip: request.ip,
          userAgent: request.headers['user-agent'],
          endpoint: `${request.method} ${request.path}`,
          version: requestedVersion,
          deprecationMessage: deprecationInfo.message,
        },
      );
    }
  }

  private handleSunset(context: ExecutionContext, response: Response): void {
    const sunsetInfo = this.reflector.getAllAndOverride<{
      date: string;
      message: string;
    }>(API_SUNSET_KEY, [context.getHandler(), context.getClass()]);

    if (sunsetInfo) {
      response.setHeader('X-API-Sunset-Date', sunsetInfo.date);
      response.setHeader('X-API-Sunset-Message', sunsetInfo.message);

      // Check if sunset date has passed
      const sunsetDate = new Date(sunsetInfo.date);
      const now = new Date();

      if (now > sunsetDate) {
        throw new BadRequestException(
          `This API endpoint has been sunset as of ${sunsetInfo.date}. ${sunsetInfo.message}`,
        );
      }

      // Warn if sunset is approaching (within 30 days)
      const daysUntilSunset = Math.ceil(
        (sunsetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (daysUntilSunset <= 30) {
        response.setHeader(
          'X-API-Sunset-Warning',
          `This endpoint will be sunset in ${daysUntilSunset} days`,
        );
      }
    }
  }
}
