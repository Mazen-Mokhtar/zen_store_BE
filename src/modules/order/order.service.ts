import { BadRequestException, Injectable } from "@nestjs/common";
import { OrderRepository } from "src/DB/models/Order/order.repository";
import { GameRepository } from "src/DB/models/Game/game.repository";
import { PackageRepository } from "src/DB/models/Packages/packages.repository";
import { TUser } from "src/DB/models/User/user.schema";
import { CreateOrderDTO, OrderIdDTO, UpdateOrderStatusDTO, AdminOrderQueryDTO } from "./dto";
import { OrderStatus } from "src/DB/models/Order/order.schema";
import { Types } from "mongoose";
import { StripeService } from "src/commen/service/stripe.service";
import { Request } from "express";
import { RoleTypes } from "src/DB/models/User/user.schema";

@Injectable()
export class OrderService {
    constructor(
        private readonly orderRepository: OrderRepository,
        private readonly gameRepository: GameRepository,
        private readonly packageRepository: PackageRepository,
        private readonly stripeService: StripeService
    ) { }

    async createOrder(user: TUser, body: CreateOrderDTO) {
        // Validate game exists and is active
        const game = await this.gameRepository.findOne({ 
            _id: body.gameId, 
            isActive: true, 
            isDeleted: { $ne: true } 
        });
        if (!game) {
            throw new BadRequestException("Game not found or inactive");
        }

        // Validate package exists and is active
        const packageItem = await this.packageRepository.findOne({ 
            _id: body.packageId, 
            gameId: body.gameId,
            isActive: true, 
            isDeleted: { $ne: true } 
        });
        if (!packageItem) {
            throw new BadRequestException("Package not found or inactive");
        }

        // Calculate total amount (use final price if offer exists, otherwise use regular price)
        const totalAmount = packageItem.isOffer && packageItem.finalPrice 
            ? packageItem.finalPrice 
            : packageItem.price;

        const order = await this.orderRepository.create({
            userId: user._id,
            gameId: body.gameId,
            packageId: body.packageId,
            accountInfo: body.accountInfo,
            paymentMethod: body.paymentMethod,
            totalAmount: totalAmount,
            status: OrderStatus.PENDING,
            adminNote: body.note
        });

        return { success: true, data: order };
    }

    async checkout(user: TUser, orderId: Types.ObjectId) {
        const order = await this.orderRepository.findOne({
            _id: orderId,
            userId: user._id,
            paymentMethod: 'card',
            status: OrderStatus.PENDING
        });

        if (!order) {
            throw new BadRequestException("Invalid order or order not found");
        }

        // Get game and package details for Stripe
        const game = await this.gameRepository.findById(order.gameId);
        const packageItem = await this.packageRepository.findById(order.packageId);

        if (!game || !packageItem) {
            throw new BadRequestException("Game or package not found");
        }

        const session = await this.stripeService.cheakoutSession({
            customer_email: user.email,
            line_items: [{
                quantity: 1,
                price_data: {
                    product_data: {
                        name: `${game.name} - ${packageItem.title}`
                    },
                    currency: packageItem.currency.toLowerCase(),
                    unit_amount: order.totalAmount * 100 // Convert to cents
                }
            }],
            metadata: { orderId: orderId.toString() }
        });

        return { success: true, data: session };
    }

    async webhook(req: Request) {
        const data = await this.stripeService.webhook(req);
        console.log({data});
        console.log(typeof data);
        if (typeof data === 'string') {
            return "Done";
        } else {
            await this.orderRepository.updateOne(
                { _id: data.orderId },
                {
                    status: OrderStatus.PAID,
                    paidAt: new Date()
                }
            );
        }
    }

    async cancelOrder(user: TUser, orderId: Types.ObjectId) {
        const order = await this.orderRepository.findOne({
            _id: orderId,
            userId: user._id,
            status: { $in: [OrderStatus.PENDING, OrderStatus.PAID] }
        });

        if (!order) {
            throw new BadRequestException("Invalid order or cannot cancel");
        }

        let refund = {};
        if (order.paymentMethod === 'card' && order.status === OrderStatus.PAID) {
            refund = { 
                refundAmount: order.totalAmount, 
                refundDate: new Date() 
            };
            // Note: You'll need to implement refund logic in StripeService
            // await this.stripeService.refund(order.intent as string);
        }

        await this.orderRepository.updateOne(
            { _id: orderId }, 
            { 
                status: OrderStatus.REJECTED, 
                adminNote: "Cancelled by user",
                ...refund 
            }
        );

        return { success: true, data: "Order cancelled successfully" };
    }

