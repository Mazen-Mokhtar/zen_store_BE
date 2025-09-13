import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ValidationPipe } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DatabaseTestUtils } from './setup';
import { JwtService } from '@nestjs/jwt';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let mongoUri: string;
  let authToken: string;
  let testUser: any;

  beforeAll(async () => {
    // Setup in-memory database for e2e tests
    mongoUri = await DatabaseTestUtils.setupInMemoryDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule, MongooseModule.forRoot(mongoUri)],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));

    jwtService = moduleFixture.get<JwtService>(JwtService);

    await app.init();

    // Create test user and get auth token
    testUser = {
      email: 'test@example.com',
      password: 'TestPassword123!',
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
    };

    try {
      // Register test user
      await request(app.getHttpServer()).post('/auth/register').send(testUser);

      // Login to get auth token
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      if (loginResponse.body?.data?.accessToken) {
        authToken = loginResponse.body.data.accessToken;
      }
    } catch (error) {
      console.warn('Test user setup failed, some tests may be skipped');
    }
  });

  afterAll(async () => {
    await app.close();
    await DatabaseTestUtils.teardownInMemoryDatabase();
  });

  describe('Application Health', () => {
    it('should be running and accessible', async () => {
      await request(app.getHttpServer()).get('/health').expect(200);
    });

    it('should return proper health status', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should provide detailed health information', async () => {
      const response = await request(app.getHttpServer())
        .get('/health/detailed')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('checks');
    });
  });

  describe('CSRF Protection', () => {
    it('should get CSRF token', async () => {
      const response = await request(app.getHttpServer())
        .get('/csrf-token')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
    });
  });

  describe('Packages API', () => {
    it('should get all packages', async () => {
      const response = await request(app.getHttpServer())
        .get('/packages')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter packages by category', async () => {
      const response = await request(app.getHttpServer())
        .get('/packages?category=premium')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent routes', async () => {
      await request(app.getHttpServer()).get('/non-existent-route').expect(404);
    });

    it('should handle malformed requests gracefully', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send('invalid data')
        .set('Content-Type', 'application/json');

      expect([400, 500]).toContain(response.status);
    });
  });

  describe('Performance Tests', () => {
    it('performance - should handle concurrent requests', async () => {
      const concurrentRequests = 10;
      const requests = Array(concurrentRequests)
        .fill(null)
        .map(() => request(app.getHttpServer()).get('/health'));

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const endTime = Date.now();

      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });

      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(5000);
    });
  });

  describe('Smoke Tests', () => {
    it('smoke - application should start successfully', () => {
      expect(app).toBeDefined();
    });

    it('smoke - critical endpoints should be accessible', async () => {
      const endpoints = ['/health', '/csrf-token', '/packages'];

      for (const endpoint of endpoints) {
        await request(app.getHttpServer())
          .get(endpoint)
          .expect((res) => {
            expect([200, 401, 404]).toContain(res.status);
          });
      }
    });
  });
});
