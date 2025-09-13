import {
  Controller,
  Get,
  Param,
  Query,
  UsePipes,
  ValidationPipe,
  Header,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { PackagesService } from './packages.service';
import { GetPackagesDto } from './dto';
@ApiTags('Packages')
@UsePipes(new ValidationPipe({ whitelist: true }))
@Controller('packages')
export class PackagesController {
  constructor(private readonly packagesService: PackagesService) {}
  @ApiOperation({
    summary: 'Get available packages',
    description:
      'Retrieve all available packages with optional filtering and pagination.',
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
    name: 'gameId',
    required: false,
    description: 'Filter by game ID',
  })
  @ApiResponse({ status: 200, description: 'Packages retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid query parameters' })
  @Get()
  @Header('Cache-Control', 'public, max-age=300, s-maxage=600')
  async getAvailablePackages(@Query() dto: GetPackagesDto) {
    const packages = await this.packagesService.getAvailablePackages(dto);
    return packages;
  }

  @ApiOperation({
    summary: 'Get package by ID',
    description: 'Retrieve a specific package by its ID.',
  })
  @ApiParam({ name: 'id', description: 'Package ID to retrieve' })
  @ApiResponse({ status: 200, description: 'Package retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid package ID' })
  @ApiResponse({ status: 404, description: 'Package not found' })
  @Get(':id')
  @Header('Cache-Control', 'public, max-age=600, s-maxage=1200')
  async getPackageById(@Param('id') id: string) {
    const packageDoc = await this.packagesService.getPackageById(id);
    return { success: true, data: packageDoc };
  }
}
