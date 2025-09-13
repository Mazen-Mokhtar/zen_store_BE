import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { MongoError } from 'mongodb';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'Internal Server Error';

    // Handle HttpExceptions (NestJS built-in exceptions)
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const errorResponse = exception.getResponse();
      message =
        typeof errorResponse === 'object' && 'message' in errorResponse
          ? Array.isArray(errorResponse['message'])
            ? errorResponse['message'][0]
            : errorResponse['message']
          : exception.message;
      error =
        typeof errorResponse === 'object' && 'error' in errorResponse
          ? String(errorResponse['error'])
          : exception.name;
    }
    // Handle MongoDB errors
    else if (exception instanceof MongoError) {
      // Handle duplicate key errors
      if (exception.code === 11000) {
        status = HttpStatus.CONFLICT;
        message = 'Duplicate entry found';
        error = 'Conflict';
      }
    }
    // Handle other errors
    else if (exception instanceof Error) {
      message = exception.message;
      error = exception.name;
    }

    // Log the error
    this.logger.error(
      `${request.method} ${request.url} ${status} - ${message}`,
      exception instanceof Error ? exception.stack : '',
    );

    // Don't expose internal server error details in production
    if (
      process.env.NODE_ENV === 'production' &&
      status === HttpStatus.INTERNAL_SERVER_ERROR
    ) {
      message = 'Internal server error';
    }

    // Return a consistent error response
    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      error,
      message,
    });
  }
}
