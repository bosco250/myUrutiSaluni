import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';

config();

const configService = new ConfigService();
const dbType = configService.get('DB_TYPE', 'sqlite');
const isDevelopment = configService.get('NODE_ENV') === 'development';

// Use SQLite for development, PostgreSQL for production
const isSQLite = dbType === 'sqlite' || (isDevelopment && !configService.get('DB_HOST'));

const dataSourceConfig = isSQLite
  ? {
      type: 'better-sqlite3' as const,
      database: configService.get('DB_DATABASE', 'database/salon_association.db'),
      entities: ['src/**/*.entity.ts'],
      migrations: ['src/migrations/*.ts'],
      synchronize: false,
    }
  : {
      type: 'postgres' as const,
      host: configService.get('DB_HOST', 'localhost'),
      port: configService.get<number>('DB_PORT', 5432),
      username: configService.get('DB_USERNAME', 'postgres'),
      password: configService.get('DB_PASSWORD', 'postgres'),
      database: configService.get('DB_DATABASE', 'salon_association'),
      entities: ['src/**/*.entity.ts'],
      migrations: ['src/migrations/*.ts'],
      synchronize: false,
    };

export default new DataSource(dataSourceConfig);

