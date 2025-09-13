import { Injectable } from '@nestjs/common';
import { DBService } from '../db.service';
import { TUser, User } from './user.schema';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, ProjectionType, QueryOptions } from 'mongoose';

@Injectable()
export class UserRepository extends DBService<TUser> {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<TUser>,
  ) {
    super(userModel);
  }
  findByEmail(
    filter: FilterQuery<TUser>,
    projection?: ProjectionType<TUser>,
    options?: QueryOptions,
  ) {
    return this.userModel.findOne(filter, projection, options);
  }
}
