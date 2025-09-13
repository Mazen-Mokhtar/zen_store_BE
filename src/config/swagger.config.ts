import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SwaggerConfig {
  enabled: boolean;
  title: string;
  description: string;
  version: string;
  termsOfService?: string;
  contact: {
    name: string;
    url?: string;
    email: string;
  };
  license: {
    name: string;
    url?: string;
  };
  servers: Array<{
    url: string;
    description: string;
  }>;
  tags: Array<{
    name: string;
    description: string;
    externalDocs?: {
      description: string;
      url: string;
    };
  }>;
  security: {
    jwt: {
      type: string;
      scheme: string;
      bearerFormat: string;
      description: string;
    };
    apiKey: {
      type: string;
      in: string;
      name: string;
      description: string;
    };
  };
  externalDocs: {
    description: string;
    url: string;
  };
  customCss?: string;
  customSiteTitle?: string;
  customfavIcon?: string;
  swaggerOptions?: any;
}

// Environment-specific configurations
const DEVELOPMENT_CONFIG: SwaggerConfig = {
  enabled: true,
  title: 'ZenStore API',
  description: `
    # ZenStore E-commerce API Documentation
    
    Welcome to the ZenStore API documentation. This comprehensive REST API provides all the functionality needed to build a modern e-commerce application.
    
    ## Features
    
    - **User Management**: Registration, authentication, profile management
    - **Product Catalog**: Products, categories, inventory management
    - **Shopping Experience**: Cart, wishlist, orders, reviews
    - **Business Tools**: Coupons, analytics, notifications
    - **Admin Features**: User management, order processing, inventory control
    - **Monitoring**: Health checks, metrics, error tracking
    
    ## Authentication
    
    This API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:
    
    \`\`\`
    Authorization: Bearer <your-jwt-token>
    \`\`\`
    
    ## API Versioning
    
    The API supports versioning through headers. Include the API version in your requests:
    
    \`\`\`
    X-API-Version: v1
    \`\`\`
    
    ## Rate Limiting
    
    API requests are rate-limited to ensure fair usage:
    - **General endpoints**: 100 requests per minute
    - **Authentication endpoints**: 10 requests per minute
    - **Admin endpoints**: 200 requests per minute
    
    ## Error Handling
    
    The API returns consistent error responses with appropriate HTTP status codes and detailed error messages.
    
    ## Support
    
    For API support, please contact our development team or check our documentation.
  `,
  version: '1.0.0',
  termsOfService: 'https://zenstore.com/terms',
  contact: {
    name: 'ZenStore API Team',
    url: 'https://zenstore.com/support',
    email: 'api-support@zenstore.com',
  },
  license: {
    name: 'MIT',
    url: 'https://opensource.org/licenses/MIT',
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Development server',
    },
    {
      url: 'http://localhost:3000/api/v1',
      description: 'Development server (v1)',
    },
  ],
  tags: [
    {
      name: 'Authentication',
      description: 'User authentication and authorization endpoints',
      externalDocs: {
        description: 'Authentication Guide',
        url: 'https://docs.zenstore.com/auth',
      },
    },
    {
      name: 'Users',
      description: 'User management and profile operations',
    },
    {
      name: 'Products',
      description: 'Product catalog and management',
    },
    {
      name: 'Categories',
      description: 'Product category management',
    },
    {
      name: 'Orders',
      description: 'Order processing and management',
    },
    {
      name: 'Carts',
      description: 'Shopping cart operations',
    },
    {
      name: 'Reviews',
      description: 'Product reviews and ratings',
    },
    {
      name: 'Wishlists',
      description: 'User wishlist management',
    },
    {
      name: 'Coupons',
      description: 'Discount coupons and promotions',
    },
    {
      name: 'Inventory',
      description: 'Inventory tracking and management',
    },
    {
      name: 'Notifications',
      description: 'User notifications and messaging',
    },
    {
      name: 'Analytics',
      description: 'Business analytics and reporting',
    },
    {
      name: 'Health',
      description: 'System health checks and monitoring',
    },
    {
      name: 'Monitoring',
      description: 'Application monitoring and metrics',
    },
  ],
  security: {
    jwt: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'JWT token for API authentication',
    },
    apiKey: {
      type: 'apiKey',
      in: 'header',
      name: 'X-API-Key',
      description: 'API key for service-to-service authentication',
    },
  },
  externalDocs: {
    description: 'ZenStore API Documentation',
    url: 'https://docs.zenstore.com',
  },
  customCss: `
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info .title { color: #2c3e50; }
    .swagger-ui .scheme-container { background: #f8f9fa; padding: 15px; border-radius: 5px; }
    .swagger-ui .info .description { line-height: 1.6; }
    .swagger-ui .opblock.opblock-post { border-color: #27ae60; }
    .swagger-ui .opblock.opblock-get { border-color: #3498db; }
    .swagger-ui .opblock.opblock-put { border-color: #f39c12; }
    .swagger-ui .opblock.opblock-delete { border-color: #e74c3c; }
  `,
  customSiteTitle: 'ZenStore API Documentation',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'none',
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    tryItOutEnabled: true,
  },
};

