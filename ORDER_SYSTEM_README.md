# Order System Documentation

## Overview
This order system allows users to create orders for games and packages, with support for different payment methods and admin management.

## Features

### User Features
- **Create Order**: Users can create orders by selecting a game, package, and providing account information
- **View Orders**: Users can view their order history
- **Order Details**: Users can view detailed information about specific orders
- **Checkout**: Users can proceed to payment for card-based orders
- **Cancel Order**: Users can cancel pending or paid orders

### Admin Features
- **View All Orders**: Admins can view and filter all orders
- **Order Statistics**: Admins can view order statistics and revenue
- **Update Order Status**: Admins can update order status (pending, paid, delivered, rejected)
- **Order Details**: Admins can view detailed order information

## API Endpoints

### User Endpoints
- `POST /order` - Create a new order
- `GET /order` - Get user's orders
- `GET /order/:orderId` - Get order details
- `POST /order/:orderId/checkout` - Proceed to checkout (card payment)
- `PATCH /order/:orderId/cancel` - Cancel order

### Admin Endpoints
- `GET /order/admin/all` - Get all orders (with filtering)
- `GET /order/admin/stats` - Get order statistics
- `GET /order/admin/:orderId` - Get order details (admin view)
- `PATCH /order/admin/:orderId/status` - Update order status

### Webhook
- `POST /order/webhook` - Stripe webhook for payment confirmation

## Order Flow

1. **Order Creation**: User selects game, package, and provides account information
2. **Validation**: System validates game, package, and account information
3. **Payment**: User proceeds to payment (card or cash)
4. **Confirmation**: Payment is confirmed via webhook
5. **Delivery**: Admin marks order as delivered
6. **Completion**: Order is completed

## Data Structure

### Order Schema
```typescript
{
  userId: ObjectId,           // Reference to user
  gameId: ObjectId,           // Reference to game
  packageId: ObjectId,        // Reference to package
  accountInfo: [              // Account information fields
    { fieldName: string, value: string }
  ],
  status: OrderStatus,        // pending, paid, delivered, rejected
  paymentMethod: string,      // card, cash
  totalAmount: number,        // Total order amount
  adminNote: string,          // Admin notes
  paidAt: Date,              // Payment date
  refundAmount: number,       // Refund amount if applicable
  refundDate: Date,          // Refund date if applicable
  intent: string             // Stripe payment intent ID
}
```

### Order Status Flow
- `PENDING` → `PAID` → `DELIVERED`
- `PENDING` → `REJECTED` (cancelled)
- `PAID` → `REJECTED` (refunded)

## Payment Methods
- **Card**: Processed through Stripe
- **Cash**: Manual payment confirmation by admin

## Security
- All endpoints require authentication
- User endpoints require "user" role
- Admin endpoints require "admin" role
- Order access is restricted to order owner or admin

## Integration
The order system integrates with:
- **Game System**: Validates games and packages
- **User System**: Manages user authentication and roles
- **Stripe Service**: Handles card payments
- **Account Validation**: Validates account information against game requirements 