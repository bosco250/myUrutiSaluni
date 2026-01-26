import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ForbiddenException,
  Query,
  Put,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { RequirePermission } from '../auth/decorators/require-employee-permission.decorator';
import { EmployeePermission } from '../common/enums/employee-permission.enum';
import { SalonsService } from '../salons/salons.service';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly salonsService: SalonsService,
  ) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN)
  @ApiOperation({ summary: 'Create a new user' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.DISTRICT_LEADER,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  )
  @RequirePermission(EmployeePermission.MANAGE_EMPLOYEE_SCHEDULES)
  @ApiOperation({
    summary: 'Get all users (for searching/selecting employees)',
  })
  findAll(@CurrentUser() user: any, @Query('role') role?: UserRole) {
    // District leaders can only see users in their district (simplified for now)
    if (user.role === UserRole.DISTRICT_LEADER) {
      // TODO: Filter by district when district info is available
      return this.usersService.findAll(role);
    }
    // Salon owners and employees can see users to add as employees (limited fields)
    if (
      user.role === UserRole.SALON_OWNER ||
      user.role === UserRole.SALON_EMPLOYEE
    ) {
      return this.usersService.findAllForEmployeeSelection();
    }
    return this.usersService.findAll(role);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  async getCurrentUser(@CurrentUser() user: any) {
    return this.usersService.findOne(user.id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  async updateCurrentUser(
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() user: any,
  ) {
    return this.update(user.id, updateUserDto, user);
  }

  @Put('me')
  @ApiOperation({ summary: 'Update current user profile (PUT)' })
  async updateCurrentUserPut(
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() user: any,
  ) {
    return this.update(user.id, updateUserDto, user);
  }


  @Post('names')
  @ApiOperation({
    summary: 'Get user names by IDs (for commission transactions)',
    description:
      'Allows fetching user names for commission-related transactions. Returns only id and fullName.',
  })
  async getUserNames(@Body() body: { userIds: string[] }) {
    // Allow salon owners and employees to fetch names for commission transactions
    // This is needed for displaying "Paid to" / "Paid by" in wallet history
    return this.usersService.findNamesByIds(body.userIds || []);
  }

  @Get(':id')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.DISTRICT_LEADER,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  )
  @ApiOperation({ summary: 'Get a user by ID' })
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    // Users can always see their own profile
    if (id === user.id) {
      return this.usersService.findOne(id);
    }

    // Admins and district leaders can see all profiles
    if (
      user.role === UserRole.SUPER_ADMIN ||
      user.role === UserRole.ASSOCIATION_ADMIN ||
      user.role === UserRole.DISTRICT_LEADER
    ) {
      return this.usersService.findOne(id);
    }

    // Salon owners can view profiles of their employees
    if (user.role === UserRole.SALON_OWNER) {
      // Get all salons owned by this user
      const ownedSalons = await this.salonsService.findByOwnerId(user.id);

      // Check if the requested user is an employee of any owned salon
      for (const salon of ownedSalons) {
        const isEmployee = await this.salonsService.isUserEmployeeOfSalon(
          id,
          salon.id,
        );
        if (isEmployee) {
          return this.usersService.findOne(id);
        }
      }

      // Salon owner can also view their own profile (already handled above)
      throw new ForbiddenException(
        'You can only view profiles of your employees',
      );
    }

    // Employees can view profiles of colleagues in the same salon
    if (user.role === UserRole.SALON_EMPLOYEE) {
      // Get salons where this employee works
      const employeeRecords = await this.salonsService.findAllEmployeesByUserId(
        user.id,
      );

      // Check if the requested user is in any of the same salons
      for (const record of employeeRecords) {
        const isColleague = await this.salonsService.isUserEmployeeOfSalon(
          id,
          record.salonId,
        );
        if (isColleague) {
          return this.usersService.findOne(id);
        }

        // Also check if the requested user is the salon owner
        const salon = await this.salonsService.findOne(record.salonId);
        if (salon.ownerId === id) {
          return this.usersService.findOne(id);
        }
      }

      throw new ForbiddenException(
        'You can only view profiles of colleagues in your salon',
      );
    }

    // Default: deny access
    throw new ForbiddenException(
      'You do not have permission to view this profile',
    );
  }

  @Patch(':id')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
    UserRole.CUSTOMER,
  )
  @ApiOperation({ summary: 'Update a user' })
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() user: any,
  ) {
    // Users can update their own profile (limited fields)
    if (id === user.id) {
      // Salon owners and employees can only update limited fields
      if (
        user.role === UserRole.SALON_OWNER ||
        user.role === UserRole.SALON_EMPLOYEE
      ) {
        /* eslint-disable @typescript-eslint/no-unused-vars */
        const {
          role: _,
          isActive: __,
          membershipNumber: ___,
          ...limitedFields
        } = updateUserDto;
        /* eslint-enable @typescript-eslint/no-unused-vars */
        return this.usersService.update(id, limitedFields);
      }
      // Regular users cannot update membership number
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { membershipNumber: _, ...userFields } = updateUserDto;
      return this.usersService.update(id, userFields);
    }

    // Only admins can update other users
    if (
      user.role !== UserRole.SUPER_ADMIN &&
      user.role !== UserRole.ASSOCIATION_ADMIN
    ) {
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
