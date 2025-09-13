import { Test, TestingModule } from '@nestjs/testing';
import { SuperAdminPackagesController } from './packages.controller';
import { SuperAdminPackagesService } from './packages.service';

describe('SuperAdminPackagesController', () => {
  let controller: SuperAdminPackagesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SuperAdminPackagesController],
      providers: [SuperAdminPackagesService],
    }).compile();

    controller = module.get<SuperAdminPackagesController>(
      SuperAdminPackagesController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
