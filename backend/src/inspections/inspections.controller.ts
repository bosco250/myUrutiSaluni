import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InspectionsService } from './inspections.service';
import { CreateInspectionDto } from './dto/create-inspection.dto';
import { UpdateInspectionDto } from './dto/update-inspection.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';
import { InspectionStatus } from './entities/inspection.entity';

@ApiTags('Inspections')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inspections')
export class InspectionsController {
  constructor(private readonly inspectionsService: InspectionsService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN)
  @ApiOperation({ summary: 'Schedule a new inspection' })
  create(@Body() createDto: CreateInspectionDto, @CurrentUser() user: any) {
    return this.inspectionsService.create({
      ...createDto,
      inspectorId: createDto.inspectorId || user.id,
    });
  }

  @Get()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.DISTRICT_LEADER,
  )
  @ApiOperation({ summary: 'Get all inspections' })
  findAll(
    @Query('salonId') salonId?: string,
    @Query('status') status?: InspectionStatus,
  ) {
    return this.inspectionsService.findAll(salonId, status);
  }

  @Get('upcoming')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.DISTRICT_LEADER,
  )
  @ApiOperation({ summary: 'Get upcoming inspections' })
  getUpcoming(@Query('days') days?: number) {
    return this.inspectionsService.getUpcomingInspections(
      days ? parseInt(days.toString()) : 30,
    );
  }

  @Get('overdue')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.DISTRICT_LEADER,
  )
  @ApiOperation({ summary: 'Get overdue inspections' })
  getOverdue() {
    return this.inspectionsService.getOverdueInspections();
  }

  @Get('statistics')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.DISTRICT_LEADER,
  )
  @ApiOperation({ summary: 'Get compliance statistics' })
  getStatistics(@Query('salonId') salonId?: string) {
    return this.inspectionsService.getComplianceStatistics(salonId);
  }

  @Get('salon/:salonId/history')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.DISTRICT_LEADER,
    UserRole.SALON_OWNER,
  )
  @ApiOperation({ summary: 'Get salon inspection history' })
  getSalonHistory(@Param('salonId') salonId: string) {
    return this.inspectionsService.getSalonInspectionHistory(salonId);
  }

  @Get(':id')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.DISTRICT_LEADER,
    UserRole.SALON_OWNER,
  )
  @ApiOperation({ summary: 'Get inspection by ID' })
  findOne(@Param('id') id: string) {
    return this.inspectionsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN)
  @ApiOperation({ summary: 'Update inspection' })
  update(@Param('id') id: string, @Body() updateDto: UpdateInspectionDto) {
    return this.inspectionsService.update(id, updateDto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN)
  @ApiOperation({ summary: 'Delete inspection' })
  remove(@Param('id') id: string) {
    return this.inspectionsService.remove(id);
  }
}
