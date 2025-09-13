export interface ApiVersionConfig {
  supportedVersions: string[];
  defaultVersion: string;
  deprecatedVersions: DeprecatedVersion[];
  sunsetVersions: SunsetVersion[];
  versionMappings: VersionMapping[];
}

export interface DeprecatedVersion {
  version: string;
  deprecationDate: string;
  sunsetDate?: string;
  message?: string;
}

export interface SunsetVersion {
  version: string;
  sunsetDate: string;
  message?: string;
}

export interface VersionMapping {
  version: string;
  routes: RouteMapping[];
}

export interface RouteMapping {
  path: string;
  method: string;
  transformations?: {
    request?: (data: any) => any;
    response?: (data: any) => any;
  };
}

export const API_VERSION_CONFIG: ApiVersionConfig = {
  supportedVersions: ['v1', 'v2'],
  defaultVersion: 'v1',
  deprecatedVersions: [
    {
      version: 'v1',
      deprecationDate: '2024-06-01',
      sunsetDate: '2024-12-31',
      message:
        'API v1 is deprecated. Please migrate to v2 for enhanced features and better performance.',
    },
  ],
  sunsetVersions: [
    {
      version: 'v1',
      sunsetDate: '2024-12-31',
      message: 'API v1 will be discontinued. All endpoints will be removed.',
    },
  ],
  versionMappings: [
    {
      version: 'v1',
      routes: [
        {
          path: '/game',
          method: 'GET',
          transformations: {
            response: (data) => {
              // V1 backward compatibility: remove metadata and new fields
              if (data && typeof data === 'object') {
                const { metadata, enhancedFilters, ...v1Data } = data;
                return v1Data;
              }
              return data;
            },
          },
        },
        {
          path: '/order',
          method: 'GET',
          transformations: {
            response: (data) => {
              // V1 format: simplified order structure
              if (data && data.orders) {
                return {
                  ...data,
                  orders: data.orders.map((order: any) => {
                    const { advancedTracking, paymentDetails, ...v1Order } =
                      order;
                    return v1Order;
                  }),
                };
              }
              return data;
            },
          },
        },
      ],
    },
    {
      version: 'v2',
      routes: [
        {
          path: '/game',
          method: 'GET',
          transformations: {
            response: (data) => {
              // V2 enhancements: add metadata and enhanced features
              if (data && typeof data === 'object') {
                return {
                  ...data,
                  metadata: {
                    version: 'v2',
                    timestamp: new Date().toISOString(),
                    enhancedFiltering: true,
                    ...data.metadata,
                  },
                  enhancedFilters: {
                    available: true,
                    supportedTypes: ['category', 'price', 'rating', 'platform'],
                  },
                };
              }
              return data;
            },
          },
        },
        {
          path: '/order',
          method: 'GET',
          transformations: {
            response: (data) => {
              // V2 enhancements: add advanced tracking and payment details
              if (data && data.orders) {
                return {
                  ...data,
                  metadata: {
                    version: 'v2',
                    timestamp: new Date().toISOString(),
                    enhancedTracking: true,
                  },
                  orders: data.orders.map((order: any) => ({
                    ...order,
                    advancedTracking: {
                      enabled: true,
                      trackingStages: [
                        'created',
                        'processing',
                        'shipped',
                        'delivered',
                      ],
                    },
                    paymentDetails: {
                      method: order.paymentMethod || 'unknown',
                      status: order.paymentStatus || 'pending',
                      secureTransaction: true,
                    },
                  })),
                };
              }
              return data;
            },
          },
        },
      ],
    },
  ],
};

/**
 * Get version configuration
 */
export function getVersionConfig(): ApiVersionConfig {
  return API_VERSION_CONFIG;
}

/**
 * Check if version is supported
 */
export function isSupportedVersion(version: string): boolean {
  return API_VERSION_CONFIG.supportedVersions.includes(version);
}

/**
 * Check if version is deprecated
 */
export function isDeprecatedVersion(version: string): DeprecatedVersion | null {
  return (
    API_VERSION_CONFIG.deprecatedVersions.find((v) => v.version === version) ||
    null
  );
}

/**
 * Check if version is sunset
 */
export function isSunsetVersion(version: string): SunsetVersion | null {
  const sunsetVersion = API_VERSION_CONFIG.sunsetVersions.find(
    (v) => v.version === version,
  );
  if (sunsetVersion) {
    const sunsetDate = new Date(sunsetVersion.sunsetDate);
    const now = new Date();
    return now > sunsetDate ? sunsetVersion : null;
  }
  return null;
}

/**
 * Get route transformations for a specific version
 */
export function getRouteTransformations(
  version: string,
  path: string,
  method: string,
): RouteMapping | null {
  const versionMapping = API_VERSION_CONFIG.versionMappings.find(
    (v) => v.version === version,
  );
  if (versionMapping) {
    return (
      versionMapping.routes.find(
        (r) =>
          r.path === path && r.method.toLowerCase() === method.toLowerCase(),
      ) || null
    );
  }
  return null;
}

/**
 * Get latest supported version
 */
export function getLatestVersion(): string {
  return API_VERSION_CONFIG.supportedVersions[
    API_VERSION_CONFIG.supportedVersions.length - 1
  ];
}
