# Health Monitoring System

This document describes the comprehensive health monitoring system implemented in the ZenStore backend application.

## Overview

The health monitoring system provides real-time insights into the application's health, performance metrics, and system status. It includes multiple endpoints for different monitoring needs and supports various health check types.

## Health Check Endpoints

### 1. Basic Health Check
**Endpoint:** `GET /health`

**Purpose:** Lightweight health check for load balancers and basic monitoring.

**Response:**
```json
{
  "status": "healthy",
  "message": "Service is running",
  "details": {
    "uptime": 3600,
    "version": "1.0.0",
    "environment": "production",
    "nodeVersion": "v18.17.0"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 2. Detailed Health Check
**Endpoint:** `GET /health/detailed`

**Purpose:** Comprehensive health check including all dependencies and system metrics.

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": 3600,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "services": [
    {
      "name": "Database",
      "status": "healthy",
      "message": "Database connection is healthy",
      "details": {
        "readyState": 1,
        "host": "localhost",
        "port": 27017,
        "responseTime": 15
      },
      "responseTime": 15,
      "timestamp": "2024-01-15T10:30:00.000Z"
    },
    {
      "name": "Redis",
      "status": "healthy",
      "message": "Redis connection is healthy",
      "details": {
        "responseTime": 8
      },
      "responseTime": 8,
      "timestamp": "2024-01-15T10:30:00.000Z"
    },
    {
      "name": "Memory",
      "status": "healthy",
      "message": "Memory usage: 65%",
      "details": {
        "usagePercent": 65,
        "used": 512,
        "free": 276,
        "total": 1024,
        "heap": {
          "used": 128,
          "total": 256
        }
      },
      "responseTime": 0,
      "timestamp": "2024-01-15T10:30:00.000Z"
    }
  ],
  "metrics": {
    "requests": {
      "total": 1500,
      "successful": 1485,
      "failed": 15,
      "averageResponseTime": 245,
      "errorRate": 1
    },
    "endpoints": [
      {
        "endpoint": "GET /api/games",
        "count": 450,
        "averageResponseTime": 180,
        "errorRate": 0
      }
    ],
    "errors": {
      "total": 15,
      "byType": [
        {
          "type": "Client Error",
          "count": 12
        },
        {
          "type": "Server Error",
          "count": 3
        }
      ],
      "recent": []
    },
    "performance": {
      "slowRequests": []
    }
  }
}
```

### 3. Readiness Probe
**Endpoint:** `GET /health/ready`

**Purpose:** Kubernetes readiness probe to determine if the application is ready to serve traffic.

