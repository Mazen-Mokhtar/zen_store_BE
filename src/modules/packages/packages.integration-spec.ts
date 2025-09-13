import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PackagesModule } from './packages.module';
import { PackagesService } from './packages.service';
import { ValidationPipe } from '@nestjs/common';

describe('Packages Integration Tests', () => {
  let app: INestApplication;
  let packagesService: PackagesService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [PackagesModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    packagesService = moduleFixture.get<PackagesService>(PackagesService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/packages (GET)', () => {
    it('should return available packages', async () => {
      const response = await request(app.getHttpServer())
        .get('/packages')
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should handle query parameters', async () => {
      const response = await request(app.getHttpServer())
        .get('/packages?gameId=507f1f77bcf86cd799439011')
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('data');
    });
  });

  describe('/packages/:id (GET)', () => {
    it('should return 400 for invalid package ID', async () => {
      await request(app.getHttpServer())
        .get('/packages/invalid-id')
        .expect(400);
    });

    it('should return 404 for non-existent package', async () => {
      await request(app.getHttpServer())
        .get('/packages/507f1f77bcf86cd799439011')
        .expect(404);
    });
  });

  describe('PackagesService', () => {
    it('should be defined', () => {
      expect(packagesService).toBeDefined();
    });

    it('should handle invalid ID in getPackageById', async () => {
      await expect(
        packagesService.getPackageById('invalid-id'),
      ).rejects.toThrow();
    });

    it('should handle valid ObjectId but non-existent package', async () => {
      await expect(
        packagesService.getPackageById('507f1f77bcf86cd799439011'),
      ).rejects.toThrow();
    });

    it('should return packages with proper structure', async () => {
      const result = await packagesService.getAvailablePackages({
        gameId: '507f1f77bcf86cd799439011',
      });
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('data');
      if (result && typeof result === 'object' && 'data' in result) {
        expect(Array.isArray(result.data)).toBe(true);
      }
    });
  });
});
