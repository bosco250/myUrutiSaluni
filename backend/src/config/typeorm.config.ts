import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';

config();

const configService = new ConfigService();
const dbType = configService.get('DB_TYPE', 'postgres');
const isDevelopment = configService.get('NODE_ENV') === 'development';

// Use PostgreSQL by default, SQLite only if explicitly set
const isSQLite = dbType === 'sqlite';

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
      password: configService.get('DB_PASSWORD', ''),
      database: configService.get('DB_DATABASE', 'salon_association'),
      entities: ['src/**/*.entity.ts'],
      migrations: ['src/migrations/*.ts'],
      synchronize: false,
    };

export default new DataSource(dataSourceConfig);

