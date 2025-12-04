import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthCheckService, TypeOrmHealthIndicator, HealthCheck } from '@nestjs/terminus';
import { Public } from '../decorators/public.decorator';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
  ) {}

  @Get()
  @Public()
  @HealthCheck()
  @ApiOperation({ summary: 'Check application health' })
  @ApiResponse({ status: 200, description: 'Application is healthy' })
  @ApiResponse({ status: 503, description: 'Application is unhealthy' })
  check() {
    return this.health.check([
      () => this.db.pingCheck('database'),
    ]);
  }

  @Get('ready')
  @Public()
  @ApiOperation({ summary: 'Check if application is ready' })
  @ApiResponse({ status: 200, description: 'Application is ready' })
  readiness() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('live')
  @Public()
  @ApiOperation({ summary: 'Check if application is alive' })
  @ApiResponse({ status: 200, description: 'Application is alive' })
  liveness() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
