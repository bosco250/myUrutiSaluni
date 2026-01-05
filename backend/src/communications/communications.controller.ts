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
import { CommunicationsService } from './communications.service';
import { CreateCommunicationDto } from './dto/create-communication.dto';
import { UpdateCommunicationDto } from './dto/update-communication.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('Communications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('communications')
export class CommunicationsController {
  constructor(private readonly communicationsService: CommunicationsService) {}

  @Post()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  )
  @ApiOperation({ summary: 'Create a communication record' })
  create(@Body() createDto: CreateCommunicationDto, @CurrentUser() user: any) {
    return this.communicationsService.create({
      ...createDto,
      userId: createDto.userId || user.id,
    });
  }

  @Get()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  )
  @ApiOperation({ summary: 'Get all communications' })
  findAll(
    @Query('customerId') customerId?: string,
    @Query('limit') limit?: number,
  ) {
    return this.communicationsService.findAll(
      customerId,
      limit ? parseInt(limit.toString()) : 100,
    );
  }

  @Get('timeline/:customerId')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  )
  @ApiOperation({ summary: 'Get customer communication timeline' })
  getCustomerTimeline(@Param('customerId') customerId: string) {
    return this.communicationsService.getCustomerTimeline(customerId);
  }

  @Get('follow-ups')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  )
  @ApiOperation({ summary: 'Get pending follow-ups' })
  getPendingFollowUps(@Query('customerId') customerId?: string) {
    return this.communicationsService.getPendingFollowUps(customerId);
  }

  @Get('statistics')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  )
  @ApiOperation({ summary: 'Get communication statistics' })
  getStatistics(@Query('customerId') customerId?: string) {
    return this.communicationsService.getStatistics(customerId);
  }

  @Get(':id')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  )
  @ApiOperation({ summary: 'Get communication by ID' })
  findOne(@Param('id') id: string) {
    return this.communicationsService.findOne(id);
  }

  @Patch(':id')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  )
  @ApiOperation({ summary: 'Update communication' })
  update(@Param('id') id: string, @Body() updateDto: UpdateCommunicationDto) {
    return this.communicationsService.update(id, updateDto);
  }

  @Post(':id/follow-up')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  )
  @ApiOperation({ summary: 'Create a follow-up communication' })
  createFollowUp(
    @Param('id') id: string,
    @Body() body: { scheduledFor?: string; subject: string; content?: string },
  ) {
    return this.communicationsService.createFollowUp(id, {
      scheduledFor: body.scheduledFor ? new Date(body.scheduledFor) : undefined,
      subject: body.subject,
      content: body.content,
    });
  }

  @Post(':id/mark-follow-up-complete')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  )
  @ApiOperation({ summary: 'Mark follow-up as complete' })
  markFollowUpComplete(@Param('id') id: string) {
    return this.communicationsService.markFollowUpComplete(id);
  }

  @Delete(':id')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  )
  @ApiOperation({ summary: 'Delete communication' })
  remove(@Param('id') id: string) {
    return this.communicationsService.remove(id);
  }
}
