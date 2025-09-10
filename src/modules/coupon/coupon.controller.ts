import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards, UsePipes, ValidationPipe } from "@nestjs/common";
import { CouponService } from "./coupon.service";
import { AuthGuard } from "src/commen/Guards/auth.guard";
import { RolesGuard } from "src/commen/Guards/role.guard";
import { Roles } from "src/commen/Decorator/roles.decorator";
import { RoleTypes, TUser } from "src/DB/models/User/user.schema";
import { User } from "src/commen/Decorator/user.decorator";
import { CreateCouponDTO, UpdateCouponDTO, ValidateCouponDTO, ParamCouponDTO, QueryCouponDTO } from "./dto";

@UsePipes(new ValidationPipe({ whitelist: true }))
@Controller("coupon")
export class CouponController {
    constructor(private readonly couponService: CouponService) {}

    // Admin endpoints
    @Post()
    @Roles([RoleTypes.ADMIN])
    @UseGuards(AuthGuard, RolesGuard)
    async createCoupon(@User() admin: TUser, @Body() body: CreateCouponDTO) {
        return await this.couponService.createCoupon(admin, body);
    }

    @Patch(":couponId")
    @Roles([RoleTypes.ADMIN])
    @UseGuards(AuthGuard, RolesGuard)
    async updateCoupon(@User() admin: TUser, @Param() params: ParamCouponDTO, @Body() body: UpdateCouponDTO) {
        return await this.couponService.updateCoupon(admin, params, body);
    }

    @Delete(":couponId")
    @Roles([RoleTypes.ADMIN])
    @UseGuards(AuthGuard, RolesGuard)
    async deleteCoupon(@User() admin: TUser, @Param() params: ParamCouponDTO) {
        return await this.couponService.deleteCoupon(admin, params);
    }

    @Get()
    @Roles([RoleTypes.ADMIN])
    @UseGuards(AuthGuard, RolesGuard)
    async getAllCoupons(@Query() query: QueryCouponDTO) {
        return await this.couponService.getAllCoupons(query);
    }

    @Get(":couponId")
    @Roles([RoleTypes.ADMIN])
    @UseGuards(AuthGuard, RolesGuard)
    async getCouponById(@Param() params: ParamCouponDTO) {
        return await this.couponService.getCouponById(params);
    }

    // User endpoints
    @Get("details/:couponCode")
    async getCouponDetails(@Param("couponCode") couponCode: string) {
        return await this.couponService.getCouponDetails(couponCode);
    }

    @Post("validate")
    async validateCoupon(@Body() body: ValidateCouponDTO) {
        return await this.couponService.validateCoupon(body);
    }
}