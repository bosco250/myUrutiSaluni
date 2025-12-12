import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  logger.log('🚀 Starting Nest application...');

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const configService = app.get(ConfigService);

  // Serve static files from uploads directory
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  // Enable CORS
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  const frontendUrl = configService.get<string>('FRONTEND_URL');

  // In development, allow all origins (including mobile apps)
  // In production, use configured FRONTEND_URL or allow all if not set
  const isDevelopment = nodeEnv === 'development';
  const allowedOrigins = isDevelopment
    ? true // Allow all origins in development (mobile apps, web, etc.)
    : frontendUrl
      ? frontendUrl.split(',').map((url) => url.trim())
      : true; // Fallback to allow all if FRONTEND_URL not set in production

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'X-Requested-With',
    ],
  });

  logger.log(
    `🌐 CORS enabled: ${isDevelopment ? 'All origins allowed (development)' : `Restricted to: ${Array.isArray(allowedOrigins) ? allowedOrigins.join(', ') : 'All origins'}`}`,
  );

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
        '- Real-time notifications',
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

  const port = configService.get<number>('PORT');
  if (!port) {
    throw new Error('PORT environment variable is required');
  }

  logger.log('📦 Initializing modules...');
  // Listen on all network interfaces (0.0.0.0) to allow connections from other devices
  await app.listen(port, '0.0.0.0');

  // Get local network IP for mobile device access
  const os = require('os');
  const networkInterfaces = os.networkInterfaces();
  let localIp = 'localhost';
  for (const interfaceName in networkInterfaces) {
    const addresses = networkInterfaces[interfaceName];
    if (addresses) {
      for (const addr of addresses) {
        if (
          addr.family === 'IPv4' &&
          !addr.internal &&
          addr.address.startsWith('192.168.')
        ) {
          localIp = addr.address;
          break;
        }
      }
      if (localIp !== 'localhost') break;
    }
  }

  logger.log(`✅ Application is running on: http://localhost:${port}`);
  if (localIp !== 'localhost') {
    logger.log(`📱 Mobile access: http://${localIp}:${port}/api`);
  }
  logger.log(`📚 Swagger documentation: http://localhost:${port}/api/docs`);
  logger.log(`❤️  Health check: http://localhost:${port}/health`);
  logger.log(
    `🔐 Environment: ${configService.get<string>('NODE_ENV', 'development')}`,
  );
}

bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
