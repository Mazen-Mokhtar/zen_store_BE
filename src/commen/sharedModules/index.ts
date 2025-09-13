import { Module } from '@nestjs/common';
import { UserModel } from 'src/DB/models/User/user.model';
import { RolesGuard } from '../Guards/role.guard';

import { TokenService } from '../jwt';
import { UserRepository } from 'src/DB/models/User/user.repository';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [UserModel],
  providers: [RolesGuard, TokenService, UserRepository, JwtService],
  exports: [RolesGuard, TokenService, UserRepository, JwtService, UserModel],
})
export class SharedModule {}
