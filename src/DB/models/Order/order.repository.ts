import { DBService } from "../db.service";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Order, OrderDocument } from "./order.schema";

export class OrderRepository extends DBService<OrderDocument> {
    constructor(@InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>) {
        super(orderModel)
    }
}