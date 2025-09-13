# API Versioning System

This document describes the API versioning system implemented in the ZenStore backend application.

## Overview

The API versioning system provides backward compatibility and smooth migration paths for API consumers. It supports multiple versioning strategies and automatic response transformations.

## Supported Versions

- **v1**: Legacy version (deprecated, sunset date: 2024-12-31)
- **v2**: Current stable version with enhanced features

## Version Specification Methods

Clients can specify the API version using any of the following methods (in order of priority):

### 1. Accept Header (Recommended)
```http
Accept: application/vnd.zenstore.v2+json
```

### 2. Custom Header
```http
X-API-Version: v2
```

### 3. Query Parameter
```http
GET /api/game?version=v2
```

### 4. URL Path
```http
GET /api/v2/game
```

## Response Headers

The API includes version information in response headers:

```http
X-API-Version: v2
X-API-Supported-Versions: v1, v2
X-API-Deprecation-Warning: API version 'v1' is deprecated. Please migrate to v2.
X-API-Sunset-Date: 2024-12-31
```

## Version-Specific Features

### V1 (Deprecated)
- Basic functionality
- Limited filtering options
- Simplified response structure
- **Sunset Date**: December 31, 2024

### V2 (Current)
- Enhanced filtering and search capabilities
- Metadata in responses
- Advanced tracking for orders
- Improved error handling
- Better performance optimizations

## Implementation Guide

### Using Decorators

#### Controller Level
```typescript
@Controller('game')
@ApiVersion('v1', 'v2')
export class GameController {
  // All endpoints support both v1 and v2
}
```

#### Method Level
```typescript
@Get()
@VersionedEndpoint({
  versions: ['v1', 'v2'],
  deprecated: {
    version: 'v1',
    message: 'Please use v2 API for enhanced features',
    sunsetDate: '2024-12-31'
  }
})
async listGames() {
  // Implementation
}
```

#### Simple Version Support
```typescript
@Get('stats')
@ApiVersion('v2') // Only available in v2
async getAdvancedStats() {
  // V2 only feature
}
```

#### Deprecation Warning
```typescript
@Get('legacy-endpoint')
@ApiDeprecated('v1', 'This endpoint is deprecated', '2024-12-31')
async legacyEndpoint() {
  // Deprecated endpoint
}
```

### Response Transformations

The system automatically transforms responses based on the requested version:

#### V1 Response (Simplified)
```json
{
  "games": [
    {
      "id": "123",
      "name": "Game Name",
      "price": 29.99
    }
  ],
  "total": 1
}
```

#### V2 Response (Enhanced)
```json
{
  "games": [
    {
      "id": "123",
      "name": "Game Name",
      "price": 29.99,
      "advancedTracking": {
        "enabled": true,
        "trackingStages": ["created", "processing", "shipped", "delivered"]
      }
    }
  ],
  "total": 1,
  "metadata": {
    "version": "v2",
    "timestamp": "2024-01-15T10:30:00Z",
    "enhanced": true
  },
  "enhancedFilters": {
    "available": true,
    "supportedTypes": ["category", "price", "rating", "platform"]
  }
}
```

## Configuration

API version configuration is centralized in `src/config/api-version.config.ts`:

```typescript
export const API_VERSION_CONFIG: ApiVersionConfig = {
  supportedVersions: ['v1', 'v2'],
  defaultVersion: 'v1',
  deprecatedVersions: [
    {
      version: 'v1',
      deprecationDate: '2024-06-01',
      sunsetDate: '2024-12-31',
      message: 'API v1 is deprecated. Please migrate to v2.'
    }
  ],
  // ... more configuration
};
```

## Migration Guide

### From V1 to V2

1. **Update API calls** to use v2 version specification
2. **Handle new response fields**:
   - `metadata` object with version info
   - `enhancedFilters` for improved filtering
   - `advancedTracking` for orders
3. **Update error handling** for improved error responses
4. **Test thoroughly** with both versions during transition

### Breaking Changes in V2

- Response structure includes additional metadata
- Some endpoints may have enhanced validation
- New required fields in certain requests

## Error Handling

### Unsupported Version
```http
HTTP/1.1 400 Bad Request
{
  "statusCode": 400,
  "message": "API version 'v3' is not supported. Supported versions: v1, v2",
  "error": "Bad Request"
}
```

### Sunset Version
```http
HTTP/1.1 400 Bad Request
{
  "statusCode": 400,
  "message": "This API endpoint has been sunset as of 2024-12-31. API v1 will be discontinued.",
  "error": "Bad Request"
}
```

## Best Practices

1. **Always specify version** in API calls
2. **Monitor deprecation warnings** in response headers
3. **Plan migration** well before sunset dates
4. **Test with multiple versions** during development
5. **Use semantic versioning** for major changes
6. **Document breaking changes** clearly

## Monitoring and Analytics

The system logs:
- Version usage statistics
- Deprecated endpoint access
- Migration patterns
- Error rates by version

Use these logs to:
- Plan sunset timelines
- Identify migration bottlenecks
- Monitor API health by version

## Support

For questions about API versioning:
- Check this documentation
- Review response headers for guidance
- Contact the development team for migration assistance