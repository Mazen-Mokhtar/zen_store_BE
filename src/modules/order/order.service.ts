import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { OrderRepository } from "src/DB/models/Order/order.repository";
import { GameRepository } from "src/DB/models/Game/game.repository";
import { PackageRepository } from "src/DB/models/Packages/packages.repository";
import { TUser } from "src/DB/models/User/user.schema";
import { CreateOrderDTO, OrderIdDTO, UpdateOrderStatusDTO, AdminOrderQueryDTO, WalletTransferDTO } from "./dto";
import { OrderStatus } from "src/DB/models/Order/order.schema";
import { GameType } from "src/DB/models/Game/game.schema";
import { Types } from "mongoose";
import { StripeService } from "src/commen/service/stripe.service";
import { Request } from "express";
import { RoleTypes } from "src/DB/models/User/user.schema";
import { EncryptionService } from "src/commen/service/encryption.service";
import { cloudService, IAttachments } from "src/commen/multer/cloud.service";

@Injectable()
export class OrderService {
    private readonly cloudService = new cloudService();
    private readonly encryptionService = new EncryptionService();

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

        // Additional validation for Steam games - ensure required account info fields are provided
        if (game.type === GameType.STEAM && game.accountInfoFields) {
            // Check for missing required fields
            const missingFields: string[] = [];
            for (const field of game.accountInfoFields) {
                if (field.isRequired) {
                    const fieldExists = body.accountInfo.some(
                        (info) => info.fieldName === field.fieldName && 
                                 info.value && 
                                 info.value.trim() !== ''
                    );
                    if (!fieldExists) {
                        missingFields.push(field.fieldName);
                    }
                }
            }

            if (missingFields.length > 0) {
                throw new BadRequestException(
                    `Missing required account fields for Steam game: ${missingFields.join(', ')}`
                );
            }

            // Validate email format for email fields
            const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
            for (const info of body.accountInfo) {
                const fieldNameLower = info.fieldName.toLowerCase();
                if (fieldNameLower.includes('email') || fieldNameLower.includes('gmail')) {
                    if (!emailRegex.test(info.value)) {
                        throw new BadRequestException(
                            `Invalid email format for field: ${info.fieldName}. Please provide a valid email address.`
                        );
                    }
                }
            }

            // Check for invalid fields
            const validFieldNames = game.accountInfoFields.map(field => field.fieldName);
            const invalidFields: string[] = [];
            for (const info of body.accountInfo) {
                if (!validFieldNames.includes(info.fieldName)) {
                    invalidFields.push(info.fieldName);
                }
            }

            if (invalidFields.length > 0) {
                throw new BadRequestException(
                    `Invalid account fields for this Steam game: ${invalidFields.join(', ')}. Valid fields are: ${validFieldNames.join(', ')}`
                );
            }
        }

        // Validation logic based on game type
        let packageItem: any = null;
        if (game.type === GameType.STEAM) {
            // Steam games don't use packages - they are sold directly
            if (body.packageId) {
                throw new BadRequestException("Steam games cannot have packages");
            }
            // Steam games must have a direct price
            if (game.price === undefined || game.price === null) {
                throw new BadRequestException("Steam game must have a price");
            }
        } else {
            // Non-Steam games always require packages (physical items, gift cards, etc.)
            if (!body.packageId) {
                throw new BadRequestException("Package is required for non-Steam games");
            }
            packageItem = await this.packageRepository.findOne({ 
                _id: body.packageId, 
                gameId: body.gameId,
                isActive: true, 
                isDeleted: { $ne: true } 
            });
            if (!packageItem) {
                throw new BadRequestException("Package not found or inactive");
            }
        }

        // Calculate total amount based on game type and offers
        let totalAmount: number;
        
        if (game.type === GameType.STEAM) {
            // For Steam games, prioritize game pricing over package pricing
            if (game.isOffer && game.finalPrice) {
                // Use game's offer price
                totalAmount = game.finalPrice;
            } else if (game.price !== undefined && game.price !== null) {
                // Use game's regular price
                totalAmount = game.price;
            } else if (packageItem && packageItem.isOffer && packageItem.finalPrice) {
                // Use package's offer price as fallback
                totalAmount = packageItem.finalPrice;
            } else if (packageItem) {
                // Use package's regular price as final fallback
                totalAmount = packageItem.price;
            } else {
                throw new BadRequestException("Unable to determine price for this Steam game");
            }
        } else {
            // For non-Steam games, use package pricing
            totalAmount = packageItem && packageItem.isOffer && packageItem.finalPrice 
                ? packageItem.finalPrice 
                : packageItem.price;
        }

        const orderData: any = {
            userId: user._id,
            gameId: body.gameId,
            accountInfo: body.accountInfo,
            paymentMethod: body.paymentMethod,
            totalAmount: totalAmount,
            status: OrderStatus.PENDING,
            adminNote: body.note
        };

        // Only add packageId if it exists
        if (body.packageId) {
            orderData.packageId = body.packageId;
        }

