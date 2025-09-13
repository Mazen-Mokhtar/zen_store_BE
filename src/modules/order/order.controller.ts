import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
  Query,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiHeader,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { OrderService } from './order.service';
import { User } from 'src/commen/Decorator/user.decorator';
import { TUser } from 'src/DB/models/User/user.schema';
import {
  CreateOrderDTO,
  OrderIdDTO,
  UpdateOrderStatusDTO,
  AdminOrderQueryDTO,
  WalletTransferDTO,
  WalletTransferImageDTO,
  UserOrderQueryDTO,
} from './dto';
import { Roles } from 'src/commen/Decorator/roles.decorator';
import { AuthGuard } from 'src/commen/Guards/auth.guard';
import { RolesGuard } from 'src/commen/Guards/role.guard';
import { Request } from 'express';
import { Types } from 'mongoose';
import { RoleTypes } from 'src/DB/models/User/user.schema';
import { cloudMulter } from 'src/commen/multer/cloud.multer';
import {
  ApiVersion,
  VersionedEndpoint,
} from 'src/commen/Decorator/api-version.decorator';

@ApiTags('Orders')
@ApiHeader({
  name: 'X-API-Version',
  description: 'API Version (v1 or v2)',
  required: false,
})
@UsePipes(new ValidationPipe({ whitelist: false, transform: true }))
@Controller('order')
@ApiVersion('v1', 'v2')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @ApiOperation({
    summary: 'Get order statistics',
    description:
      'Retrieve order statistics for admin dashboard. Requires admin privileges.',
  })
  @ApiBearerAuth('JWT')
  @ApiResponse({
    status: 200,
    description: 'Order statistics retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin privileges required',
  })
  @Get('admin/stats')
  @Roles([RoleTypes.ADMIN, RoleTypes.SUPER_ADMIN])
  @UseGuards(AuthGuard, RolesGuard)
  async getOrderStats() {
    return await this.orderService.getOrderStats();
  }

  @ApiOperation({
    summary: 'Get user orders',
    description:
      'Retrieve orders for the authenticated user with optional filtering and pagination.',
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
    description: 'Filter by order status',
  })
  @ApiBearerAuth('JWT')
  @ApiResponse({
    status: 200,
    description: 'User orders retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @Get('/')
  @UseGuards(AuthGuard)
  @ApiVersion('v1', 'v2')
  async getOrders(@User() user: TUser, @Query() query: UserOrderQueryDTO) {
    return await this.orderService.getUserOrders(user._id, query);
  }

  @ApiOperation({
    summary: 'Get all orders (Admin)',
    description:
      'Retrieve all orders with filtering and pagination. Requires admin privileges.',
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
    description: 'Filter by order status',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'Filter by user ID',
  })
  @ApiBearerAuth('JWT')
  @ApiResponse({
    status: 200,
    description: 'All orders retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin privileges required',
  })
  @Get('admin/all')
  @Roles([RoleTypes.ADMIN, RoleTypes.SUPER_ADMIN])
  @UseGuards(AuthGuard, RolesGuard)
  async getAllOrders(@User() user: TUser, @Query() query: AdminOrderQueryDTO) {
    return await this.orderService.getAllOrders(query, user);
  }

  @ApiOperation({
    summary: 'Create new order',
    description:
      'Create a new order for the authenticated user. Supports coupon application via couponCode field.',
  })
  @ApiBearerAuth('JWT')
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  @ApiResponse({
    status: 400,
    description: 'Invalid order data or insufficient funds',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({ status: 404, description: 'Product or package not found' })
  @Post('/')
  @UseGuards(AuthGuard)
  @VersionedEndpoint({
    versions: ['v1', 'v2'],
  })
  async createOrder(@User() user: TUser, @Body() body: CreateOrderDTO) {
    // يدعم تطبيق الكوبونات عبر حقل couponCode في CreateOrderDTO
    return await this.orderService.createOrder(user, body);
  }

  @ApiOperation({
    summary: 'Payment webhook',
    description: 'Handle payment webhook notifications from payment providers.',
  })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid webhook data' })
  @Post('/webhook')
  async webhook(@Req() req: Request) {
    return await this.orderService.webhook(req);
  }

  @ApiOperation({
    summary: 'Checkout order',
    description:
      'Process checkout for an existing order. Supports previously applied coupons.',
  })
  @ApiParam({ name: 'orderId', description: 'Order ID to checkout' })
  @ApiBearerAuth('JWT')
  @ApiResponse({ status: 200, description: 'Checkout processed successfully' })
  @ApiResponse({
    status: 400,
    description: 'Invalid order or insufficient funds',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - User role required' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @Post('/:orderId/checkout')
  @Roles(['user', RoleTypes.SUPER_ADMIN, RoleTypes.ADMIN])
  @UseGuards(AuthGuard, RolesGuard)
  async checkout(@User() user: TUser, @Param() param: OrderIdDTO) {
    // يدعم الكوبونات المطبقة مسبقاً على الطلب
    return await this.orderService.checkout(user, param.orderId);
  }

  @ApiOperation({
    summary: 'Cancel order',
    description: 'Cancel an existing order. Requires super admin privileges.',
  })
  @ApiParam({ name: 'orderId', description: 'Order ID to cancel' })
  @ApiBearerAuth('JWT')
  @ApiResponse({ status: 200, description: 'Order cancelled successfully' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Super admin privileges required',
  })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @ApiResponse({ status: 400, description: 'Order cannot be cancelled' })
  @Patch('/:orderId/cancel')
  @Roles([RoleTypes.SUPER_ADMIN])
  @UseGuards(AuthGuard, RolesGuard)
  async cancelOrder(@User() user: TUser, @Param() param: OrderIdDTO) {
    return await this.orderService.cancelOrder(user, param.orderId);
  }

  @ApiOperation({
    summary: 'Get order details',
    description:
      'Retrieve detailed information about a specific order for the authenticated user.',
  })
  @ApiParam({
    name: 'orderId',
    description: 'Order ID to retrieve details for',
  })
  @ApiBearerAuth('JWT')
  @ApiResponse({
    status: 200,
    description: 'Order details retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - User role required' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @Get(':orderId')
  @Roles(['user'])
  @UseGuards(AuthGuard, RolesGuard)
  async getOrderDetails(@User() user: TUser, @Param() params: OrderIdDTO) {
    const orderId = new Types.ObjectId(params.orderId);
    return this.orderService.getOrderDetails(user, orderId);
  }

  // Admin Dashboard Endpoints
  @ApiOperation({
    summary: 'Get order by ID (Admin)',
    description:
      'Retrieve detailed information about any order by ID. Requires admin privileges.',
  })
  @ApiParam({ name: 'orderId', description: 'Order ID to retrieve' })
  @ApiBearerAuth('JWT')
  @ApiResponse({
    status: 200,
    description: 'Order details retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin privileges required',
  })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @Get('admin/:orderId')
  @Roles([RoleTypes.ADMIN, RoleTypes.SUPER_ADMIN])
  @UseGuards(AuthGuard, RolesGuard)
  async getOrderById(@User() user: TUser, @Param() params: OrderIdDTO) {
    const orderId = new Types.ObjectId(params.orderId);
    return await this.orderService.getOrderById(orderId, user);
  }

  @ApiOperation({
    summary: 'Update order status (Admin)',
    description: 'Update the status of an order. Requires admin privileges.',
  })
  @ApiParam({ name: 'orderId', description: 'Order ID to update status for' })
  @ApiBearerAuth('JWT')
  @ApiResponse({
    status: 200,
    description: 'Order status updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid status or order data' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin privileges required',
  })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @Patch('admin/:orderId/status')
  @Roles([RoleTypes.ADMIN, RoleTypes.SUPER_ADMIN])
  @UseGuards(AuthGuard, RolesGuard)
  async updateOrderStatus(
    @User() admin: TUser,
    @Param() params: OrderIdDTO,
    @Body() body: UpdateOrderStatusDTO,
  ) {
    const orderId = new Types.ObjectId(params.orderId);
    return await this.orderService.updateOrderStatus(admin, orderId, body);
  }

  // Wallet Transfer Endpoints

  @ApiOperation({
    summary: 'Submit wallet transfer',
    description:
      'Submit wallet transfer details with image proof for order payment. Supports displaying applied coupon information in response.',
  })
  @ApiParam({ name: 'orderId', description: 'Order ID for wallet transfer' })
  @ApiConsumes('multipart/form-data')
  @ApiBearerAuth('JWT')
  @ApiResponse({
    status: 200,
    description: 'Wallet transfer submitted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid transfer data or missing image',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @Post(':orderId/wallet-transfer')
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('walletTransferImage', cloudMulter()))
  async submitWalletTransfer(
    @User() user: TUser,
    @Param() params: OrderIdDTO,
    @Body() walletTransferData: WalletTransferDTO,
    @UploadedFile() file: Express.Multer.File,
  ) {
    // يدعم عرض معلومات الكوبونات المطبقة في الاستجابة
    return await this.orderService.submitWalletTransfer(
      user,
      new Types.ObjectId(params.orderId),
      walletTransferData,
      file,
    );
  }

  @ApiOperation({
    summary: 'Get wallet transfer details (Admin)',
    description:
      'Retrieve wallet transfer details for a specific order. Requires admin privileges.',
  })
  @ApiParam({
    name: 'orderId',
    description: 'Order ID to get wallet transfer details for',
  })
  @ApiBearerAuth('JWT')
  @ApiResponse({
    status: 200,
    description: 'Wallet transfer details retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin privileges required',
  })
  @ApiResponse({
    status: 404,
    description: 'Order or wallet transfer not found',
  })
  @Get('admin/:orderId/wallet-transfer')
  @Roles([RoleTypes.ADMIN, RoleTypes.SUPER_ADMIN])
  @UseGuards(AuthGuard, RolesGuard)
  async getWalletTransferDetails(
    @User() admin: TUser,
    @Param() params: OrderIdDTO,
  ) {
    return await this.orderService.getWalletTransferDetails(
      admin,
      new Types.ObjectId(params.orderId),
    );
  }
}
