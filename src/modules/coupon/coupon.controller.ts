import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiHeader,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { CouponService } from './coupon.service';
import { AuthGuard } from 'src/commen/Guards/auth.guard';
import { RolesGuard } from 'src/commen/Guards/role.guard';
import { Roles } from 'src/commen/Decorator/roles.decorator';
import { RoleTypes, TUser } from 'src/DB/models/User/user.schema';
import { User } from 'src/commen/Decorator/user.decorator';
import {
  CreateCouponDTO,
  UpdateCouponDTO,
  ValidateCouponDTO,
  ParamCouponDTO,
  QueryCouponDTO,
} from './dto';

@ApiTags('Coupons')
@ApiHeader({
  name: 'X-API-Version',
  description: 'API Version',
  required: false,
  schema: { default: 'v1' },
})
@UsePipes(new ValidationPipe({ whitelist: true }))
@Controller('coupon')
export class CouponController {
  constructor(private readonly couponService: CouponService) {}

  // Admin endpoints
  @ApiOperation({
    summary: 'Create new coupon',
    description: 'Create a new discount coupon. Requires admin privileges.',
  })
  @ApiBearerAuth('JWT')
  @ApiResponse({ status: 201, description: 'Coupon created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin privileges required',
  })
  @Post()
  @Roles([RoleTypes.ADMIN])
  @UseGuards(AuthGuard, RolesGuard)
  async createCoupon(@User() admin: TUser, @Body() body: CreateCouponDTO) {
    return await this.couponService.createCoupon(admin, body);
  }

  @ApiOperation({
    summary: 'Update coupon',
    description: 'Update an existing coupon. Requires admin privileges.',
  })
  @ApiParam({ name: 'couponId', description: 'Coupon ID to update' })
  @ApiBearerAuth('JWT')
  @ApiResponse({ status: 200, description: 'Coupon updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin privileges required',
  })
  @ApiResponse({ status: 404, description: 'Coupon not found' })
  @Patch(':couponId')
  @Roles([RoleTypes.ADMIN])
  @UseGuards(AuthGuard, RolesGuard)
  async updateCoupon(
    @User() admin: TUser,
    @Param() params: ParamCouponDTO,
    @Body() body: UpdateCouponDTO,
  ) {
    return await this.couponService.updateCoupon(admin, params, body);
  }

  @ApiOperation({
    summary: 'Delete coupon',
    description: 'Delete a coupon by its ID. Requires admin privileges.',
  })
  @ApiParam({ name: 'couponId', description: 'Coupon ID to delete' })
  @ApiBearerAuth('JWT')
  @ApiResponse({ status: 200, description: 'Coupon deleted successfully' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin privileges required',
  })
  @ApiResponse({ status: 404, description: 'Coupon not found' })
  @Delete(':couponId')
  @Roles([RoleTypes.ADMIN])
  @UseGuards(AuthGuard, RolesGuard)
  async deleteCoupon(@User() admin: TUser, @Param() params: ParamCouponDTO) {
    return await this.couponService.deleteCoupon(admin, params);
  }

  @ApiOperation({
    summary: 'Get all coupons',
    description:
      'Retrieve all coupons with optional filtering. Requires admin privileges.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number for pagination',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of items per page',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by coupon status',
  })
  @ApiBearerAuth('JWT')
  @ApiResponse({ status: 200, description: 'Coupons retrieved successfully' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin privileges required',
  })
  @Get()
  @Roles([RoleTypes.ADMIN])
  @UseGuards(AuthGuard, RolesGuard)
  async getAllCoupons(@Query() query: QueryCouponDTO) {
    return await this.couponService.getAllCoupons(query);
  }

  @ApiOperation({
    summary: 'Get coupon by ID',
    description:
      'Retrieve a specific coupon by its ID. Requires admin privileges.',
  })
  @ApiParam({ name: 'couponId', description: 'Coupon ID to retrieve' })
  @ApiBearerAuth('JWT')
  @ApiResponse({ status: 200, description: 'Coupon retrieved successfully' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin privileges required',
  })
  @ApiResponse({ status: 404, description: 'Coupon not found' })
  @Get(':couponId')
  @Roles([RoleTypes.ADMIN])
  @UseGuards(AuthGuard, RolesGuard)
  async getCouponById(@Param() params: ParamCouponDTO) {
    return await this.couponService.getCouponById(params);
  }

  // User endpoints
  @ApiOperation({
    summary: 'Get coupon details by code',
    description:
      'Retrieve coupon details using coupon code. Public endpoint for users.',
  })
  @ApiParam({
    name: 'couponCode',
    description: 'Coupon code to retrieve details for',
  })
  @ApiResponse({
    status: 200,
    description: 'Coupon details retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Coupon not found or expired' })
  @Get('details/:couponCode')
  async getCouponDetails(@Param('couponCode') couponCode: string) {
    return await this.couponService.getCouponDetails(couponCode);
  }

  @ApiOperation({
    summary: 'Validate coupon',
    description:
      'Validate a coupon for use in an order. Public endpoint for users.',
  })
  @ApiResponse({ status: 200, description: 'Coupon validation result' })
  @ApiResponse({ status: 400, description: 'Invalid coupon data' })
  @ApiResponse({ status: 404, description: 'Coupon not found or expired' })
  @Post('validate')
  async validateCoupon(@Body() body: ValidateCouponDTO) {
    return await this.couponService.validateCoupon(body);
  }
}
