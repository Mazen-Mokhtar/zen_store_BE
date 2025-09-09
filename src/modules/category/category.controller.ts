import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors, UsePipes, ValidationPipe } from "@nestjs/common";
import { CategoryService } from "./category.service";
import { FileInterceptor } from "@nestjs/platform-express";
import { cloudMulter } from "src/commen/multer/cloud.multer";
import { AuthGuard } from "src/commen/Guards/auth.guard";
import { User } from "src/commen/Decorator/user.decorator";
import { RoleTypes, TUser } from "src/DB/models/User/user.schema";
import { Roles } from "src/commen/Decorator/roles.decorator";
import { RolesGuard } from "src/commen/Guards/role.guard";
import { CreatCategoryDTO, ParamCategoryDTO, QueryCategoryDTO, UpdateCategoryDTO } from "./dto/index";
@UsePipes(new ValidationPipe({ whitelist: true }))
@Controller("category")
export class CategoryController {
    constructor(private readonly categoryService: CategoryService) { }
    @UseInterceptors(FileInterceptor("file", cloudMulter()))
    @Post("/")
    @Roles([RoleTypes.ADMIN, RoleTypes.SUPER_ADMIN])
    @UseGuards(AuthGuard, RolesGuard)
    async create(@User() user: TUser, @Body() body: CreatCategoryDTO, @UploadedFile() file: Express.Multer.File) {
        return await this.categoryService.creat(user, body, file)
    }
    @UseInterceptors(FileInterceptor("file", cloudMulter()))
    @Patch("update/:categoryId")
    @Roles([RoleTypes.ADMIN, RoleTypes.SUPER_ADMIN])
    @UseGuards(AuthGuard, RolesGuard)
    async update(@Body() body: UpdateCategoryDTO, @Param() params: ParamCategoryDTO, @UploadedFile() file: Express.Multer.File) {
        return await this.categoryService.update(params, body, file)
    }
    @Get("AllCategory")
    async getAllCategory(@Query() query: QueryCategoryDTO) {
        return this.categoryService.getAllCategory(query)
    }
    @Get(":categoryId")
    async getCategory(@Param() Params: ParamCategoryDTO) {
        return this.categoryService.getCategory(Params)
    }
    @Delete(":categoryId")
    @Roles([RoleTypes.ADMIN, RoleTypes.SUPER_ADMIN])
    @UseGuards(AuthGuard, RolesGuard)
    async deleteCategory(@Param() params: ParamCategoryDTO) {
        return await this.categoryService.deleteCategory(params);
    }
}