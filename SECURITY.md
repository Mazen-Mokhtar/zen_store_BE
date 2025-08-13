# ZenStore Backend Security Documentation

## Security Measures Implemented

### 1. Authentication & Authorization

- **JWT-based Authentication**: Secure token-based authentication with role-based access control.
- **Token Expiration**: Access tokens expire after 1 day, refresh tokens after 7 days.
- **Password Security**: Passwords are hashed using bcrypt with configurable salt rounds.
- **Role-based Authorization**: Guards ensure users can only access resources appropriate for their role.

### 2. Input Validation & Sanitization

- **Validation Pipe**: Global ValidationPipe with whitelist and transform options to validate all incoming requests.
- **Class Validator**: Extensive use of class-validator decorators in DTOs for input validation.
- **Sanitization Middleware**: Custom middleware to sanitize request body, query parameters, and URL parameters to prevent XSS attacks.
- **MongoDB ObjectId Validation**: Custom MongoIdPipe to validate MongoDB ObjectIDs.

### 3. Rate Limiting & Brute Force Protection

- **Global Rate Limiting**: Limits each IP to 100 requests per 15 minutes across all routes.
- **Authentication Rate Limiting**: Stricter limits on authentication endpoints (5 attempts per hour) to prevent brute force attacks.
- **IP + Email Tracking**: Authentication rate limiting uses both IP and email to prevent distributed attacks.

### 4. HTTP Security Headers

- **Helmet**: Implements strict security headers to protect against various attacks:
  - Content-Security-Policy: Strict policy that only allows resources from same origin, blocks inline scripts, and restricts asset loading to approved sources
  - X-XSS-Protection: Additional XSS protection
  - X-Frame-Options: Prevents clickjacking by denying all frame embedding
  - X-Content-Type-Options: Prevents MIME-sniffing
  - Referrer-Policy: Uses strict-origin-when-cross-origin to limit referrer information
  - Strict-Transport-Security: Enforces HTTPS with 180-day duration, includeSubDomains, and preload flags
  - Permitted Cross-Domain Policies: Set to 'none' to prevent cross-domain data loading

### 5. Error Handling & Logging

- **Global Exception Filter**: Centralized error handling with appropriate status codes and messages.
- **Production Error Masking**: Detailed error messages are hidden in production to prevent information leakage.
- **Error Logging**: All errors are logged with request details and stack traces for debugging.

### 6. Database Security

- **MongoDB Security**: Connection uses SSL in production and sanitizeFilter option to prevent NoSQL injection.
- **Query Limits**: All MongoDB queries have maximum limits applied (default 100, max 500) to prevent resource exhaustion from large dataset requests.
- **Mongoose Schema Validation**: Strict schema validation for all database models.
- **Phone Number Encryption**: Sensitive data like phone numbers are encrypted using CryptoJS.

### 7. API Security

- **CORS Configuration**: Strict CORS policy in production, allowing only specified origins.
- **CSRF Protection**: Implemented through SameSite cookies and CSRF tokens with proper validation.
- **Request Body Size Limits**: Prevents denial-of-service attacks through large payloads.

## Security Best Practices for Developers

1. **Environment Variables**: Never hardcode sensitive information. Use environment variables for all secrets.
2. **Input Validation**: Always validate and sanitize user input using the provided pipes and DTOs.
3. **Authorization Checks**: Always use the appropriate guards for endpoints that require authentication.
4. **Error Handling**: Use specific exception types and let the global filter handle the response formatting.
5. **Sensitive Data**: Never log sensitive information like passwords, tokens, or personal data.

## Security Monitoring and Updates

- **Real-time Attack Alerts**: Monitoring system that detects and alerts on suspicious activities like multiple failed logins, brute force attempts, and unusual request patterns.
- **Automated Security Testing**: CI/CD pipeline integration with npm audit, ESLint security plugins, Snyk, and custom security checks.
- **Dependency Management**: Regular updates to patch security vulnerabilities.
- **Security Logging**: Comprehensive logging of security events with IP tracking and anomaly detection.
- **Periodic Reviews**: Scheduled security reviews and penetration testing.

## Security Features

- **Input Validation**: All user inputs are validated using class-validator decorators and DTOs.
- **Authentication**: JWT-based authentication with proper token validation.
- **Authorization**: Role-based access control for different user types.
- **Rate Limiting**: Protection against brute force attacks and DoS attempts.
- **CSRF Protection**: SameSite cookies and CSRF tokens with proper validation.
- **XSS Protection**: Content-Security-Policy headers via Helmet.
- **MongoDB Query Limits**: Default limit of 100 and maximum of 500 records to prevent resource exhaustion.
- **Security Headers**: Helmet middleware for setting secure HTTP headers.
- **Data Sanitization**: Sanitization of user inputs to prevent injection attacks.
- **Secure Password Storage**: Passwords are hashed using bcrypt.
- **HTTPS Only**: Enforced in production environment.
- **Secure Cookies**: HttpOnly and Secure flags for cookies.
- **Security Monitoring**: Real-time monitoring of suspicious activities.
- **Centralized Security Configuration**: All security settings are centralized in a single configuration file.

## Contact

If you discover a security vulnerability, please report it responsibly by contacting the security team.