**Response:**
```json
{
  "status": "healthy",
  "message": "Application is ready to serve traffic",
  "details": {
    "database": "connected",
    "redis": "connected",
    "dependencies": "ready"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 4. Liveness Probe
**Endpoint:** `GET /health/live`

**Purpose:** Kubernetes liveness probe to determine if the application is alive and should be restarted if unhealthy.

**Response:**
```json
{
  "status": "healthy",
  "message": "Application is alive",
  "details": {
    "uptime": 3600,
    "memoryUsage": "normal",
    "processHealth": "good"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 5. Database Health Check
**Endpoint:** `GET /health/database`

**Purpose:** Specific database connectivity and performance check.

### 6. Redis Health Check
**Endpoint:** `GET /health/redis`

**Purpose:** Specific Redis connectivity and performance check.

### 7. System Metrics
**Endpoint:** `GET /health/metrics`

**Purpose:** Detailed system and application metrics.

### 8. Application Info
**Endpoint:** `GET /health/info`

**Purpose:** Application version, build information, and configuration details.

## Health Status Levels

### Status Types
- **healthy**: All systems are functioning normally
- **warning**: Some non-critical issues detected
- **critical**: Critical issues that may affect functionality
- **down**: Service is unavailable

### Thresholds

#### Response Time
- **Warning**: > 1000ms
- **Critical**: > 3000ms

#### Error Rate
- **Warning**: > 5%
- **Critical**: > 10%

#### Memory Usage
- **Warning**: > 80%
- **Critical**: > 90%

## Configuration

The health monitoring system is configured through `src/config/health.config.ts`:

```typescript
export const healthConfig: HealthConfig = {
  endpoints: {
    health: '/health',
    ready: '/health/ready',
    live: '/health/live',
    metrics: '/health/metrics',
  },
  checks: {
    database: {
      enabled: true,
      timeout: 5000,
    },
    redis: {
      enabled: true,
      timeout: 3000,
    },
    memory: {
      enabled: true,
      maxUsagePercent: 90,
    },
    external: {
      enabled: process.env.NODE_ENV === 'production',
      services: [
        {
          name: 'Payment Gateway',
          url: process.env.PAYMENT_GATEWAY_HEALTH_URL,
          timeout: 5000,
          method: 'HEAD',
        },
      ],
    },
  },
  thresholds: {
    responseTime: {
      warning: 1000,
      critical: 3000,
    },
    errorRate: {
      warning: 5,
      critical: 10,
    },
    memory: {
      warning: 80,
      critical: 90,
    },
  },
};
```

## Metrics Collection

The system automatically collects metrics through middleware:

### Request Metrics
- Total requests
- Successful/failed requests
- Average response time
- Error rate
- Endpoint-specific metrics

### Performance Metrics
- Slow requests (>2 seconds)
- Memory usage
- CPU usage
- System uptime

### Error Tracking
- Error count by type
- Recent errors with details
- Error trends

## Kubernetes Integration

### Readiness Probe Configuration
```yaml
readinessProbe:
  httpGet:
    path: /health/ready
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
```

### Liveness Probe Configuration
```yaml
livenessProbe:
  httpGet:
    path: /health/live
    port: 3000
  initialDelaySeconds: 60
  periodSeconds: 30
  timeoutSeconds: 10
  failureThreshold: 3
```

## Monitoring and Alerting

### Prometheus Integration
The metrics endpoint provides data in a format compatible with Prometheus scraping:

```
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",status="200"} 1485
http_requests_total{method="GET",status="404"} 12
http_requests_total{method="POST",status="500"} 3

# HELP http_request_duration_seconds HTTP request duration
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_sum 367.5
http_request_duration_seconds_count 1500
```

### Grafana Dashboard
Create dashboards to visualize:
- Request rate and response times
- Error rates and types
- System resource usage
- Service health status

### Alerting Rules
Set up alerts for:
- High error rates (>5%)
- Slow response times (>3s)
- Service unavailability
- High memory usage (>90%)

## Best Practices

### 1. Health Check Design
- Keep basic health checks lightweight
- Use appropriate timeouts
- Implement circuit breakers for external dependencies
- Cache health check results when appropriate

### 2. Monitoring
- Monitor both technical and business metrics
- Set up proper alerting thresholds
- Use structured logging
- Implement distributed tracing

### 3. Performance
- Avoid expensive operations in health checks
- Use connection pooling
- Implement proper error handling
- Monitor resource usage

### 4. Security
- Protect sensitive health information
- Use authentication for detailed metrics
- Implement rate limiting
- Audit health check access

## Troubleshooting

### Common Issues

#### Database Connection Failures
- Check MongoDB connection string
- Verify network connectivity
- Check authentication credentials
- Monitor connection pool status

#### High Memory Usage
- Check for memory leaks
- Monitor garbage collection
- Review application code
- Scale resources if needed

#### Slow Response Times
- Identify bottlenecks
- Optimize database queries
- Review caching strategy
- Check external service dependencies

### Debugging

1. Check application logs
2. Review health check responses
3. Monitor system metrics
4. Use profiling tools
5. Analyze request patterns

## API Versioning

Health endpoints support API versioning:

```bash
# Version 1 (legacy)
curl -H "API-Version: v1" http://localhost:3000/health

# Version 2 (current)
curl -H "API-Version: v2" http://localhost:3000/health
```

Version 2 includes enhanced metrics and additional health checks.

## Environment-Specific Configuration

### Development
- Disabled external service checks
- More lenient thresholds
- Detailed error information

### Production
- All checks enabled
- Strict thresholds
- Minimal error details in responses
- Enhanced security

### Testing
- Fast timeouts
- Disabled external checks
- Mock services

## Support

For issues or questions regarding the health monitoring system:

1. Check the application logs
2. Review this documentation
3. Contact the development team
4. Create an issue in the project repository

---

**Last Updated:** January 2024  
**Version:** 1.0.0