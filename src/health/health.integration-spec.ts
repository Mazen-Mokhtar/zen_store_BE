import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { HealthModule } from './health.module';
import { HealthService } from './health.service';
import { MongooseModule } from '@nestjs/mongoose';
import { DatabaseTestUtils } from '../../test/setup';

describe('Health Integration Tests', () => {
  let app: INestApplication;
  let healthService: HealthService;
  let mongoUri: string;

  beforeAll(async () => {
    // Setup in-memory database for integration tests
    mongoUri = await DatabaseTestUtils.setupInMemoryDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [MongooseModule.forRoot(mongoUri), HealthModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    healthService = moduleFixture.get<HealthService>(HealthService);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await DatabaseTestUtils.teardownInMemoryDatabase();
  });

  describe('/health (GET)', () => {
    it('should return basic health status', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('version');
    });

    it('should return health status within acceptable time', async () => {
      const startTime = Date.now();

      await request(app.getHttpServer()).get('/health').expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
    });
  });

  describe('/health/detailed (GET)', () => {
    it('should return detailed health information', async () => {
      const response = await request(app.getHttpServer())
        .get('/health/detailed')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('checks');
      expect(response.body.checks).toHaveProperty('database');
      expect(response.body.checks).toHaveProperty('memory');
      expect(response.body.checks).toHaveProperty('disk');
    });

    it('should include database connectivity check', async () => {
      const response = await request(app.getHttpServer())
        .get('/health/detailed')
        .expect(200);

      const dbCheck = response.body.checks.database;
      expect(dbCheck).toHaveProperty('status');
      expect(dbCheck).toHaveProperty('responseTime');
      expect(['up', 'down']).toContain(dbCheck.status);
    });

    it('should include memory usage information', async () => {
      const response = await request(app.getHttpServer())
        .get('/health/detailed')
        .expect(200);

      const memoryCheck = response.body.checks.memory;
      expect(memoryCheck).toHaveProperty('status');
      expect(memoryCheck).toHaveProperty('used');
      expect(memoryCheck).toHaveProperty('total');
      expect(memoryCheck).toHaveProperty('percentage');
    });
  });

  describe('/health/liveness (GET)', () => {
    it('should return liveness probe status', async () => {
      const response = await request(app.getHttpServer())
        .get('/health/liveness')
        .expect(200);

      expect(response.body).toHaveProperty('alive', true);
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should respond quickly for liveness probe', async () => {
      const startTime = Date.now();

      await request(app.getHttpServer()).get('/health/liveness').expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(500); // Should respond within 500ms
    });
  });

  describe('/health/readiness (GET)', () => {
    it('should return readiness probe status', async () => {
      const response = await request(app.getHttpServer())
        .get('/health/readiness')
        .expect(200);

      expect(response.body).toHaveProperty('ready');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('checks');
    });

    it('should check critical dependencies for readiness', async () => {
      const response = await request(app.getHttpServer())
        .get('/health/readiness')
        .expect(200);

      const checks = response.body.checks;
      expect(checks).toHaveProperty('database');

      // Database should be ready since we're using in-memory MongoDB
      expect(checks.database.status).toBe('up');
    });
  });

  describe('Health Service Integration', () => {
    it('should perform database health check', async () => {
      const dbHealth = await healthService.getDatabaseHealth();

      expect(dbHealth).toHaveProperty('status');
      expect(dbHealth).toHaveProperty('responseTime');
      expect(typeof dbHealth.responseTime).toBe('number');
    });

    it('should get system metrics', async () => {
      const systemMetrics = await healthService.getSystemMetrics();

      expect(systemMetrics).toHaveProperty('memory');
      expect(systemMetrics).toHaveProperty('cpu');
      expect(systemMetrics).toHaveProperty('disk');
    });

    it('should get basic health status', async () => {
      const basicHealth = await healthService.getBasicHealth();

      expect(basicHealth).toHaveProperty('status');
      expect(basicHealth).toHaveProperty('message');
      expect(basicHealth).toHaveProperty('timestamp');
      expect(basicHealth).toHaveProperty('details');
    });

    it('should get detailed health status', async () => {
      const detailedHealth = await healthService.getDetailedHealth();

      expect(detailedHealth).toHaveProperty('status');
      expect(detailedHealth).toHaveProperty('timestamp');
      expect(detailedHealth).toHaveProperty('uptime');
      expect(detailedHealth).toHaveProperty('version');
      expect(detailedHealth).toHaveProperty('services');

      const services = detailedHealth.services;
      expect(services).toHaveProperty('database');
      expect(services).toHaveProperty('memory');
      expect(services).toHaveProperty('disk');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid health endpoints gracefully', async () => {
      await request(app.getHttpServer())
        .get('/health/invalid-endpoint')
        .expect(404);
    });

    it('should return proper error format for invalid requests', async () => {
      const response = await request(app.getHttpServer())
        .get('/health/invalid-endpoint')
        .expect(404);

      expect(response.body).toHaveProperty('statusCode', 404);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Performance Tests', () => {
    it('performance - health endpoint should handle concurrent requests', async () => {
      const concurrentRequests = 10;
      const requests = Array(concurrentRequests)
        .fill(null)
        .map(() => request(app.getHttpServer()).get('/health'));

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const endTime = Date.now();

      // All requests should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('status', 'ok');
      });

      // Total time should be reasonable for concurrent requests
      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('performance - detailed health check should complete within time limit', async () => {
      const startTime = Date.now();

      await request(app.getHttpServer()).get('/health/detailed').expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });

  describe('Smoke Tests', () => {
    it('smoke - health module should be properly initialized', () => {
      expect(app).toBeDefined();
      expect(healthService).toBeDefined();
    });

    it('smoke - basic health endpoint should be accessible', async () => {
      await request(app.getHttpServer()).get('/health').expect(200);
    });

    it('smoke - all health endpoints should be accessible', async () => {
      const endpoints = [
        '/health',
        '/health/detailed',
        '/health/liveness',
        '/health/readiness',
      ];

      for (const endpoint of endpoints) {
        await request(app.getHttpServer()).get(endpoint).expect(200);
      }
    });
  });
});
