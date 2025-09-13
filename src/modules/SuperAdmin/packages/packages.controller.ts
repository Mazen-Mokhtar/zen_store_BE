import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { SuperAdminPackagesService } from './packages.service';
import { CreatePackageDto, UpdatePackageDto } from './dto';
import { User } from 'src/commen/Decorator/user.decorator';
import { RoleTypes, TUser } from 'src/DB/models/User/user.schema';
import { RolesGuard } from 'src/commen/Guards/role.guard';
import { AuthGuard } from 'src/commen/Guards/auth.guard';
import { Roles } from 'src/commen/Decorator/roles.decorator';
import { MongoIdPipe } from 'src/commen/pipes/mongoId.pipes';
import { cloudMulter } from 'src/commen/multer/cloud.multer';
@ApiTags('SuperAdmin - Packages')
@UsePipes(new ValidationPipe({ whitelist: true }))
@Controller('packages/dashboard')
export class SuperAdminPackagesController {
  constructor(
    private readonly superAdminPackagesService: SuperAdminPackagesService,
  ) {}
  @ApiOperation({
    summary: 'Create package (SuperAdmin)',
    description:
      'Create a new package with optional image. Requires SuperAdmin or Admin privileges.',
  })
  @ApiBearerAuth('JWT')
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Package created successfully' })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data or file format',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - SuperAdmin/Admin privileges required',
  })
  @UseInterceptors(FileInterceptor('image', cloudMulter()))
  @UseGuards(AuthGuard, RolesGuard)
  @Roles([RoleTypes.SUPER_ADMIN, RoleTypes.ADMIN])
  @Post()
  async createPackage(
    @User() user: TUser,
    @Body() createPackageDto: CreatePackageDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return await this.superAdminPackagesService.createPackage(
      user,
      createPackageDto,
      file,
    );
  }

  @ApiOperation({
    summary: 'Update package (SuperAdmin)',
    description: 'Update an existing package. Requires SuperAdmin privileges.',
  })
  @ApiParam({ name: 'id', description: 'Package ID to update' })
  @ApiBearerAuth('JWT')
  @ApiResponse({ status: 200, description: 'Package updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - SuperAdmin privileges required',
  })
  @ApiResponse({ status: 404, description: 'Package not found' })
  @UseGuards(AuthGuard, RolesGuard)
  @Roles([RoleTypes.SUPER_ADMIN])
  @Patch(':id')
  async updatePackage(
    @Param('id', MongoIdPipe) id: string,
    @User() user: TUser,
    @Body() updatePackageDto: UpdatePackageDto,
  ) {
    return await this.superAdminPackagesService.updatePackage(
      id,
      user,
      updatePackageDto,
    );
  }
  @ApiOperation({
    summary: 'Delete package (SuperAdmin)',
    description: 'Delete a package. Requires SuperAdmin privileges.',
  })
  @ApiParam({ name: 'id', description: 'Package ID to delete' })
  @ApiBearerAuth('JWT')
  @ApiResponse({ status: 200, description: 'Package deleted successfully' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - SuperAdmin privileges required',
  })
  @ApiResponse({ status: 404, description: 'Package not found' })
  @UseGuards(AuthGuard, RolesGuard)
  @Roles([RoleTypes.SUPER_ADMIN])
  @Delete(':id')
  async deletePackage(
    @Param('id', MongoIdPipe) id: string,
    @User() user: TUser,
  ) {
    return await this.superAdminPackagesService.deletePackage(id, user);
  }
  @ApiOperation({
    summary: 'Get package by ID (SuperAdmin)',
    description:
      'Retrieve a specific package by ID. Requires SuperAdmin privileges.',
  })
  @ApiParam({ name: 'id', description: 'Package ID to retrieve' })
  @ApiBearerAuth('JWT')
  @ApiResponse({ status: 200, description: 'Package retrieved successfully' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - SuperAdmin privileges required',
  })
  @ApiResponse({ status: 404, description: 'Package not found' })
  @UseGuards(AuthGuard, RolesGuard)
  @Roles([RoleTypes.SUPER_ADMIN])
  @Get(':id')
  getPackageById(@Param('id', MongoIdPipe) id: string) {
    return this.superAdminPackagesService.getPackageById(id);
  }
  @ApiOperation({
    summary: 'Get all packages (SuperAdmin)',
    description: 'Retrieve all packages. Requires SuperAdmin privileges.',
  })
  @ApiBearerAuth('JWT')
  @ApiResponse({
    status: 200,
    description: 'All packages retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - SuperAdmin privileges required',
  })
  @UseGuards(AuthGuard, RolesGuard)
  @Roles([RoleTypes.SUPER_ADMIN])
  @Get()
  getAllPackages() {
    return this.superAdminPackagesService.getAllPackages();
  }

  @ApiOperation({
    summary: 'Upload package image (SuperAdmin)',
    description:
      'Upload an image for a package. Requires SuperAdmin privileges.',
  })
  @ApiParam({ name: 'id', description: 'Package ID to upload image for' })
  @ApiBearerAuth('JWT')
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: 'Image uploaded successfully' })
  @ApiResponse({ status: 400, description: 'File missing or invalid format' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - SuperAdmin privileges required',
  })
  @ApiResponse({ status: 404, description: 'Package not found' })
  @UseInterceptors(FileInterceptor('file', cloudMulter()))
  @UseGuards(AuthGuard, RolesGuard)
  @Roles([RoleTypes.SUPER_ADMIN])
  @Patch(':id/upload-image')
  async uploadPackageImage(
    @User() user: TUser,
    @Param('id', MongoIdPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('File missing');
    }
    return await this.superAdminPackagesService.uploadPackageImage(
      user,
      id,
      file,
    );
  }
}