const STAGING_CONFIG: SwaggerConfig = {
  ...DEVELOPMENT_CONFIG,
  servers: [
    {
      url: 'https://staging-api.zenstore.com',
      description: 'Staging server',
    },
    {
      url: 'https://staging-api.zenstore.com/api/v1',
      description: 'Staging server (v1)',
    },
  ],
  swaggerOptions: {
    ...DEVELOPMENT_CONFIG.swaggerOptions,
    tryItOutEnabled: false, // Disable try-it-out in staging
  },
};

const PRODUCTION_CONFIG: SwaggerConfig = {
  ...DEVELOPMENT_CONFIG,
  enabled: process.env.SWAGGER_ENABLED === 'true', // Disabled by default in production
  servers: [
    {
      url: 'https://api.zenstore.com',
      description: 'Production server',
    },
    {
      url: 'https://api.zenstore.com/api/v1',
      description: 'Production server (v1)',
    },
  ],
  swaggerOptions: {
    ...DEVELOPMENT_CONFIG.swaggerOptions,
    tryItOutEnabled: false, // Disable try-it-out in production
    supportedSubmitMethods: [], // Disable all submit methods in production
  },
};

const ENVIRONMENT_CONFIGS = {
  development: DEVELOPMENT_CONFIG,
  staging: STAGING_CONFIG,
  production: PRODUCTION_CONFIG,
};

export function getSwaggerConfig(): SwaggerConfig {
  const env =
    (process.env.NODE_ENV as keyof typeof ENVIRONMENT_CONFIGS) || 'development';
  return ENVIRONMENT_CONFIGS[env] || DEVELOPMENT_CONFIG;
}

export function setupSwagger(
  app: INestApplication,
  configService?: ConfigService,
): void {
  const config = getSwaggerConfig();

  if (!config.enabled) {
    console.log('Swagger documentation is disabled');
    return;
  }

  // Create Swagger document configuration
  const documentConfig = new DocumentBuilder()
    .setTitle(config.title)
    .setDescription(config.description)
    .setVersion(config.version)
    .setTermsOfService(config.termsOfService || '')
    .setContact(
      config.contact.name,
      config.contact.url || '',
      config.contact.email,
    )
    .setLicense(config.license.name, config.license.url || '')
    .setExternalDoc(config.externalDocs.description, config.externalDocs.url);

  // Add servers
  config.servers.forEach((server) => {
    documentConfig.addServer(server.url, server.description);
  });

  // Add security schemes
  documentConfig
    .addBearerAuth(
      {
        type: config.security.jwt.type as any,
        scheme: config.security.jwt.scheme,
        bearerFormat: config.security.jwt.bearerFormat,
        description: config.security.jwt.description,
        name: 'Authorization',
        in: 'header',
      },
      'JWT',
    )
    .addApiKey(
      {
        type: config.security.apiKey.type as any,
        name: config.security.apiKey.name,
        in: config.security.apiKey.in,
        description: config.security.apiKey.description,
      },
      'ApiKey',
    );

  // Add tags
  config.tags.forEach((tag) => {
    if (tag.externalDocs) {
      documentConfig.addTag(tag.name, tag.description, tag.externalDocs);
    } else {
      documentConfig.addTag(tag.name, tag.description);
    }
  });

  // Build the document
  const document = SwaggerModule.createDocument(app, documentConfig.build(), {
    operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
    deepScanRoutes: true,
  });

  // Add custom schemas and examples
  addCustomSchemas(document);
  addResponseExamples(document);

  // Setup Swagger UI
  SwaggerModule.setup('api/docs', app, document, {
    customCss: config.customCss,
    customSiteTitle: config.customSiteTitle,
    customfavIcon: config.customfavIcon,
    swaggerOptions: config.swaggerOptions,
    customJs: [
      'https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-bundle.js',
      'https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-standalone-preset.js',
    ],
  });

  console.log(`📚 Swagger documentation available at: /api/docs`);
  console.log(`📄 OpenAPI JSON available at: /api/docs-json`);
}

