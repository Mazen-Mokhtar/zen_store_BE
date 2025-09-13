import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import { UserRepository } from 'src/DB/models/User/user.repository';
import { TUser } from 'src/DB/models/User/user.schema';

@Injectable()
export class userService {
  constructor(private readonly userRepository: UserRepository) {}
  getProfile(user: TUser) {
    return {
      success: true,
      data: {
        id: user._id,
        userName: user.userName,
        email: user.email,
        phone: user.phone,
        profileImage: user.profileImage,
        role: user.role,
        points: user.points,
      },
    };
  }
}
