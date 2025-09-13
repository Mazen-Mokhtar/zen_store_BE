import { MongooseModule } from '@nestjs/mongoose';
import { Package, PackageSchema } from './packages.schema';

export const packageModel = MongooseModule.forFeature([
  { name: Package.name, schema: PackageSchema },
]);
