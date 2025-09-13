import { Injectable, Logger } from '@nestjs/common';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { setupSwagger, getSwaggerConfig } from '../config/swagger.config';

@Injectable()
export class SwaggerService {
  private readonly logger = new Logger(SwaggerService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Setup Swagger documentation for the application
   */
  setupSwagger(app: INestApplication): void {
    try {
      const config = getSwaggerConfig();

      if (!config.enabled) {
        this.logger.log('Swagger documentation is disabled');
        return;
      }

      setupSwagger(app, this.configService);

      this.logger.log('✅ Swagger documentation setup completed');
      this.logger.log(`📚 Documentation available at: /api/docs`);
      this.logger.log(`📄 OpenAPI JSON available at: /api/docs-json`);
    } catch (error) {
      this.logger.error(
        '❌ Failed to setup Swagger documentation:',
        error.message,
      );
      throw error;
    }
  }

  /**
   * Get current Swagger configuration
   */
  getConfig() {
    return getSwaggerConfig();
  }

  /**
   * Check if Swagger is enabled
   */
  isEnabled(): boolean {
    return getSwaggerConfig().enabled;
  }

  /**
   * Get Swagger documentation URLs
   */
  getUrls() {
    const config = getSwaggerConfig();
    const baseUrl = config.servers[0]?.url || 'http://localhost:3000';

    return {
      docs: `${baseUrl}/api/docs`,
      json: `${baseUrl}/api/docs-json`,
      yaml: `${baseUrl}/api/docs-yaml`,
    };
  }

  /**
   * Log Swagger setup information
   */
  logSetupInfo(): void {
    const config = getSwaggerConfig();
    const urls = this.getUrls();

    this.logger.log('='.repeat(60));
    this.logger.log('🚀 SWAGGER DOCUMENTATION SETUP');
    this.logger.log('='.repeat(60));
    this.logger.log(`📖 Title: ${config.title}`);
    this.logger.log(`🔢 Version: ${config.version}`);
    this.logger.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    this.logger.log(`✅ Enabled: ${config.enabled}`);

    if (config.enabled) {
      this.logger.log('');
      this.logger.log('📚 Documentation URLs:');
      this.logger.log(`   • Swagger UI: ${urls.docs}`);
      this.logger.log(`   • OpenAPI JSON: ${urls.json}`);
      this.logger.log(`   • OpenAPI YAML: ${urls.yaml}`);

      this.logger.log('');
      this.logger.log('🏷️  Available Tags:');
      config.tags.forEach((tag) => {
        this.logger.log(`   • ${tag.name}: ${tag.description}`);
      });

      this.logger.log('');
      this.logger.log('🔐 Security Schemes:');
      this.logger.log(`   • JWT Bearer: ${config.security.jwt.description}`);
      this.logger.log(`   • API Key: ${config.security.apiKey.description}`);
    }

    this.logger.log('='.repeat(60));
  }
}
