# ZenStore Security Features

This document provides an overview of the security features implemented in the ZenStore backend application.

## Recent Security Enhancements

### 1. Query Limits for MongoDB

All MongoDB queries now have maximum limits applied to prevent resource exhaustion from large dataset requests:

- Default limit of 100 records per query if no limit is specified
- Maximum cap of 500 records even if a higher limit is requested
- Pagination is enforced in repository methods with sensible defaults

### 2. Strict Content Security Policy

A stricter Content Security Policy has been implemented through Helmet middleware:

- Resources are restricted to same-origin only (`'self'`)
- Inline scripts are blocked completely
- Asset loading is restricted to approved sources only
- Frames are completely blocked with `frame-src: 'none'`
- Form submissions are restricted to same origin
- Additional security headers are configured with strict settings

## Real-time Attack Alerts

The application includes a comprehensive security monitoring system that detects and alerts on suspicious activities:

### Features

- **Failed Login Tracking**: Monitors and logs failed login attempts by IP address and email.
- **Brute Force Detection**: Identifies potential brute force attacks when multiple failed login attempts occur within a short time window.
- **Rate Limit Monitoring**: Tracks and alerts when rate limits are exceeded, which may indicate DoS attempts.
- **Suspicious IP Tracking**: Maintains a list of suspicious IPs based on their behavior patterns.

### Implementation

The security monitoring system is implemented through the `SecurityMonitoringService` which:

1. Collects security events from various parts of the application
2. Analyzes patterns to identify potential threats
3. Logs security incidents with detailed information
4. Emits events that can trigger notifications or automated responses

## CSRF Protection

The application implements proper Cross-Site Request Forgery (CSRF) protection using SameSite cookies and CSRF tokens.

### Features

- **SameSite Cookies**: CSRF tokens are stored in cookies with the `SameSite=strict` attribute to prevent cross-site requests.
- **Secure & HttpOnly Flags**: Cookies are configured with secure flags to enhance protection.
- **Double Submit Verification**: The application verifies that the token in the cookie matches the token in the request header.
- **Timing-Safe Comparison**: Token validation uses timing-safe comparison to prevent timing attacks.

### Implementation

1. The `CsrfMiddleware` applies CSRF protection to all routes except those explicitly exempted.
2. The `CsrfService` provides methods for generating and validating CSRF tokens.
3. The `CsrfController` exposes an endpoint for clients to obtain a CSRF token.

### Usage for Frontend Developers

To make authenticated requests to protected endpoints:

1. First, obtain a CSRF token by making a GET request to `/csrf/token`
2. Include the token in subsequent requests using the `X-CSRF-Token` header

Example:

```javascript
// Get CSRF token
const response = await fetch('/csrf/token');
const { token } = await response.json();

// Use token in subsequent requests
fetch('/api/protected-endpoint', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': token
  },
  body: JSON.stringify(data)
});
```

## Automated Security Testing in CI/CD

The application includes automated security testing in the CI/CD pipeline using GitHub Actions.

### Features

- **Dependency Scanning**: Uses npm audit to check for vulnerabilities in dependencies.
- **Static Code Analysis**: Uses ESLint with security plugins to identify potential security issues in the code.
- **Vulnerability Scanning**: Integrates with Snyk to detect vulnerabilities.
- **Secret Detection**: Uses GitLeaks to detect hardcoded secrets in the codebase.
- **Custom Security Checks**: Runs the custom security-check.js script to identify application-specific security issues.

### Implementation

The security scanning workflow is defined in `.github/workflows/security-scan.yml` and runs:

1. On push to main branches
2. On pull requests to main branches
3. On a weekly schedule

## Best Practices for Developers

1. **Always validate user input** using DTOs and class-validator decorators.
2. **Never store sensitive information** in code or logs.
3. **Use proper authentication** for all protected endpoints.
4. **Include CSRF tokens** in all forms and AJAX requests that modify data.
5. **Report security events** using the SecurityMonitoringService for suspicious activities.

## Configuration

Security features are centralized in a single configuration file (`src/commen/config/security.config.ts`) for easier management and consistency:

```typescript
export const SecurityConfig = {
  // MongoDB Query Limits
  mongodb: {
    defaultQueryLimit: 100,  // Default limit if none specified
    maxQueryLimit: 500,      // Maximum allowed limit
    defaultPageSize: 10,     // Default page size for pagination
    maxPageSize: 100,        // Maximum page size for pagination
  },
  
  // Rate Limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000,  // 15 minutes
    maxRequests: 100,          // Max requests per window
    message: 'Too many requests, please try again later.',
  },
  
  // Authentication Rate Limiting
  authRateLimit: {
    windowMs: 60 * 60 * 1000,  // 1 hour
    maxAttempts: 5,            // Max failed attempts
    message: 'Too many failed login attempts, please try again after an hour.',
  },
  
  // CSRF Protection
  csrf: {
    cookieName: 'csrf_token',
    headerName: 'x-csrf-token',
    cookieMaxAge: 24 * 60 * 60 * 1000,  // 24 hours
    exemptPaths: [
      '/auth/login',
      '/auth/signup',
      '/auth/google-login',
      '/order/webhook',
    ],
  },
  
  // Content Security Policy
  csp: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: [],
    },
  },
  
  // HSTS Settings
  hsts: {
    maxAge: 15552000,  // 180 days in seconds
    includeSubDomains: true,
    preload: true,
  },
};
```

This centralized approach ensures consistent security settings across the application and makes it easier to update security configurations.