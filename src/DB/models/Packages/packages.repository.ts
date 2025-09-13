import { DBService } from '../db.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Package, PackageDocument } from './packages.schema';

export class PackageRepository extends DBService<PackageDocument> {
  constructor(
    @InjectModel(Package.name)
    private readonly packageModel: Model<PackageDocument>,
  ) {
    super(packageModel);
  }
}
