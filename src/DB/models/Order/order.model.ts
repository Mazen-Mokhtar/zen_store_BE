import { MongooseModule } from '@nestjs/mongoose';
import { Order, orderSchema } from './order.schema';

export const orderModel = MongooseModule.forFeature([
  { name: Order.name, schema: orderSchema },
]);
