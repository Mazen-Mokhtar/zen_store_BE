import { Module } from "@nestjs/common";
import { UserModel } from "src/DB/models/User/user.model";
import { RolesGuard } from "../Guards/role.guard";
import { AuthGuard } from "../Guards/auth.guard";
import { TokenService } from "../jwt";
import { UserRepository } from "src/DB/models/User/user.repository";
import { JwtService } from "@nestjs/jwt";

@Module({
  imports: [UserModel],
  providers: [
    RolesGuard,
    AuthGuard,
    TokenService,
    UserRepository,
    JwtService
  ],
  exports: [
    RolesGuard,
    AuthGuard,
    TokenService,
    UserRepository,
    JwtService,
    UserModel
  ],
})
export class SharedModule {}