# Backend Development Guide

## Quick Start Checklist

### Initial Setup
- [ ] Clone repository
- [ ] Run `npm install`
- [ ] Copy `.env.example` to `.env`
- [ ] Configure environment variables
- [ ] Start development server: `npm run start:dev`
- [ ] Access Swagger docs: http://localhost:3000/api/docs

### Development Workflow
- [ ] Create feature branch
- [ ] Implement changes
- [ ] Write tests
- [ ] Run linting: `npm run lint`
- [ ] Run tests: `npm test`
- [ ] Commit with meaningful message
- [ ] Create pull request

## Architecture Overview

### Module Structure
Each feature module follows this structure:
```
module-name/
├── dto/                    # Data Transfer Objects
│   ├── create-*.dto.ts
│   ├── update-*.dto.ts
│   └── query-*.dto.ts
├── entities/              # TypeORM entities
│   └── *.entity.ts
├── module-name.controller.ts  # REST endpoints
├── module-name.service.ts     # Business logic
└── module-name.module.ts      # Module configuration
```

### Common Module Features

#### Decorators
- `@CurrentUser()` - Get authenticated user
- `@Roles()` - Require specific roles
- `@Public()` - Mark route as public
- `@IpAddress()` - Get request IP
- `@RequireOwnership()` - Check resource ownership

#### Guards
- `JwtAuthGuard` - JWT authentication (global)
- `RolesGuard` - Role-based authorization
- `RateLimitGuard` - Request throttling
- `OwnershipGuard` - Resource ownership check

#### Pipes
- `ValidationPipe` - DTO validation (global)
- `ParseUUIDPipe` - UUID parsing
- `ParseIntPipe` - Integer parsing
- `ParseDatePipe` - Date parsing
- `SanitizePipe` - Input sanitization

#### Filters
- `AllExceptionsFilter` - Global error handling
- `HttpExceptionFilter` - HTTP exception handling

#### Interceptors
- `LoggingInterceptor` - Request/response logging
- `TransformInterceptor` - Response transformation

## Best Practices

### DTOs (Data Transfer Objects)
```typescript
import { IsString, IsEmail, IsOptional, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'StrongPassword123!' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  @IsString()
  @IsOptional()
  fullName?: string;
}
```

### Entities
```typescript
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  fullName: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### Controllers
```typescript
import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List all users' })
  findAll() {
    return this.usersService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Create user' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }
}
```

### Services
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = this.usersRepository.create(createUserDto);
    return this.usersRepository.save(user);
  }
}
```

## Database Management

### Creating Migrations
```bash
# Generate migration based on entity changes
npm run migration:generate -- src/migrations/AddUserProfile

# Create empty migration
npm run typeorm migration:create src/migrations/AddCustomLogic

# Run migrations
npm run migration:run

# Revert last migration
npm run migration:revert
```

### Migration Example
```typescript
import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateUsersTable1234567890 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'email',
            type: 'varchar',
            isUnique: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('users');
  }
}
```

## Testing

### Unit Tests
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './entities/user.entity';

describe('UsersService', () => {
  let service: UsersService;
  let mockRepository: any;

  beforeEach(async () => {
    mockRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return all users', async () => {
    const users = [{ id: '1', email: 'test@example.com' }];
    mockRepository.find.mockResolvedValue(users);

    expect(await service.findAll()).toEqual(users);
  });
});
```

### E2E Tests
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('UsersController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api/users (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/users')
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body.data)).toBe(true);
      });
  });
});
```

## Error Handling

### Custom Exceptions
```typescript
import { HttpException, HttpStatus } from '@nestjs/common';

export class UserNotFoundException extends HttpException {
  constructor(userId: string) {
    super(`User with ID ${userId} not found`, HttpStatus.NOT_FOUND);
  }
}

// Usage
throw new UserNotFoundException(id);
```

### Standard Exceptions
```typescript
import { 
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';

// Bad request (400)
throw new BadRequestException('Invalid input data');

// Unauthorized (401)
throw new UnauthorizedException('Invalid credentials');

// Not found (404)
throw new NotFoundException('Resource not found');

// Forbidden (403)
throw new ForbiddenException('Access denied');

// Conflict (409)
throw new ConflictException('Resource already exists');
```

## Security

### Authentication
```typescript
// Protect route
@UseGuards(JwtAuthGuard)
@Get('profile')
getProfile(@CurrentUser() user: User) {
  return user;
}

// Public route
@Public()
@Post('register')
register(@Body() dto: RegisterDto) {
  return this.authService.register(dto);
}
```

### Authorization
```typescript
// Role-based
@Roles(UserRole.ADMIN)
@Get('admin-only')
adminRoute() {
  return 'Admin content';
}

// Ownership-based
@RequireOwnership()
@Patch(':id')
update(@Param('id') id: string, @Body() dto: UpdateDto) {
  return this.service.update(id, dto);
}
```

## Performance Tips

1. **Use Pagination**
   ```typescript
   @Get()
   findAll(@Query() paginationDto: PaginationDto) {
     return this.service.findAll(paginationDto);
   }
   ```

2. **Optimize Queries**
   ```typescript
   // Use select to limit fields
   await this.repository.find({
     select: ['id', 'name', 'email'],
   });

   // Use relations wisely
   await this.repository.find({
     relations: ['profile'],
   });
   ```

3. **Use Caching**
   ```typescript
   import { CacheModule } from '@nestjs/cache-manager';
   
   @Module({
     imports: [CacheModule.register()],
   })
   ```

4. **Database Indexing**
   ```typescript
   @Entity()
   @Index(['email']) // Add index
   export class User {
     @Column({ unique: true })
     email: string;
   }
   ```

## Debugging

### VSCode Launch Configuration
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug NestJS",
      "runtimeArgs": ["--nolazy", "-r", "ts-node/register"],
      "args": ["${workspaceFolder}/src/main.ts"],
      "cwd": "${workspaceFolder}",
      "protocol": "inspector",
      "console": "integratedTerminal"
    }
  ]
}
```

### Logging
```typescript
import { Logger } from '@nestjs/common';

export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  async findAll() {
    this.logger.log('Fetching all users');
    this.logger.debug('Debug information');
    this.logger.warn('Warning message');
    this.logger.error('Error occurred', stack);
  }
}
```

## Deployment

### Build for Production
```bash
npm run build
```

### Run Production Server
```bash
NODE_ENV=production npm run start:prod
```

### Docker
```bash
docker build -t salon-backend .
docker run -p 3000:3000 salon-backend
```

### Environment Variables Checklist
- [ ] `NODE_ENV=production`
- [ ] Strong `JWT_SECRET`
- [ ] Database credentials
- [ ] External API keys
- [ ] CORS origins
- [ ] Logging level

## Common Issues

### Port Already in Use
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :3000
kill -9 <PID>
```

### Database Connection Issues
- Check credentials in `.env`
- Verify database server is running
- Check firewall settings
- Verify SSL configuration

### Module Not Found
```bash
npm install
npm run build
```

## Resources

- [NestJS Documentation](https://docs.nestjs.com/)
- [TypeORM Documentation](https://typeorm.io/)
- [Swagger/OpenAPI](https://swagger.io/)
- [Jest Testing](https://jestjs.io/)

## Getting Help

1. Check existing documentation
2. Search GitHub issues
3. Review Swagger API docs
4. Check application logs
5. Create detailed bug report

---

Happy coding! 🚀
