import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsDateString,
  IsObject,
  IsNumber,
  Min,
  Max,
  IsArray,
} from 'class-validator';

/**
 * Base API Response DTO
 */
export class ApiResponseDto<T = any> {
  @ApiProperty({
    description: 'Indicates if the request was successful',
    example: true,
  })
  @IsBoolean()
  success: boolean;

  @ApiPropertyOptional({
    description: 'Response message',
    example: 'Operation completed successfully',
  })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({
    description: 'Response data',
  })
  @IsOptional()
  data?: T;

  @ApiProperty({
    description: 'Response timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  @IsDateString()
  timestamp: string;

  constructor(success: boolean, data?: T, message?: string) {
    this.success = success;
    this.data = data;
    this.message = message;
    this.timestamp = new Date().toISOString();
  }

  static success<T>(data?: T, message?: string): ApiResponseDto<T> {
    return new ApiResponseDto(true, data, message);
  }

  static error(message: string): ApiResponseDto {
    return new ApiResponseDto(false, null, message);
  }
}

/**
 * Error Details DTO
 */
export class ErrorDetailsDto {
  @ApiProperty({
    description: 'Error code',
    example: 'VALIDATION_ERROR',
  })
  @IsString()
  code: string;

  @ApiProperty({
    description: 'Error message',
    example: 'Invalid input data',
  })
  @IsString()
  message: string;

  @ApiPropertyOptional({
    description: 'Additional error details',
    example: {
      field: 'email',
      reason: 'Invalid email format',
    },
  })
  @IsOptional()
  @IsObject()
  details?: any;

  @ApiPropertyOptional({
    description: 'Stack trace (development only)',
  })
  @IsOptional()
  @IsString()
  stack?: string;
}

/**
 * Error Response DTO
 */
export class ErrorResponseDto {
  @ApiProperty({
    description: 'Indicates if the request was successful',
    example: false,
  })
  @IsBoolean()
  success: boolean;

  @ApiProperty({
    description: 'Error information',
    type: ErrorDetailsDto,
  })
  @Type(() => ErrorDetailsDto)
  error: ErrorDetailsDto;

  @ApiProperty({
    description: 'Response timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  @IsDateString()
  timestamp: string;

  @ApiProperty({
    description: 'Request path that caused the error',
    example: '/api/v1/users',
  })
  @IsString()
  path: string;

  @ApiPropertyOptional({
    description: 'Request ID for tracking',
    example: 'req_123456789',
  })
  @IsOptional()
  @IsString()
  requestId?: string;
}

/**
 * Pagination Metadata DTO
 */
export class PaginationMetaDto {
  @ApiProperty({
    description: 'Current page number',
    example: 1,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsNumber()
  @Min(1)
  @Max(100)
  limit: number;

  @ApiProperty({
    description: 'Total number of items',
    example: 100,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  total: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 10,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  totalPages: number;

  @ApiProperty({
    description: 'Whether there is a next page',
    example: true,
  })
  @IsBoolean()
  hasNext: boolean;

  @ApiProperty({
    description: 'Whether there is a previous page',
    example: false,
  })
  @IsBoolean()
  hasPrev: boolean;

  @ApiPropertyOptional({
    description: 'Next page number',
    example: 2,
  })
  @IsOptional()
  @IsNumber()
  nextPage?: number;

  @ApiPropertyOptional({
    description: 'Previous page number',
    example: null,
  })
  @IsOptional()
  @IsNumber()
  prevPage?: number;

  constructor(page: number, limit: number, total: number) {
    this.page = page;
    this.limit = limit;
    this.total = total;
    this.totalPages = Math.ceil(total / limit);
    this.hasNext = page < this.totalPages;
    this.hasPrev = page > 1;
    this.nextPage = this.hasNext ? page + 1 : undefined;
    this.prevPage = this.hasPrev ? page - 1 : undefined;
  }
}

/**
 * Paginated Data DTO
 */
export class PaginatedDataDto<T> {
  @ApiProperty({
    description: 'Array of items',
    type: 'array',
  })
  @IsArray()
  items: T[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: PaginationMetaDto,
  })
  @Type(() => PaginationMetaDto)
  meta: PaginationMetaDto;

  constructor(items: T[], meta: PaginationMetaDto) {
    this.items = items;
    this.meta = meta;
  }
}

/**
 * Paginated Response DTO
 */
export class PaginatedResponseDto<T> extends ApiResponseDto<
  PaginatedDataDto<T>
> {
  constructor(
    items: T[],
    page: number,
    limit: number,
    total: number,
    message?: string,
  ) {
    const meta = new PaginationMetaDto(page, limit, total);
    const paginatedData = new PaginatedDataDto(items, meta);
    super(true, paginatedData, message);
  }

  static create<T>(
    items: T[],
    page: number,
    limit: number,
    total: number,
    message?: string,
  ): PaginatedResponseDto<T> {
    return new PaginatedResponseDto(items, page, limit, total, message);
  }
}

/**
 * Query Parameters DTO for Pagination
 */
export class PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 10,
    minimum: 1,
    maximum: 100,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}

/**
 * Search Query Parameters DTO
 */
export class SearchQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Search term',
    example: 'laptop',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Sort field',
    example: 'createdAt',
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'desc',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}

/**
 * ID Parameter DTO
 */
export class IdParamDto {
  @ApiProperty({
    description: 'Resource ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  id: string;
}

/**
 * Bulk Operation DTO
 */
export class BulkOperationDto {
  @ApiProperty({
    description: 'Array of IDs to operate on',
    example: [
      '123e4567-e89b-12d3-a456-426614174000',
      '123e4567-e89b-12d3-a456-426614174001',
    ],
  })
  @IsArray()
  @IsString({ each: true })
  ids: string[];
}

/**
 * Bulk Operation Result DTO
 */
export class BulkOperationResultDto {
  @ApiProperty({
    description: 'Number of successful operations',
    example: 5,
  })
  @IsNumber()
  successCount: number;

  @ApiProperty({
    description: 'Number of failed operations',
    example: 1,
  })
  @IsNumber()
  failureCount: number;

  @ApiProperty({
    description: 'Total number of operations attempted',
    example: 6,
  })
  @IsNumber()
  totalCount: number;

  @ApiPropertyOptional({
    description: 'Details of failed operations',
    example: [
      {
        id: '123e4567-e89b-12d3-a456-426614174001',
        error: 'Resource not found',
      },
    ],
  })
  @IsOptional()
  @IsArray()
  failures?: Array<{
    id: string;
    error: string;
  }>;

  constructor(
    successCount: number,
    failureCount: number,
    failures?: Array<{ id: string; error: string }>,
  ) {
    this.successCount = successCount;
    this.failureCount = failureCount;
    this.totalCount = successCount + failureCount;
    this.failures = failures;
  }
}

/**
 * Health Check DTO
 */
export class HealthCheckDto {
  @ApiProperty({
    description: 'Service status',
    example: 'ok',
    enum: ['ok', 'error', 'shutting_down'],
  })
  @IsString()
  status: 'ok' | 'error' | 'shutting_down';

  @ApiPropertyOptional({
    description: 'Additional health information',
  })
  @IsOptional()
  @IsObject()
  info?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Error details if status is error',
  })
  @IsOptional()
  @IsObject()
  error?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Detailed health check results',
  })
  @IsOptional()
  @IsObject()
  details?: Record<string, any>;
}

/**
 * File Upload Response DTO
 */
export class FileUploadResponseDto {
  @ApiProperty({
    description: 'Uploaded file URL',
    example: 'https://cdn.zenstore.com/uploads/image123.jpg',
  })
  @IsString()
  url: string;

  @ApiProperty({
    description: 'Original filename',
    example: 'product-image.jpg',
  })
  @IsString()
  filename: string;

  @ApiProperty({
    description: 'File size in bytes',
    example: 1024000,
  })
  @IsNumber()
  size: number;

  @ApiProperty({
    description: 'File MIME type',
    example: 'image/jpeg',
  })
  @IsString()
  mimeType: string;

  @ApiPropertyOptional({
    description: 'File upload timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  uploadedAt?: string;
}

/**
 * Statistics DTO
 */
export class StatisticsDto {
  @ApiProperty({
    description: 'Total count',
    example: 1000,
  })
  @IsNumber()
  total: number;

  @ApiPropertyOptional({
    description: 'Count for current period',
    example: 50,
  })
  @IsOptional()
  @IsNumber()
  current?: number;

  @ApiPropertyOptional({
    description: 'Count for previous period',
    example: 45,
  })
  @IsOptional()
  @IsNumber()
  previous?: number;

  @ApiPropertyOptional({
    description: 'Percentage change',
    example: 11.11,
  })
  @IsOptional()
  @IsNumber()
  changePercent?: number;

  @ApiPropertyOptional({
    description: 'Trend direction',
    example: 'up',
    enum: ['up', 'down', 'stable'],
  })
  @IsOptional()
  @IsString()
  trend?: 'up' | 'down' | 'stable';
}

/**
 * Export utility functions
 */
export class ResponseUtils {
  static success<T>(data?: T, message?: string): ApiResponseDto<T> {
    return ApiResponseDto.success(data, message);
  }

  static error(message: string): ApiResponseDto {
    return ApiResponseDto.error(message);
  }

  static paginated<T>(
    items: T[],
    page: number,
    limit: number,
    total: number,
    message?: string,
  ): PaginatedResponseDto<T> {
    return PaginatedResponseDto.create(items, page, limit, total, message);
  }

  static bulkResult(
    successCount: number,
    failureCount: number,
    failures?: Array<{ id: string; error: string }>,
  ): BulkOperationResultDto {
    return new BulkOperationResultDto(successCount, failureCount, failures);
  }

  static statistics(
    total: number,
    current?: number,
    previous?: number,
  ): StatisticsDto {
    const stats = new StatisticsDto();
    stats.total = total;
    stats.current = current;
    stats.previous = previous;

    if (current !== undefined && previous !== undefined && previous > 0) {
      stats.changePercent = ((current - previous) / previous) * 100;
      stats.trend =
        stats.changePercent > 0
          ? 'up'
          : stats.changePercent < 0
            ? 'down'
            : 'stable';
    }

    return stats;
  }
}