    async getUserOrders(userId: Types.ObjectId) {
        const orders = await this.orderRepository.findWithPopulate(
            { userId },
            "",
            { sort: { createdAt: -1 } },
            undefined,
            [
                { path: "gameId", select: "name image" },
                { path: "packageId", select: "title price" }
            ]
        );
        return { success: true, data: orders };
    }

    async getOrderDetails(user: TUser, orderId: Types.ObjectId) {
        const order = await this.orderRepository.findOneWithPopulate({
            _id: orderId,
            userId: user._id,
        }, "", {}, [
            { path: "gameId", select: "name description image" },
            { path: "packageId", select: "title price currency" }
        ]);

        if (!order) {
            throw new BadRequestException('Order not found or you do not have access to this order');
        }

        return { success: true, data: order };
    }

    // Admin Dashboard Methods
    async getAllOrders(query: AdminOrderQueryDTO, user?: TUser) {
        let filter: any = {};
        
        if (query.status) {
            filter.status = query.status;
        }

        const data = await this.orderRepository.findWithPopulate(
            filter,
            "",
            { sort: query.sort || { createdAt: -1 } },
            query.page,
            [
                { path: "userId", select: "name email phone" },
                { path: "gameId", select: "name" },
                { path: "packageId", select: "title" }
            ]
        );
        
        return { success: true, data };
    }

    async getOrderById(orderId: Types.ObjectId, user?: TUser) {
        const order = await this.orderRepository.findByIdWithPopulate(
            orderId, 
            "", 
            {},
            [
                { path: "userId", select: "name email phone" },
                { path: "gameId", select: "name description image" },
                { path: "packageId", select: "title price currency" }
            ]
        );

        if (!order) {
            throw new BadRequestException('Order not found');
        }

        return { success: true, data: order };
    }

    async updateOrderStatus(admin: TUser, orderId: Types.ObjectId, body: UpdateOrderStatusDTO) {
        const order = await this.orderRepository.findById(orderId);
        
        if (!order) {
            throw new BadRequestException('Order not found');
        }

        // Validate status transition
        if (order.status === OrderStatus.REJECTED) {
            throw new BadRequestException('Cannot update rejected order');
        }

        if (order.status === OrderStatus.DELIVERED && body.status !== OrderStatus.DELIVERED) {
            throw new BadRequestException('Cannot change status of delivered order');
        }

        const updateData: any = {
            status: body.status
        };

        if (body.adminNote) {
            updateData.adminNote = body.adminNote;
        }

        if (body.status === OrderStatus.REJECTED) {
            // Refund if order was paid
            if (order.paymentMethod === 'card' && order.status === OrderStatus.PAID) {
                updateData.refundAmount = order.totalAmount;
                updateData.refundDate = new Date();
                // Note: You'll need to implement refund logic in StripeService
                // await this.stripeService.refund(order.intent as string);
            }
        }

        await this.orderRepository.updateOne({ _id: orderId }, updateData);

        return { 
            success: true, 
            message: `Order status updated to ${body.status}`,
            data: { orderId, newStatus: body.status }
        };
    }

    async getOrderStats() {
        const stats = await this.orderRepository.aggregate([
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 },
                    totalAmount: { $sum: "$totalAmount" }
                }
            }
        ]);

        const totalOrders = await this.orderRepository.countDocuments();
        const totalRevenue = await this.orderRepository.aggregate([
            { $match: { status: { $in: [OrderStatus.PAID, OrderStatus.DELIVERED] } } },
            { $group: { _id: null, total: { $sum: "$totalAmount" } } }
        ]);

        return {
            success: true,
            data: {
                stats,
                totalOrders,
                totalRevenue: totalRevenue[0]?.total || 0
            }
        };
    }
}
