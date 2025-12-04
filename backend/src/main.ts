import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';
import { RequestLoggingMiddleware } from './common/middleware/request-logging.middleware';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Serve static files from uploads directory
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  // Enable CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL?.split(',') || ['http://localhost:3001', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  // Global validation pipe with detailed error messages
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      errorHttpStatusCode: 422,
      validationError: {
        target: false,
        value: false,
      },
    }),
  );

  // API prefix
  app.setGlobalPrefix('api', {
    exclude: ['health', 'health/ready', 'health/live'],
  });

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Salon Association Platform API')
    .setDescription(
      'Comprehensive API for managing salon operations, membership, accounting, micro-lending, and Airtel Money integration.\n\n' +
      'Features include:\n' +
      '- Multi-tenant salon management\n' +
      '- Role-based access control (RBAC)\n' +
      '- Membership and subscription management\n' +
      '- Appointment scheduling\n' +
      '- Sales and inventory tracking\n' +
      '- Accounting and financial reporting\n' +
      '- Micro-lending system\n' +
      '- Airtel Money payment integration\n' +
      '- Real-time notifications'
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Authentication', 'User authentication and authorization')
    .addTag('Users', 'User management')
    .addTag('Salons', 'Salon management')
    .addTag('Customers', 'Customer management')
    .addTag('Memberships', 'Membership and subscriptions')
    .addTag('Services', 'Service catalog')
    .addTag('Appointments', 'Appointment scheduling')
    .addTag('Sales', 'Sales transactions')
    .addTag('Inventory', 'Inventory management')
    .addTag('Accounting', 'Financial accounting')
    .addTag('Loans', 'Micro-lending')
    .addTag('Wallets', 'Digital wallets')
    .addTag('Airtel', 'Airtel Money integration')
    .addTag('Dashboard', 'Analytics and dashboards')
    .addTag('Notifications', 'Notification system')
    .addTag('Health', 'Health check endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
    },
    customSiteTitle: 'Salon Association API Documentation',
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  logger.log(`🚀 Application is running on: http://localhost:${port}`);
  logger.log(`📚 Swagger documentation: http://localhost:${port}/api/docs`);
  logger.log(`❤️  Health check: http://localhost:${port}/health`);
  logger.log(`🔐 Environment: ${process.env.NODE_ENV || 'development'}`);
}

bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});

