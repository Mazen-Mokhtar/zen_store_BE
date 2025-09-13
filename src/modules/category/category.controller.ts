import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiHeader,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { CategoryService } from './category.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { cloudMulter } from 'src/commen/multer/cloud.multer';
import { AuthGuard } from 'src/commen/Guards/auth.guard';
import { User } from 'src/commen/Decorator/user.decorator';
import { RoleTypes, TUser } from 'src/DB/models/User/user.schema';
import { Roles } from 'src/commen/Decorator/roles.decorator';
import { RolesGuard } from 'src/commen/Guards/role.guard';
import {
  CreatCategoryDTO,
  ParamCategoryDTO,
  QueryCategoryDTO,
  UpdateCategoryDTO,
} from './dto/index';

@ApiTags('Categories')
@ApiHeader({
  name: 'X-API-Version',
  description: 'API Version',
  required: false,
  schema: { default: 'v1' },
})
@UsePipes(new ValidationPipe({ whitelist: true }))
@Controller('category')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}
  @ApiOperation({
    summary: 'Create new category',
    description:
      'Create a new product category with image upload. Requires admin privileges.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBearerAuth('JWT')
  @ApiResponse({ status: 201, description: 'Category created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin privileges required',
  })
  @UseInterceptors(FileInterceptor('file', cloudMulter()))
  @Post('/')
  @Roles([RoleTypes.ADMIN, RoleTypes.SUPER_ADMIN])
  @UseGuards(AuthGuard, RolesGuard)
  async create(
    @User() user: TUser,
    @Body() body: CreatCategoryDTO,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return await this.categoryService.creat(user, body, file);
  }
  @ApiOperation({
    summary: 'Update category',
    description:
      'Update an existing category with optional image upload. Requires admin privileges.',
  })
  @ApiParam({ name: 'categoryId', description: 'Category ID to update' })
  @ApiConsumes('multipart/form-data')
  @ApiBearerAuth('JWT')
  @ApiResponse({ status: 200, description: 'Category updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin privileges required',
  })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @UseInterceptors(FileInterceptor('file', cloudMulter()))
  @Patch('update/:categoryId')
  @Roles([RoleTypes.ADMIN, RoleTypes.SUPER_ADMIN])
  @UseGuards(AuthGuard, RolesGuard)
  async update(
    @Body() body: UpdateCategoryDTO,
    @Param() params: ParamCategoryDTO,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return await this.categoryService.update(params, body, file);
  }
  @ApiOperation({
    summary: 'Get all categories',
    description:
      'Retrieve a list of all product categories with optional filtering and pagination.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number for pagination',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of items per page',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search term for category name',
  })
  @ApiResponse({
    status: 200,
    description: 'Categories retrieved successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid query parameters' })
  @Get('AllCategory')
  async getAllCategory(@Query() query: QueryCategoryDTO) {
    return this.categoryService.getAllCategory(query);
  }
  @ApiOperation({
    summary: 'Get category by ID',
    description: 'Retrieve a specific category by its ID.',
  })
  @ApiParam({ name: 'categoryId', description: 'Category ID to retrieve' })
  @ApiResponse({ status: 200, description: 'Category retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid category ID format' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @Get(':categoryId')
  async getCategory(@Param() Params: ParamCategoryDTO) {
    return this.categoryService.getCategory(Params);
  }
  @ApiOperation({
    summary: 'Delete category',
    description: 'Delete a category by its ID. Requires admin privileges.',
  })
  @ApiParam({ name: 'categoryId', description: 'Category ID to delete' })
  @ApiBearerAuth('JWT')
  @ApiResponse({ status: 200, description: 'Category deleted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid category ID format' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin privileges required',
  })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @Delete(':categoryId')
  @Roles([RoleTypes.ADMIN, RoleTypes.SUPER_ADMIN])
  @UseGuards(AuthGuard, RolesGuard)
  async deleteCategory(@Param() params: ParamCategoryDTO) {
    return await this.categoryService.deleteCategory(params);
  }
}
