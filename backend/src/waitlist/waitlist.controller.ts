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
import { WaitlistService } from './waitlist.service';
import { CreateWaitlistEntryDto } from './dto/create-waitlist-entry.dto';
import { UpdateWaitlistEntryDto } from './dto/update-waitlist-entry.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { WaitlistStatus } from './entities/waitlist-entry.entity';

@ApiTags('Waitlist')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('waitlist')
export class WaitlistController {
  constructor(private readonly waitlistService: WaitlistService) {}

  @Post()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
    UserRole.CUSTOMER,
  )
  @ApiOperation({ summary: 'Add customer to waitlist' })
  create(@Body() createDto: CreateWaitlistEntryDto) {
    return this.waitlistService.create(createDto);
  }

  @Get()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  )
  @ApiOperation({ summary: 'Get all waitlist entries' })
  findAll(
    @Query('salonId') salonId?: string,
    @Query('status') status?: WaitlistStatus,
  ) {
    return this.waitlistService.findAll(salonId, status);
  }

  @Get('next-available')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  )
  @ApiOperation({ summary: 'Get next available customer from waitlist' })
  getNextAvailable(
    @Query('salonId') salonId: string,
    @Query('serviceId') serviceId?: string,
  ) {
    return this.waitlistService.getNextAvailable(salonId, serviceId);
  }

  @Get(':id')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
    UserRole.CUSTOMER,
  )
  @ApiOperation({ summary: 'Get waitlist entry by ID' })
  findOne(@Param('id') id: string) {
    return this.waitlistService.findOne(id);
  }

  @Patch(':id')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  )
  @ApiOperation({ summary: 'Update waitlist entry' })
  update(@Param('id') id: string, @Body() updateDto: UpdateWaitlistEntryDto) {
    return this.waitlistService.update(id, updateDto);
  }

  @Post(':id/contact')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  )
  @ApiOperation({ summary: 'Mark customer as contacted' })
  contactCustomer(@Param('id') id: string, @Body() body: { notes?: string }) {
    return this.waitlistService.contactCustomer(id, body.notes);
  }

  @Post(':id/convert-to-appointment')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  )
  @ApiOperation({ summary: 'Convert waitlist entry to appointment' })
  convertToAppointment(
    @Param('id') id: string,
    @Body()
    body: {
      scheduledStart: string;
      scheduledEnd: string;
      salonEmployeeId?: string;
      notes?: string;
    },
  ) {
    return this.waitlistService.convertToAppointment(id, {
      scheduledStart: new Date(body.scheduledStart),
      scheduledEnd: new Date(body.scheduledEnd),
      salonEmployeeId: body.salonEmployeeId,
      notes: body.notes,
    });
  }

  @Delete(':id')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  )
  @ApiOperation({ summary: 'Remove waitlist entry' })
  remove(@Param('id') id: string) {
    return this.waitlistService.remove(id);
  }
}
