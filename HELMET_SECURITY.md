# Helmet Security Implementation

## Overview

This document outlines the security headers implemented in the ZenStore-BE application using the Helmet middleware. These headers help protect the application from various web vulnerabilities and attacks.

## Implemented Security Headers

### Content Security Policy (CSP)

Controls which resources the user agent is allowed to load for a given page. Helps prevent Cross-Site Scripting (XSS) and data injection attacks.

```javascript
contentSecurityPolicy: {
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Consider removing unsafe-inline/eval in production
    styleSrc: ["'self'", "'unsafe-inline'"], // Consider removing unsafe-inline in production
    imgSrc: ["'self'", 'data:', 'https:'],
    connectSrc: ["'self'", 'https:'],
    fontSrc: ["'self'", 'https:', 'data:'],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    frameSrc: ["'none'"],
    frameAncestors: ["'none'"],
    formAction: ["'self'"],
    baseUri: ["'self'"],
    manifestSrc: ["'self'"],
    workerSrc: ["'self'", 'blob:'],
    upgradeInsecureRequests: [],
    blockAllMixedContent: [],
  }
}
```

### HTTP Strict Transport Security (HSTS)

Forces browsers to use HTTPS for the website.

```javascript
hsts: {
  maxAge: 15552000,  // 180 days in seconds
  includeSubDomains: true,
  preload: true,
}
```

### Cross-Origin Policies

- **Cross-Origin Embedder Policy**: `true`
- **Cross-Origin Opener Policy**: `{ policy: 'same-origin' }`
- **Cross-Origin Resource Policy**: `{ policy: 'same-origin' }`

These headers control how resources can be shared across different origins.

### Other Security Headers

- **Referrer Policy**: `{ policy: 'strict-origin-when-cross-origin' }`
- **X-Content-Type-Options**: `noSniff: true`
- **Origin Agent Cluster**: `true`
- **DNS Prefetch Control**: `{ allow: false }`
- **X-Frame-Options**: `frameguard: { action: 'deny' }`
- **Permitted Cross Domain Policies**: `{ permittedPolicies: 'none' }`
- **X-XSS-Protection**: `xssFilter: true`
- **IE No Open**: `ieNoOpen: true`

## Implementation

The security headers are implemented in the `HelmetMiddleware` class, which is applied globally to all routes in the application through the `AppModule`.

```typescript
@Injectable()
export class HelmetMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Apply Helmet with comprehensive security configuration
    helmet({
      // Configuration options...
    })(req, res, next);
  }
}
```

## Best Practices

1. **Regular Updates**: Keep the Helmet package updated to benefit from the latest security improvements.
2. **Content Security Policy**: In production, consider removing `unsafe-inline` and `unsafe-eval` from the CSP directives.
3. **Testing**: Regularly test the security headers using tools like [Security Headers](https://securityheaders.com/) or [Mozilla Observatory](https://observatory.mozilla.org/).
4. **Monitoring**: Monitor for any CSP violations and adjust the policy as needed.

## References

- [Helmet Documentation](https://helmetjs.github.io/)
- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)
- [MDN Web Security](https://developer.mozilla.org/en-US/docs/Web/Security)