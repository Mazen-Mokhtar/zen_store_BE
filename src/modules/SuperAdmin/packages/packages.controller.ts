import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards, UsePipes, ValidationPipe, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SuperAdminPackagesService } from './packages.service';
import { CreatePackageDto, UpdatePackageDto } from './dto';
import { User } from 'src/commen/Decorator/user.decorator';
import { RoleTypes, TUser } from 'src/DB/models/User/user.schema';
import { RolesGuard } from 'src/commen/Guards/role.guard';
import { AuthGuard } from 'src/commen/Guards/auth.guard';
import { Roles } from 'src/commen/Decorator/roles.decorator';
import { MongoIdPipe } from 'src/commen/pipes/mongoId.pipes';
import { cloudMulter } from 'src/commen/multer/cloud.multer';
@UsePipes(new ValidationPipe({ whitelist: true }))
@Controller('packages/dashboard')
export class SuperAdminPackagesController {
  constructor(private readonly superAdminPackagesService: SuperAdminPackagesService) { }
  @UseInterceptors(FileInterceptor('image', cloudMulter()))
  @UseGuards(AuthGuard, RolesGuard)
  @Roles([RoleTypes.SUPER_ADMIN, RoleTypes.ADMIN])
  @Post()
  async createPackage(
    @User() user: TUser, 
    @Body() createPackageDto: CreatePackageDto,
    @UploadedFile() file?: Express.Multer.File
  ) {
    return await this.superAdminPackagesService.createPackage(user, createPackageDto, file);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles([RoleTypes.SUPER_ADMIN])
  @Patch(':id')
  async updatePackage(
    @Param('id', MongoIdPipe) id: string, 
    @User() user: TUser, 
    @Body() updatePackageDto: UpdatePackageDto
  ) {
    return await this.superAdminPackagesService.updatePackage(id, user, updatePackageDto);
  }
  @UseGuards(AuthGuard, RolesGuard)
  @Roles([RoleTypes.SUPER_ADMIN])
  @Delete(':id')
  async deletePackage(@Param('id', MongoIdPipe) id: string, @User() user: TUser) {
    return await this.superAdminPackagesService.deletePackage(id, user);
  }
  @UseGuards(AuthGuard, RolesGuard)
  @Roles([RoleTypes.SUPER_ADMIN])
  @Get(':id')
  getPackageById(@Param('id', MongoIdPipe) id: string) {
    return this.superAdminPackagesService.getPackageById(id);
  }
  @UseGuards(AuthGuard, RolesGuard)
  @Roles([RoleTypes.SUPER_ADMIN])
  @Get()
  getAllPackages() {
    return this.superAdminPackagesService.getAllPackages();
  }

  @UseInterceptors(FileInterceptor('file', cloudMulter()))
  @UseGuards(AuthGuard, RolesGuard)
  @Roles([RoleTypes.SUPER_ADMIN])
  @Patch(":id/upload-image")
  async uploadPackageImage(
    @User() user: TUser,
    @Param('id', MongoIdPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException("File missing")
    }
    return await this.superAdminPackagesService.uploadPackageImage(user, id, file);
  }
}