        const order = await this.orderRepository.create(orderData);

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

        // Get game details for Stripe
        const game = await this.gameRepository.findById(order.gameId);
        if (!game) {
            throw new BadRequestException("Game not found");
        }

        // Get package details if packageId exists
        let packageItem: any = null;
        if (order.packageId) {
            packageItem = await this.packageRepository.findById(order.packageId);
            if (!packageItem) {
                throw new BadRequestException("Package not found");
            }
        }

        // Determine product name and currency
        const productName = packageItem 
            ? `${game.name} - ${packageItem.title}`
            : game.name;
        
        const currency = packageItem 
            ? packageItem.currency.toLowerCase()
            : 'usd'; // Default currency for Steam games without packages

        const session = await this.stripeService.cheakoutSession({
            customer_email: user.email,
            line_items: [{
                quantity: 1,
                price_data: {
                    product_data: {
                        name: productName
                    },
                    currency: currency,
                    unit_amount: order.totalAmount * 100 // Convert to cents
                }
            }],
            metadata: { orderId: orderId.toString() }
        });

        return { success: true, data: session };
    }

    async webhook(req: Request) {
        const data = await this.stripeService.webhook(req);

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
                { path: "gameId", select: "name image type" },
                { path: "packageId", select: "title price", match: { _id: { $ne: null } } }
            ]
        );
        return { success: true, data: orders };
    }

    async getOrderDetails(user: TUser, orderId: Types.ObjectId) {
        const order = await this.orderRepository.findOneWithPopulate({
            _id: orderId,
            userId: user._id,
        }, "", {}, [
            { path: "gameId", select: "name description image type price" },
            { path: "packageId", select: "title price currency", match: { _id: { $ne: null } } }
        ]);

        if (!order) {
            throw new BadRequestException('Order not found or you do not have access to this order');
        }

        return { success: true, data: order };
    }

    // Admin Dashboard Methods
    async getAllOrders(query: AdminOrderQueryDTO, user?: TUser) {
        let filter: any = {};
        console.log({query})
        // Status filter
        if (query.status) {
            filter.status = query.status;
        }

        // Payment status filter
        if (query.paymentStatus) {
            filter.paymentStatus = query.paymentStatus;
        }

        // Date range filter
        if (query.startDate || query.endDate) {
            filter.createdAt = {};
            if (query.startDate) {
                filter.createdAt.$gte = new Date(query.startDate);
            }
            if (query.endDate) {
                filter.createdAt.$lte = new Date(query.endDate);
            }
        }

        // Search filter
        if (query.search) {
            const searchRegex = new RegExp(query.search, 'i');
            filter.$or = [
                { 'userId.name': searchRegex },
                { 'userId.email': searchRegex },
                { 'gameId.name': searchRegex },
                { 'packageId.title': searchRegex }
            ];
        }

        // Pagination parameters
        const page = query.page || 1;
        const limit = query.limit || 20;
        const skip = (page - 1) * limit;

        // Sort configuration
        let sortConfig: any = { createdAt: -1 }; // Default sort
        if (query.sortBy) {
            const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
            sortConfig = { [query.sortBy]: sortOrder };
        }

        // Get total count for pagination
        const total = await this.orderRepository.count(filter);

        // Get paginated data
        const orders = await this.orderRepository.findWithPopulate(
            filter,
            "",
            { 
                sort: sortConfig, 
                isAdminRequest: true,
                skip: skip,
                limit: limit
            },
            undefined, // Don't use the old page parameter
            [
                { path: "userId", select: "name email phone" },
                { path: "gameId", select: "name type" },
                { path: "packageId", select: "title", match: { _id: { $ne: null } } }
            ]
        );

        // Calculate pagination info
        const totalPages = Math.ceil(total / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;
        
        return { 
            success: true, 
            data: orders,
            pagination: {
                currentPage: page,
                totalPages,
                totalItems: total,
                itemsPerPage: limit,
                hasNextPage,
                hasPrevPage
            }
        };
    }

    async getOrderById(orderId: Types.ObjectId, user?: TUser) {
        const order = await this.orderRepository.findByIdWithPopulate(
            orderId, 
            "", 
            { isAdminRequest: true },
            [
                { path: "userId", select: "name email phone" },
                { path: "gameId", select: "name description image type price" },
                { path: "packageId", select: "title price currency", match: { _id: { $ne: null } } }
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

    /**
     * Upload wallet transfer image and submit transfer details
     * @param user - The user submitting the wallet transfer
     * @param orderId - The order ID
     * @param walletTransferData - Wallet transfer details
     * @param file - The uploaded wallet transfer image
     * @returns Updated order with wallet transfer information
     */
    async submitWalletTransfer(
        user: TUser,
        orderId: Types.ObjectId,
        walletTransferData: WalletTransferDTO,
        file: Express.Multer.File
    ) {
        // Validate order exists and belongs to user
        const order = await this.orderRepository.findOne({
            _id: orderId,
            userId: user._id,
            paymentMethod: { $in: ['wallet-transfer', 'insta-transfer', 'fawry-transfer'] },
            status: OrderStatus.PENDING
        });

        if (!order) {
            throw new NotFoundException('Order not found or not eligible for wallet transfer');
        }

        // Validate nameOfInsta based on payment method
        if (order.paymentMethod === 'insta-transfer') {
            if (!walletTransferData.nameOfInsta || walletTransferData.nameOfInsta.trim().length === 0) {
                throw new BadRequestException('Instagram name is required for insta-transfer payment method');
            }
        } else {
            if (walletTransferData.nameOfInsta) {
                throw new BadRequestException('Instagram name should not be provided for non-insta-transfer payment methods');
            }
        }

        // Validate file type and size
        if (!file) {
            throw new BadRequestException('Wallet transfer image is required');
        }

        try {
            // Generate folder ID for organizing uploads
            const folderId = `wallet-transfer-${orderId}`;

            // Upload image to cloud storage
            const uploadResult = await this.cloudService.uploadFile(
                file,
                { folder: `orders/${folderId}` }
            );

            // Encrypt the wallet transfer number
            const encryptedNumber = this.encryptionService.encrypt(walletTransferData.walletTransferNumber);
            
            // Prepare update data
            const updateData: any = {
                walletTransferImage: {
                    secure_url: uploadResult.secure_url,
                    public_id: uploadResult.public_id
                },
                walletTransferNumber: encryptedNumber,
                walletTransferSubmittedAt: new Date(),
                status: OrderStatus.PROCESSING,
            };
            
            // If it's insta-transfer, encrypt and save nameOfInsta
            if (order.paymentMethod === 'insta-transfer' && walletTransferData.nameOfInsta) {
                updateData.nameOfInsta = this.encryptionService.encrypt(walletTransferData.nameOfInsta);
                updateData.instaTransferSubmittedAt = new Date();
            }

            // Update order with wallet transfer information
            const updatedOrder = await this.orderRepository.findByIdAndUpdate(
                orderId,
                { $set: updateData },
                { new: true }
            );

            if (!updatedOrder) {
                throw new BadRequestException('Failed to update order with wallet transfer details');
            }

            const responseData: any = {
                orderId: updatedOrder._id,
                status: updatedOrder.status,
                walletTransferSubmittedAt: updatedOrder.walletTransferSubmittedAt,
                maskedNumber: this.encryptionService.maskData(
                    walletTransferData.walletTransferNumber,
                    'phone'
                )
            };
            
            // Add masked Instagram name if it's insta-transfer
            if (order.paymentMethod === 'insta-transfer' && walletTransferData.nameOfInsta) {
                responseData.maskedInstaName = this.encryptionService.maskData(
                    walletTransferData.nameOfInsta,
                    'instagram'
                );
                responseData.instaTransferSubmittedAt = updatedOrder.instaTransferSubmittedAt;
            }
            
            return {
                success: true,
                message: 'Transfer details submitted successfully. Your order is being reviewed.',
                data: responseData
            };
        } catch (error) {
            throw new BadRequestException(`Failed to submit wallet transfer: ${error.message}`);
        }
    }

    /**
     * Get wallet transfer details for admin review
     * @param admin - The admin user
     * @param orderId - The order ID
     * @returns Decrypted wallet transfer details
     */
    async getWalletTransferDetails(admin: TUser, orderId: Types.ObjectId) {
        // Verify admin permissions
        if (admin.role !== RoleTypes.ADMIN && admin.role !== RoleTypes.SUPER_ADMIN) {
            throw new BadRequestException('Insufficient permissions');
        }

        const order = await this.orderRepository.findOne({
            _id: orderId,
            paymentMethod: { $in: ['wallet-transfer', 'insta-transfer'] },
            walletTransferNumber: { $exists: true }
        }, {}, { isAdminRequest: true });
        
        if (!order) {
            throw new NotFoundException('Wallet transfer order not found');
        }

        if (!order.walletTransferNumber) {
            throw new BadRequestException('Wallet transfer number not found');
        }

        try {
            // Decrypt the wallet transfer number for admin review
            const decryptedNumber = this.encryptionService.decrypt(order.walletTransferNumber);
            
            const responseData: any = {
                orderId: order._id,
                userId: order.userId,
                paymentMethod: order.paymentMethod,
                walletTransferImage: order.walletTransferImage,
                walletTransferNumber: decryptedNumber,
                walletTransferSubmittedAt: order.walletTransferSubmittedAt,
                orderStatus: order.status,
                totalAmount: order.totalAmount
            };
            
            // Add decrypted Instagram name if it's insta-transfer
            if (order.paymentMethod === 'insta-transfer' && order.nameOfInsta) {
                responseData.nameOfInsta = this.encryptionService.decrypt(order.nameOfInsta);
                responseData.instaTransferSubmittedAt = order.instaTransferSubmittedAt;
            }

            return {
                success: true,
                data: responseData
            };
        } catch (error) {
            throw new BadRequestException(`Failed to retrieve transfer details: ${error.message}`);
        }
    }
}
