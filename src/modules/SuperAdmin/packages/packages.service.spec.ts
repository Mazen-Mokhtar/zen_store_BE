import { Test, TestingModule } from '@nestjs/testing';
import { SuperAdminPackagesService } from './packages.service';

describe('SuperAdminPackagesService', () => {
  let service: SuperAdminPackagesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SuperAdminPackagesService],
    }).compile();

    service = module.get<SuperAdminPackagesService>(SuperAdminPackagesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
