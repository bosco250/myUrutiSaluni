import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SystemConfigService } from './system-config.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('System Configuration')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('system-config')
export class SystemConfigController {
  constructor(private readonly configService: SystemConfigService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN)
  @ApiOperation({ summary: 'Get global system configuration' })
  getConfig() {
    return this.configService.getConfig();
  }

  @Patch()
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update global system configuration' })
  updateConfig(@Body() updateData: any) {
    return this.configService.updateConfig(updateData);
  }
}
