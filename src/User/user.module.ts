import { Module } from '@nestjs/common';
import { userController } from './user.controller';
import { userService } from './user.service';
import { UserRepository } from 'src/DB/models/User/user.repository';
import { UserModel } from 'src/DB/models/User/user.model';
import { AuthGuard } from 'src/commen/Guards/auth.guard';
import { TokenService } from 'src/commen/jwt';
import { JwtService } from '@nestjs/jwt';
import { RolesGuard } from 'src/commen/Guards/role.guard';

@Module({
  imports: [UserModel],
  controllers: [userController],
  providers: [
    userService,
    UserRepository,
    TokenService,
    JwtService,
    RolesGuard,
    AuthGuard,
  ],
})
export class UserModule {}
