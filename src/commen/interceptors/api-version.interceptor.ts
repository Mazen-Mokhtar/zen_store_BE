import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';
import {
  getVersionConfig,
  isSupportedVersion,
  isDeprecatedVersion,
  getLatestVersion,
  getRouteTransformations,
} from '../../config/api-version.config';

@Injectable()
export class ApiVersionInterceptor implements NestInterceptor {
  private readonly config = getVersionConfig();

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse();

    // Extract version from header, query param, or URL path
    const version = this.extractVersion(request);

    // Validate version
    if (!isSupportedVersion(version)) {
      throw new BadRequestException(
        `API version '${version}' is not supported. Supported versions: ${this.config.supportedVersions.join(', ')}`,
      );
    }

    // Add deprecation warning for deprecated versions
    const deprecationInfo = isDeprecatedVersion(version);
    if (deprecationInfo) {
      response.setHeader(
        'X-API-Deprecation-Warning',
        deprecationInfo.message ||
          `API version '${version}' is deprecated. Please migrate to version '${getLatestVersion()}'.`,
      );
      if (deprecationInfo.sunsetDate) {
        response.setHeader('X-API-Sunset-Date', deprecationInfo.sunsetDate);
      }
    }

    // Add version info to response headers
    response.setHeader('X-API-Version', version);
    response.setHeader(
      'X-API-Supported-Versions',
      this.config.supportedVersions.join(', '),
    );

    // Store version in request for use in controllers
    request['apiVersion'] = version;

    return next.handle().pipe(
      map((data) => {
        // Transform response based on version if needed
        return this.transformResponseForVersion(data, version, request);
      }),
    );
  }

  private extractVersion(request: Request): string {
    // Priority: Header > Query Param > URL Path > Default

    // 1. Check Accept header (e.g., application/vnd.zenstore.v2+json)
    const acceptHeader = request.headers.accept;
    if (acceptHeader) {
      const versionMatch = acceptHeader.match(/vnd\.zenstore\.(v\d+)\+json/);
      if (versionMatch) {
        return versionMatch[1];
      }
    }

    // 2. Check X-API-Version header
    const versionHeader = request.headers['x-api-version'] as string;
    if (versionHeader) {
      return versionHeader;
    }

    // 3. Check query parameter
    const versionQuery = request.query.version as string;
    if (versionQuery) {
      return versionQuery;
    }

    // 4. Check URL path (e.g., /api/v2/games)
    const pathMatch = request.path.match(/^\/api\/(v\d+)\//);
    if (pathMatch) {
      return pathMatch[1];
    }

    // 5. Default version
    return this.config.defaultVersion;
  }

  private transformResponseForVersion(
    data: any,
    version: string,
    request: Request,
  ): any {
    // Get route-specific transformations from config
    const routeTransformations = getRouteTransformations(
      version,
      request.route?.path || request.path,
      request.method,
    );

    if (routeTransformations?.transformations?.response) {
      return routeTransformations.transformations.response(data);
    }

    // Fallback to default transformations
    return this.applyDefaultTransformations(data, version);
  }

  private applyDefaultTransformations(data: any, version: string): any {
    // Apply default version-specific transformations
    switch (version) {
      case 'v1':
        return this.transformForV1(data);
      case 'v2':
        return this.transformForV2(data);
      default:
        return data;
    }
  }

  private transformForV1(data: any): any {
    // V1 backward compatibility transformations
    if (data && typeof data === 'object') {
      // Remove new fields that don't exist in v1
      const { metadata, enhancedFilters, advancedTracking, ...v1Data } = data;
      return v1Data;
    }
    return data;
  }

  private transformForV2(data: any): any {
    // V2 enhancements
    if (data && typeof data === 'object') {
      return {
        ...data,
        metadata: {
          version: 'v2',
          timestamp: new Date().toISOString(),
          enhanced: true,
          ...data.metadata,
        },
      };
    }
    return data;
  }
}
