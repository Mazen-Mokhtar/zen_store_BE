/**
 * Security configuration settings for the application
 */
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
    maxRequests: 150,         // Max requests per window
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
    },
  },
  
  // HSTS Settings
  hsts: {
    maxAge: 15552000,  // 180 days in seconds
    includeSubDomains: true,
    preload: true,
  },
};