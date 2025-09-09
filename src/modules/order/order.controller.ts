import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards, UsePipes, ValidationPipe, Query, UseInterceptors, UploadedFile } from "@nestjs/common";
import { FileInterceptor } from '@nestjs/platform-express';
import { OrderService } from './order.service';
import { User } from "src/commen/Decorator/user.decorator";
import { TUser } from "src/DB/models/User/user.schema";
import { CreateOrderDTO, OrderIdDTO, UpdateOrderStatusDTO, AdminOrderQueryDTO, WalletTransferDTO, WalletTransferImageDTO } from "./dto";
import { Roles } from "src/commen/Decorator/roles.decorator";
import { AuthGuard } from "src/commen/Guards/auth.guard";
import { RolesGuard } from "src/commen/Guards/role.guard";
import { Request } from "express";
import { Types } from "mongoose";
import { RoleTypes } from "src/DB/models/User/user.schema";
import { cloudMulter } from "src/commen/multer/cloud.multer";

@UsePipes(new ValidationPipe({ whitelist: false, transform: true }))
@Controller("order")
export class OrderController {
    constructor(private readonly orderService: OrderService) { }

    @Get("admin/stats")
    @Roles([RoleTypes.ADMIN, RoleTypes.SUPER_ADMIN])
    @UseGuards(AuthGuard, RolesGuard)
    async getOrderStats() {
        return await this.orderService.getOrderStats();
    }

    @Get("/")
    @UseGuards(AuthGuard)
    async getOrders(@User() user: TUser) {
        return await this.orderService.getUserOrders(user._id);
    }

    @Get("admin/all")
    @Roles([RoleTypes.ADMIN, RoleTypes.SUPER_ADMIN])
    @UseGuards(AuthGuard, RolesGuard)
    async getAllOrders(@User() user: TUser, @Query() query: AdminOrderQueryDTO) {
        return await this.orderService.getAllOrders(query, user);
    }

    @Post("/")
    @UseGuards(AuthGuard)
    async createOrder(@User() user: TUser, @Body() body: CreateOrderDTO) {
        return await this.orderService.createOrder(user, body);
    }

    @Post("/webhook")
    async webhook(@Req() req: Request) {
        return await this.orderService.webhook(req);
    }

    @Post("/:orderId/checkout")
    @Roles(["user", RoleTypes.SUPER_ADMIN, RoleTypes.ADMIN])
    @UseGuards(AuthGuard, RolesGuard)
    async checkout(@User() user: TUser, @Param() param: OrderIdDTO) {
        return await this.orderService.checkout(user, param.orderId);
    }

    @Patch("/:orderId/cancel")
    @Roles([RoleTypes.SUPER_ADMIN])
    @UseGuards(AuthGuard, RolesGuard)
    async cancelOrder(@User() user: TUser, @Param() param: OrderIdDTO) {
        return await this.orderService.cancelOrder(user, param.orderId);
    }
    
    @Get(':orderId')
    @Roles(["user"])
    @UseGuards(AuthGuard, RolesGuard)
    async getOrderDetails(@User() user: TUser, @Param() params: OrderIdDTO) {
        const orderId = new Types.ObjectId(params.orderId);
        return this.orderService.getOrderDetails(user, orderId);
    }

    // Admin Dashboard Endpoints
    @Get("admin/:orderId")
    @Roles([RoleTypes.ADMIN, RoleTypes.SUPER_ADMIN])
    @UseGuards(AuthGuard, RolesGuard)
    async getOrderById(@User() user: TUser, @Param() params: OrderIdDTO) {
        const orderId = new Types.ObjectId(params.orderId);
        return await this.orderService.getOrderById(orderId, user);
    }

    @Patch("admin/:orderId/status")
    @Roles([RoleTypes.ADMIN, RoleTypes.SUPER_ADMIN])
    @UseGuards(AuthGuard, RolesGuard)
    async updateOrderStatus(@User() admin: TUser, @Param() params: OrderIdDTO, @Body() body: UpdateOrderStatusDTO) {
        const orderId = new Types.ObjectId(params.orderId);
        return await this.orderService.updateOrderStatus(admin, orderId, body);
    }

    // Wallet Transfer Endpoints

    @Post(":orderId/wallet-transfer")
    @UseGuards(AuthGuard)
    @UseInterceptors(FileInterceptor('walletTransferImage', cloudMulter()))
    async submitWalletTransfer(
        @User() user: TUser,
        @Param() params: OrderIdDTO,
        @Body() walletTransferData: WalletTransferDTO,
        @UploadedFile() file: Express.Multer.File
    ) {
        return await this.orderService.submitWalletTransfer(
            user,
            new Types.ObjectId(params.orderId),
            walletTransferData,
            file
        );
    }

    @Get("admin/:orderId/wallet-transfer")
    @Roles([RoleTypes.ADMIN, RoleTypes.SUPER_ADMIN])
    @UseGuards(AuthGuard, RolesGuard)
    async getWalletTransferDetails(
        @User() admin: TUser,
        @Param() params: OrderIdDTO
    ) {
        return await this.orderService.getWalletTransferDetails(
            admin,
            new Types.ObjectId(params.orderId)
        );
    }
}
