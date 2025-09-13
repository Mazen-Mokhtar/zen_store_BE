import { FilterQuery, Model, QueryOptions, Types, UpdateQuery } from 'mongoose';

export abstract class DBService<T> {
  constructor(protected readonly model: Model<T>) {}

  async create(document: Partial<T>) {
    return this.model.create(document as T);
  }

  async find(
    filter: FilterQuery<T> = {},
    { select }: { select?: string } = {}, // ✅ أسهل تحديد للحقول
    options?: QueryOptions & { sort?: any; limit?: number },
  ): Promise<T[]> {
    // Import security config
    const { SecurityConfig } = require('../../commen/config/security.config');

    // Apply default limit if not specified to prevent resource exhaustion
    const limit =
      options?.limit && options.limit > 0
        ? Math.min(options.limit, SecurityConfig.mongodb.maxQueryLimit)
        : SecurityConfig.mongodb.defaultQueryLimit;

    return this.model
      .find(filter, null, options)
      .select(select || '')
      .sort(options?.sort || {})
      .limit(limit);
  }

  async findOne(
    filter: FilterQuery<T>,
    { select }: { select?: string } = {},
    options?: QueryOptions,
  ): Promise<T | null> {
    return this.model.findOne(filter, null, options).select(select || '');
  }

  async findById(
    id: string | Types.ObjectId,
    { select }: { select?: string } = {},
    options?: QueryOptions,
  ): Promise<T | null> {
    return this.model.findById(id, null, options).select(select || '');
  }

  async findByIdAndUpdate(
    id: string | Types.ObjectId,
    update: UpdateQuery<T>,
    options: QueryOptions = { new: true },
    select?: { select: string },
  ): Promise<T | null> {
    return this.model
      .findByIdAndUpdate(id, update, options)
      .select(select || '');
  }

  async findByIdAndDelete(
    id: string | Types.ObjectId,
    options?: QueryOptions,
    { select }: { select?: string } = {},
  ): Promise<T | null> {
    return this.model.findByIdAndDelete(id, options).select(select || '');
  }

  async updateOne(
    filter: FilterQuery<T>,
    update: UpdateQuery<T>,
    options?: QueryOptions,
  ) {
    if (options?.session === null) {
      delete options.session; // احذف الـ session
    }
    return this.model.updateOne(filter, update, options as any);
  }
  async update(
    filter: FilterQuery<T>,
    update: UpdateQuery<T>,
    options?: QueryOptions,
  ) {
    if (options?.session === null) {
      delete options.session;
    }
    return this.model.updateMany(filter, update, options as any);
  }

  async count(filter: FilterQuery<T> = {}): Promise<number> {
    return this.model.countDocuments(filter);
  }

  async paginate(
    filter: FilterQuery<T> = {},
    page = 1,
    limit = 10,
    sort: any = { createdAt: -1 },
    { select }: { select?: string } = {},
  ): Promise<{
    data: T[];
    total: number;
    totalPages: number;
    currentPage: number;
  }> {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.model
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .select(select || ''),
      this.model.countDocuments(filter),
    ]);

    return {
      data,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    };
  }
}
