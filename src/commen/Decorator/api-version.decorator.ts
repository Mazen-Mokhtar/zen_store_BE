import { SetMetadata } from '@nestjs/common';

export const API_VERSION_KEY = 'apiVersion';
export const API_DEPRECATED_KEY = 'apiDeprecated';
export const API_SUNSET_KEY = 'apiSunset';

/**
 * Decorator to specify which API versions support this endpoint
 * @param versions Array of supported versions (e.g., ['v1', 'v2'])
 */
export const ApiVersion = (...versions: string[]) =>
  SetMetadata(API_VERSION_KEY, versions);

/**
 * Decorator to mark an endpoint as deprecated
 * @param version The version in which this endpoint is deprecated
 * @param message Optional deprecation message
 * @param sunsetDate Optional sunset date (when the endpoint will be removed)
 */
export const ApiDeprecated = (
  version: string,
  message?: string,
  sunsetDate?: string,
) => {
  return (
    target: any,
    propertyKey?: string,
    descriptor?: PropertyDescriptor,
  ) => {
    if (propertyKey && descriptor) {
      SetMetadata(API_DEPRECATED_KEY, {
        version,
        message: message || `This endpoint is deprecated in version ${version}`,
        sunsetDate,
      })(target, propertyKey, descriptor);
    }
  };
};

/**
 * Decorator to specify when an endpoint will be sunset (removed)
 * @param date The date when the endpoint will be removed (ISO string)
 * @param message Optional sunset message
 */
export const ApiSunset = (date: string, message?: string) =>
  SetMetadata(API_SUNSET_KEY, {
    date,
    message: message || `This endpoint will be removed on ${date}`,
  });

/**
 * Decorator for version-specific endpoints
 * Combines version specification with optional deprecation
 */
export const VersionedEndpoint = (options: {
  versions: string[];
  deprecated?: {
    version: string;
    message?: string;
    sunsetDate?: string;
  };
  sunset?: {
    date: string;
    message?: string;
  };
}) => {
  return (
    target: any,
    propertyKey?: string,
    descriptor?: PropertyDescriptor,
  ) => {
    if (propertyKey && descriptor) {
      // Set supported versions
      SetMetadata(API_VERSION_KEY, options.versions)(
        target,
        propertyKey,
        descriptor,
      );

      // Set deprecation info if provided
      if (options.deprecated) {
        SetMetadata(API_DEPRECATED_KEY, {
          version: options.deprecated.version,
          message:
            options.deprecated.message ||
            `This endpoint is deprecated in version ${options.deprecated.version}`,
          sunsetDate: options.deprecated.sunsetDate,
        })(target, propertyKey, descriptor);
      }

      // Set sunset info if provided
      if (options.sunset) {
        SetMetadata(API_SUNSET_KEY, {
          date: options.sunset.date,
          message:
            options.sunset.message ||
            `This endpoint will be removed on ${options.sunset.date}`,
        })(target, propertyKey, descriptor);
      }
    }
  };
};
