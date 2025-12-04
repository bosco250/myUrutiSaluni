import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ForbiddenException, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN)
  @ApiOperation({ summary: 'Create a new user' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.DISTRICT_LEADER, UserRole.SALON_OWNER)
  @ApiOperation({ summary: 'Get all users (for searching/selecting employees)' })
  findAll(@CurrentUser() user: any, @Query('role') role?: UserRole) {
    // District leaders can only see users in their district (simplified for now)
    if (user.role === UserRole.DISTRICT_LEADER) {
      // TODO: Filter by district when district info is available
      return this.usersService.findAll(role);
    }
    // Salon owners can see users to add as employees (limited fields)
    if (user.role === UserRole.SALON_OWNER) {
      return this.usersService.findAllForEmployeeSelection();
    }
    return this.usersService.findAll(role);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  async getCurrentUser(@CurrentUser() user: any) {
    return this.usersService.findOne(user.id);
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.DISTRICT_LEADER, UserRole.SALON_OWNER, UserRole.SALON_EMPLOYEE)
  @ApiOperation({ summary: 'Get a user by ID' })
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    // Users can always see their own profile
    if (id === user.id) {
      return this.usersService.findOne(id);
    }
    
    // Salon owners and employees can only see their own profile
    if (user.role === UserRole.SALON_OWNER || user.role === UserRole.SALON_EMPLOYEE) {
      throw new ForbiddenException('You can only view your own profile');
    }
    
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.SALON_OWNER, UserRole.SALON_EMPLOYEE)
  @ApiOperation({ summary: 'Update a user' })
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() user: any,
  ) {
    // Users can update their own profile (limited fields)
    if (id === user.id) {
      // Salon owners and employees can only update limited fields
      if (user.role === UserRole.SALON_OWNER || user.role === UserRole.SALON_EMPLOYEE) {
        const { role, isActive, membershipNumber, ...limitedFields } = updateUserDto;
        return this.usersService.update(id, limitedFields);
      }
      // Regular users cannot update membership number
      const { membershipNumber, ...userFields } = updateUserDto;
      return this.usersService.update(id, userFields);
    }
    
    // Only admins can update other users
    if (user.role !== UserRole.SUPER_ADMIN && user.role !== UserRole.ASSOCIATION_ADMIN) {
      throw new ForbiddenException('You can only update your own profile');
    }
    
    return this.usersService.update(id, updateUserDto);
  }

  @Patch(':id/membership-number')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN)
  @ApiOperation({ summary: 'Assign or update membership number for a user' })
  async assignMembershipNumber(
    @Param('id') id: string,
    @Body() body: { membershipNumber?: string },
  ) {
    return this.usersService.assignMembershipNumber(id, body.membershipNumber);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN)
  @ApiOperation({ summary: 'Delete a user' })
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}

