import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { userService } from "./user.service";
import { AuthGuard } from "src/commen/Guards/auth.guard";
import { Request } from "express";
import { RolesGuard } from "src/commen/Guards/role.guard";
import { Roles } from "src/commen/Decorator/roles.decorator";
import { User } from "src/commen/Decorator/user.decorator";
import { TUser } from "src/DB/models/User/user.schema";

@Controller("user")
export class userController {
    constructor(private readonly userService: userService) { }
    @Get("profile")
    @Roles(["admin"])
    @UseGuards(AuthGuard,RolesGuard)
    getProfile(@User() user: TUser) {
        return this.userService.getProfile(user)
    }
}