function addCustomSchemas(document: any): void {
  // Add common response schemas
  document.components.schemas.ApiResponse = {
    type: 'object',
    properties: {
      success: {
        type: 'boolean',
        description: 'Indicates if the request was successful',
      },
      message: {
        type: 'string',
        description: 'Response message',
      },
      data: {
        type: 'object',
        description: 'Response data',
      },
      timestamp: {
        type: 'string',
        format: 'date-time',
        description: 'Response timestamp',
      },
    },
    required: ['success'],
  };

  document.components.schemas.ErrorResponse = {
    type: 'object',
    properties: {
      success: {
        type: 'boolean',
        example: false,
      },
      error: {
        type: 'object',
        properties: {
          code: {
            type: 'string',
            description: 'Error code',
          },
          message: {
            type: 'string',
            description: 'Error message',
          },
          details: {
            type: 'object',
            description: 'Additional error details',
          },
        },
      },
      timestamp: {
        type: 'string',
        format: 'date-time',
      },
      path: {
        type: 'string',
        description: 'Request path that caused the error',
      },
    },
    required: ['success', 'error', 'timestamp'],
  };

  document.components.schemas.PaginationMeta = {
    type: 'object',
    properties: {
      page: {
        type: 'integer',
        minimum: 1,
        description: 'Current page number',
      },
      limit: {
        type: 'integer',
        minimum: 1,
        maximum: 100,
        description: 'Number of items per page',
      },
      total: {
        type: 'integer',
        minimum: 0,
        description: 'Total number of items',
      },
      totalPages: {
        type: 'integer',
        minimum: 0,
        description: 'Total number of pages',
      },
      hasNext: {
        type: 'boolean',
        description: 'Whether there is a next page',
      },
      hasPrev: {
        type: 'boolean',
        description: 'Whether there is a previous page',
      },
    },
    required: ['page', 'limit', 'total', 'totalPages', 'hasNext', 'hasPrev'],
  };

  document.components.schemas.PaginatedResponse = {
    allOf: [
      { $ref: '#/components/schemas/ApiResponse' },
      {
        type: 'object',
        properties: {
          data: {
            type: 'object',
            properties: {
              items: {
                type: 'array',
                items: {},
              },
              meta: {
                $ref: '#/components/schemas/PaginationMeta',
              },
            },
          },
        },
      },
    ],
  };
}

function addResponseExamples(document: any): void {
  // Add common response examples
  const successExample = {
    success: true,
    message: 'Operation completed successfully',
    data: {},
    timestamp: '2024-01-15T10:30:00.000Z',
  };

  const errorExample = {
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Invalid input data',
      details: {
        field: 'email',
        reason: 'Invalid email format',
      },
    },
    timestamp: '2024-01-15T10:30:00.000Z',
    path: '/api/v1/users',
  };

  const paginatedExample = {
    success: true,
    data: {
      items: [],
      meta: {
        page: 1,
        limit: 10,
        total: 100,
        totalPages: 10,
        hasNext: true,
        hasPrev: false,
      },
    },
    timestamp: '2024-01-15T10:30:00.000Z',
  };

  // Add examples to schemas
  if (document.components.schemas.ApiResponse) {
    document.components.schemas.ApiResponse.example = successExample;
  }

  if (document.components.schemas.ErrorResponse) {
    document.components.schemas.ErrorResponse.example = errorExample;
  }

  if (document.components.schemas.PaginatedResponse) {
    document.components.schemas.PaginatedResponse.example = paginatedExample;
  }
}

// Utility functions for adding Swagger decorators
export class SwaggerUtils {
  static createApiResponse(status: number, description: string, type?: any) {
    const response: any = {
      status,
      description,
    };

    if (type) {
      response.type = type;
    }

    return response;
  }

  static createPaginatedResponse(description: string, itemType: any) {
    return {
      status: 200,
      description,
      schema: {
        allOf: [
          { $ref: '#/components/schemas/PaginatedResponse' },
          {
            properties: {
              data: {
                properties: {
                  items: {
                    type: 'array',
                    items: { $ref: `#/components/schemas/${itemType.name}` },
                  },
                },
              },
            },
          },
        ],
      },
    };
  }

  static createErrorResponse(status: number, description: string) {
    return {
      status,
      description,
      schema: { $ref: '#/components/schemas/ErrorResponse' },
    };
  }

  static getCommonResponses() {
    return [
      this.createErrorResponse(400, 'Bad Request - Invalid input data'),
      this.createErrorResponse(401, 'Unauthorized - Authentication required'),
      this.createErrorResponse(403, 'Forbidden - Insufficient permissions'),
      this.createErrorResponse(404, 'Not Found - Resource not found'),
      this.createErrorResponse(429, 'Too Many Requests - Rate limit exceeded'),
      this.createErrorResponse(500, 'Internal Server Error - Server error'),
    ];
  }

  static getAuthResponses() {
    return [
      this.createErrorResponse(401, 'Unauthorized - Invalid credentials'),
      this.createErrorResponse(403, 'Forbidden - Account locked or disabled'),
    ];
  }

  static getValidationResponses() {
    return [
      this.createErrorResponse(400, 'Bad Request - Validation failed'),
      this.createErrorResponse(
        422,
        'Unprocessable Entity - Invalid data format',
      ),
    ];
  }
}

// Export the configuration instance
export const swaggerConfig = getSwaggerConfig();
