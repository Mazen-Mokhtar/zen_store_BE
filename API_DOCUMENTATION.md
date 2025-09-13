# ZenStore API Documentation

## Overview

ZenStore is a comprehensive e-commerce REST API built with NestJS, providing all the functionality needed for a modern online store. This documentation covers the API endpoints, authentication, and usage examples.

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd zenstore-api

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Configure your environment variables
# Edit .env file with your database and service configurations

# Start the development server
npm run start:dev
```

### Environment Setup

Configure the following environment variables in your `.env` file:

```env
# Database
DATABASE_URL=mongodb://localhost:27017/zenstore

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=1d

# Application
NODE_ENV=development
PORT=3000

# Swagger
SWAGGER_ENABLED=true
```

## 📚 API Documentation

### Interactive Documentation

Once the server is running, you can access the interactive API documentation:

- **Swagger UI**: `http://localhost:3000/api/docs`
- **OpenAPI JSON**: `http://localhost:3000/api/docs-json`
- **OpenAPI YAML**: `http://localhost:3000/api/docs-yaml`

### API Versioning

The API supports versioning through headers:

```http
X-API-Version: v1
```

Supported versions: `v1`, `v2`

## 🔐 Authentication

### JWT Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```http
Authorization: Bearer <your-jwt-token>
```

### Authentication Flow

1. **Register**: `POST /auth/signup`
2. **Verify Email**: `POST /auth/confirm-email`
3. **Login**: `POST /auth/login`
4. **Use Token**: Include in Authorization header for protected routes

### Example Authentication

```javascript
// Register a new user
const registerResponse = await fetch('/auth/signup', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Version': 'v1'
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePassword123!',
    firstName: 'John',
    lastName: 'Doe'
  })
});

// Login
const loginResponse = await fetch('/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Version': 'v1'
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePassword123!'
  })
});

const { data } = await loginResponse.json();
const { accessToken } = data.tokens;

// Use token for authenticated requests
const protectedResponse = await fetch('/users/profile', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'X-API-Version': 'v1'
  }
});
```

## 📋 API Endpoints

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/signup` | Register new user | No |
| POST | `/auth/confirm-email` | Verify email address | No |
| POST | `/auth/login` | User login | No |
| POST | `/auth/resend-code` | Resend verification code | No |
| POST | `/auth/google-login` | Google OAuth login | No |
| POST | `/auth/forget-password` | Request password reset | No |
| POST | `/auth/confirm-forget-password` | Confirm password reset | No |
| POST | `/auth/reset-password` | Reset password | Yes |
| POST | `/auth/refresh-token` | Refresh access token | No |
| POST | `/auth/logout` | User logout | Yes |

### User Management

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/users/profile` | Get user profile | Yes |
| PUT | `/users/profile` | Update user profile | Yes |
| DELETE | `/users/profile` | Delete user account | Yes |
| GET | `/users` | Get all users (Admin) | Yes |
| GET | `/users/:id` | Get user by ID (Admin) | Yes |
| PUT | `/users/:id` | Update user (Admin) | Yes |
| DELETE | `/users/:id` | Delete user (Admin) | Yes |

### Product Management

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/products` | Get all products | No |
| GET | `/products/:id` | Get product by ID | No |
| POST | `/products` | Create product (Admin) | Yes |
| PUT | `/products/:id` | Update product (Admin) | Yes |
| DELETE | `/products/:id` | Delete product (Admin) | Yes |
| GET | `/products/search` | Search products | No |
| GET | `/products/category/:categoryId` | Get products by category | No |

### Order Management

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/orders` | Get user orders | Yes |
| GET | `/orders/:id` | Get order by ID | Yes |
| POST | `/orders` | Create new order | Yes |
| PUT | `/orders/:id/status` | Update order status (Admin) | Yes |
| DELETE | `/orders/:id` | Cancel order | Yes |

### Shopping Cart

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/carts` | Get user cart | Yes |
| POST | `/carts/items` | Add item to cart | Yes |
| PUT | `/carts/items/:itemId` | Update cart item | Yes |
| DELETE | `/carts/items/:itemId` | Remove item from cart | Yes |
| DELETE | `/carts` | Clear cart | Yes |

### Health & Monitoring

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/health` | Basic health check | No |
| GET | `/health/detailed` | Detailed health check | No |
| GET | `/monitoring/metrics` | Application metrics (Admin) | Yes |
| GET | `/monitoring/metrics/errors` | Error metrics (Admin) | Yes |

## 📊 Response Format

### Success Response

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response data
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "field": "email",
      "reason": "Invalid email format"
    }
  },
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/api/v1/users"
}
```

### Paginated Response

```json
{
  "success": true,
  "data": {
    "items": [
      // Array of items
    ],
    "meta": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "totalPages": 10,
      "hasNext": true,
      "hasPrev": false
    }
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## 🔒 Security

### Rate Limiting

API requests are rate-limited:

- **General endpoints**: 100 requests per minute
- **Authentication endpoints**: 10 requests per minute
- **Admin endpoints**: 200 requests per minute

### CORS

CORS is configured to allow requests from specified origins. Configure `ALLOWED_ORIGINS` in your environment variables.

### Input Validation

All input data is validated using class-validator decorators. Invalid data will result in a 400 Bad Request response.

### Security Headers

The API includes security headers via Helmet middleware:

- Content Security Policy
- X-Frame-Options
- X-Content-Type-Options
- Referrer Policy
- And more...

## 📈 Monitoring

### Health Checks

Monitor application health:

```bash
# Basic health check
curl http://localhost:3000/health

# Detailed health check
curl http://localhost:3000/health/detailed
```

### Metrics

Access application metrics (requires admin authentication):

```bash
# Application metrics
curl -H "Authorization: Bearer <admin-token>" http://localhost:3000/monitoring/metrics

# Error metrics
curl -H "Authorization: Bearer <admin-token>" http://localhost:3000/monitoring/metrics/errors
```

## 🧪 Testing

### Running Tests

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

### API Testing with Postman

1. Import the OpenAPI specification from `/api/docs-json`
2. Set up environment variables for base URL and authentication tokens
3. Use the generated collection for testing

## 🚀 Deployment

### Production Configuration

```env
NODE_ENV=production
SWAGGER_ENABLED=false
LOGGING_LEVEL=warn
MONITORING_ENABLED=true
```

### Docker Deployment

```dockerfile
FROM node:16-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start:prod"]
```

### Environment Variables for Production

- Set `SWAGGER_ENABLED=false` in production
- Configure proper database URLs
- Set strong JWT secrets
- Configure CORS origins
- Set up monitoring and logging

## 📞 Support

### Getting Help

- **Documentation**: Check this README and Swagger docs
- **Issues**: Create an issue in the repository
- **Email**: Contact the development team

### Common Issues

1. **Authentication Errors**: Ensure JWT token is valid and not expired
2. **Rate Limiting**: Reduce request frequency or contact admin for higher limits
3. **Validation Errors**: Check request body format against API documentation
4. **CORS Errors**: Ensure your origin is in the allowed origins list

## 🔄 API Changelog

### Version 1.0.0

- Initial API release
- User authentication and management
- Product catalog
- Order processing
- Shopping cart functionality
- Health monitoring
- Comprehensive documentation

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Note**: This documentation is automatically generated and kept in sync with the API implementation. For the most up-to-date information, always refer to the interactive Swagger documentation at `/api/docs`.