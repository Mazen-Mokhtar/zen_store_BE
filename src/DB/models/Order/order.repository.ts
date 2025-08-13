import { DBService } from "../db.service";
import { InjectModel } from "@nestjs/mongoose";
import { Model, PipelineStage } from "mongoose";
import { Order, OrderDocument } from "./order.schema";

export class OrderRepository extends DBService<OrderDocument> {
    constructor(@InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>) {
        super(orderModel)
    }

    // Find with population support
    async findWithPopulate(
        filter: any = {},
        select: string = "",
        options: any = {},
        page?: number,
        populate?: any[]
    ): Promise<OrderDocument[]> {
        let query = this.orderModel.find(filter).select(select);

        // Apply sorting
        if (options.sort) {
            query = query.sort(options.sort);
        }

        // Import security config
        const { SecurityConfig } = require('../../../commen/config/security.config');
        
        // Apply pagination with default and maximum limits from config
        if (page && page > 0) {
            // If limit is provided, ensure it doesn't exceed maxPageSize
            const limit = options.limit ? 
                Math.min(options.limit, SecurityConfig.mongodb.maxPageSize) : 
                SecurityConfig.mongodb.defaultPageSize;
            const skip = (page - 1) * limit;
            query = query.skip(skip).limit(limit);
        } else {
            // Even without pagination, apply a default limit to prevent resource exhaustion
            query = query.limit(options.limit ? 
                Math.min(options.limit, SecurityConfig.mongodb.maxQueryLimit) : 
                SecurityConfig.mongodb.defaultQueryLimit);
        }

        // Apply population
        if (populate && populate.length > 0) {
            populate.forEach(pop => {
                query = query.populate(pop);
            });
        }

        return query.exec();
    }

    // FindOne with population support
    async findOneWithPopulate(
        filter: any,
        select: string = "",
        options: any = {},
        populate?: any[]
    ): Promise<OrderDocument | null> {
        let query = this.orderModel.findOne(filter).select(select);

        // Apply options
        if (options) {
            query = query.setOptions(options);
        }

        // Apply population
        if (populate && populate.length > 0) {
            populate.forEach(pop => {
                query = query.populate(pop);
            });
        }

        return query.exec();
    }

    // FindById with population support
    async findByIdWithPopulate(
        id: string | any,
        select: string = "",
        options: any = {},
        populate?: any[]
    ): Promise<OrderDocument | null> {
        let query = this.orderModel.findById(id).select(select);

        // Apply options
        if (options) {
            query = query.setOptions(options);
        }

        // Apply population
        if (populate && populate.length > 0) {
            populate.forEach(pop => {
                query = query.populate(pop);
            });
        }

        return query.exec();
    }

    // Aggregate method
    async aggregate(pipeline: PipelineStage[]): Promise<any[]> {
        return this.orderModel.aggregate(pipeline);
    }

    // Count documents method
    async countDocuments(filter: any = {}): Promise<number> {
        return this.orderModel.countDocuments(filter);
    }
}