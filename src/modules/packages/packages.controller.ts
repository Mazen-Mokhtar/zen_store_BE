import { Controller, Get, Param, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { PackagesService } from './packages.service';
import { GetPackagesDto } from './dto';
@UsePipes(new ValidationPipe({ whitelist: true }))
@Controller('packages')
export class PackagesController {
  constructor(private readonly packagesService: PackagesService) { }
  @Get()
  async getAvailablePackages(@Query() dto: GetPackagesDto) {
    const packages = await this.packagesService.getAvailablePackages(dto);
    return packages;
  }

  @Get(':id')
  async getPackageById(@Param('id') id: string) {
    const packageDoc = await this.packagesService.getPackageById(id);
    return { success: true, data: packageDoc };
  }
}
