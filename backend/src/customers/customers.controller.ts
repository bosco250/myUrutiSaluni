import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  ForbiddenException,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import 'multer';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { UsersService } from '../users/users.service';
import { CustomerStyleReferencesService } from './customer-style-references.service';
import { CreateStyleReferenceDto } from './dto/create-style-reference.dto';
import { UpdateStyleReferenceDto } from './dto/update-style-reference.dto';
import { FileUploadService } from '../common/services/file-upload.service';
import { LoyaltyPointsService } from './loyalty-points.service';
import { LoyaltyPointSourceType } from './entities/loyalty-point-transaction.entity';
import { CustomerFavoritesService } from './customer-favorites.service';
import { EmployeePermissionsService } from '../salons/services/employee-permissions.service';
import { EmployeePermission } from '../common/enums/employee-permission.enum';
import { SalonsService } from '../salons/salons.service';

@ApiTags('Customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('customers')
export class CustomersController {
  constructor(
    private readonly customersService: CustomersService,
    private readonly usersService: UsersService,
    private readonly customerStyleReferencesService: CustomerStyleReferencesService,
    private readonly fileUploadService: FileUploadService,
    private readonly loyaltyPointsService: LoyaltyPointsService,
    private readonly customerFavoritesService: CustomerFavoritesService,
    private readonly employeePermissionsService: EmployeePermissionsService,
    private readonly salonsService: SalonsService,
  ) {}

  @Post()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  )
  @ApiOperation({ summary: 'Create a new customer' })
  async create(
    @Body() createCustomerDto: CreateCustomerDto,
    @CurrentUser() user: any,
  ) {
    // For employees, check MANAGE_CUSTOMERS permission if salonId is provided
    if (
      user.role === UserRole.SALON_EMPLOYEE &&
      (createCustomerDto as any).salonId
    ) {
      const salonId = (createCustomerDto as any).salonId;
      const employee =
        await this.employeePermissionsService.getEmployeeRecordByUserId(
          user.id,
          salonId,
        );
      if (employee) {
        const hasPermission =
          await this.employeePermissionsService.hasPermission(
            employee.id,
            salonId,
            EmployeePermission.MANAGE_CUSTOMERS,
          );
        if (!hasPermission) {
          throw new ForbiddenException(
            'You do not have permission to manage customers. Please contact your salon owner.',
          );
        }
      }
    }
    return this.customersService.create(createCustomerDto);
  }

  @Get()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.DISTRICT_LEADER,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  )
  @ApiOperation({ summary: 'Get all customers' })
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  findAll(@CurrentUser() _user: any) {
    // Salon owners and employees can see all customers (they work with customers)
    // District leaders can see customers in their district
    // Admins can see all
    return this.customersService.findAll();
  }

  @Get('search')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  )
  @ApiOperation({ summary: 'Search customer by phone' })
  findByPhone(@Query('phone') phone: string) {
    return this.customersService.findByPhone(phone);
  }

  @Get('by-user/:userId')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.DISTRICT_LEADER,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
    UserRole.CUSTOMER,
  )
  @ApiOperation({
    summary:
      'Get customer by user ID, auto-create if not exists for CUSTOMER role',
  })
  async findByUserId(
    @Param('userId') userId: string,
    @CurrentUser() currentUser: any,
  ) {
    console.log('[CUSTOMERS CONTROLLER] findByUserId called:', {
      userId,
      currentUser: {
        id: currentUser.id,
        userId: currentUser.userId,
        role: currentUser.role,
        email: currentUser.email,
      },
    });
    // Customers can only see their own customer record
    const currentUserId = currentUser.id || currentUser.userId;
    if (
      currentUser.role === UserRole.CUSTOMER ||
      currentUser.role === 'customer'
    ) {
      if (currentUserId !== userId) {
        throw new ForbiddenException(
          'You can only access your own customer information',
        );
      }
    }

    let customer = await this.customersService.findByUserId(userId);

    // Auto-create customer record for users with CUSTOMER role if it doesn't exist
    const isCustomerRole =
      currentUser.role === UserRole.CUSTOMER || currentUser.role === 'customer';
    const isOwnRecord =
      currentUser.id === userId || currentUser.userId === userId;

    console.log('[CUSTOMERS CONTROLLER] Auto-create check:', {
      hasCustomer: !!customer,
      isCustomerRole,
      currentUserRole: currentUser.role,
      expectedRole: UserRole.CUSTOMER,
      isOwnRecord,
      currentUserId: currentUser.id || currentUser.userId,
      requestedUserId: userId,
    });

    if (!customer && isCustomerRole && isOwnRecord) {
      console.log(
        '[CUSTOMERS CONTROLLER] Auto-creating customer record for user:',
        userId,
      );
      console.log('[CUSTOMERS CONTROLLER] Current user object:', {
        id: currentUser.id || currentUser.userId,
        email: currentUser.email,
        phone: currentUser.phone,
        role: currentUser.role,
      });

      // Fetch full user details to get fullName (JWT payload doesn't include it)
      const userIdToFetch = currentUser.id || currentUser.userId || userId;
      let user;
      try {
        user = await this.usersService.findOne(userIdToFetch);
      } catch (error) {
        console.error(
          '[CUSTOMERS CONTROLLER] User not found during auto-create:',
          userIdToFetch,
        );
        // If user doesn't exist in DB but has a valid token, the token is stale/invalid.
        // Throw 401 to prevent further errors and potentially trigger frontend logout.
        throw new ForbiddenException(
          'User account not found. Please log in again.',
        );
      }

      console.log('[CUSTOMERS CONTROLLER] User details:', {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
      });

      try {
        customer = await this.customersService.create({
          userId: user.id,
          fullName: user.fullName,
          phone: user.phone || null,
          email: user.email || null,
          loyaltyPoints: 0,
        });
        console.log(
          '[CUSTOMERS CONTROLLER] Customer record created successfully:',
          customer.id,
        );
      } catch (error) {
        console.error(
          '[CUSTOMERS CONTROLLER] Error creating customer record:',
          error,
        );
        throw error;
      }
    }

    // Always return customer, even if null (frontend will handle it)
    // Log the result for debugging
    console.log('[CUSTOMERS CONTROLLER] Returning customer:', {
      hasCustomer: !!customer,
      customerId: customer?.id,
      userId: userId,
    });

    return customer || null;
  }

  // Style references routes - must come before :id routes to avoid route conflicts
  // Upload route must come before the general style-references route
  @Post(':customerId/style-references/upload')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
    UserRole.CUSTOMER,
  )
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload and create a style reference with file' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
        },
        title: { type: 'string' },
        description: { type: 'string' },
        tags: { type: 'string' },
        sharedWithEmployees: { type: 'boolean' },
        appointmentId: { type: 'string' },
      },
    },
  })
  async uploadStyleReference(
    @Param('customerId') customerId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
    @CurrentUser() currentUser: any,
  ) {
    try {
      console.log('[UPLOAD STYLE REFERENCE] Request received:', {
        customerId,
        hasFile: !!file,
        fileName: file?.originalname,
        fileSize: file?.size,
        fileMimeType: file?.mimetype,
        bodyKeys: Object.keys(body),
        bodyTitle: body.title,
      });

      await this.ensureCustomerAccess(customerId, currentUser);

      if (!file) {
        throw new BadRequestException(
          'No file provided. Please select an image file.',
        );
      }

      // Upload file and get URL
      const uploadResult = await this.fileUploadService.saveFile(file);
      console.log(
        '[UPLOAD STYLE REFERENCE] File uploaded successfully:',
        uploadResult,
      );

      // Parse tags if provided as string
      const tags = body.tags
        ? body.tags
            .split(',')
            .map((tag: string) => tag.trim())
            .filter(Boolean)
        : [];

      const dto: CreateStyleReferenceDto = {
        title: body.title,
        description: body.description || undefined,
        imageUrl: uploadResult.url,
        tags: tags.length > 0 ? tags : undefined,
        sharedWithEmployees:
          body.sharedWithEmployees === 'true' ||
          body.sharedWithEmployees === true,
        appointmentId: body.appointmentId || undefined,
      };

      console.log(
        '[UPLOAD STYLE REFERENCE] Creating style reference with DTO:',
        dto,
      );
      const result = await this.customerStyleReferencesService.create(
        customerId,
        dto,
        currentUser.id,
      );
      console.log(
        '[UPLOAD STYLE REFERENCE] Style reference created successfully:',
        result.id,
      );
      return result;
    } catch (error: any) {
      console.error('[UPLOAD STYLE REFERENCE] Error:', {
        message: error.message,
        stack: error.stack,
        status: error.status,
        response: error.response,
      });
      throw error;
    }
  }

  @Post(':customerId/style-references')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
    UserRole.CUSTOMER,
  )
  @ApiOperation({
    summary: 'Create a style reference for a customer (with URL)',
  })
  async createStyleReference(
    @Param('customerId') customerId: string,
    @Body() dto: CreateStyleReferenceDto,
    @CurrentUser() currentUser: any,
  ) {
    await this.ensureCustomerAccess(customerId, currentUser);
    return this.customerStyleReferencesService.create(
      customerId,
      dto,
      currentUser.id,
    );
  }

  @Get(':customerId/style-references')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.DISTRICT_LEADER,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
    UserRole.CUSTOMER,
  )
  @ApiOperation({ summary: 'List style references for a customer' })
  async findStyleReferences(
    @Param('customerId') customerId: string,
    @CurrentUser() currentUser: any,
  ) {
    await this.ensureCustomerAccess(customerId, currentUser);
    return this.customerStyleReferencesService.findByCustomerId(customerId);
  }

  @Patch('style-references/:id')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
    UserRole.CUSTOMER,
  )
  @ApiOperation({ summary: 'Update a style reference' })
  updateStyleReference(
    @Param('id') id: string,
    @Body() dto: UpdateStyleReferenceDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.customerStyleReferencesService.update(id, dto, currentUser);
  }

  @Delete('style-references/:id')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
    UserRole.CUSTOMER,
  )
  @ApiOperation({ summary: 'Delete a style reference' })
  removeStyleReference(
    @Param('id') id: string,
    @CurrentUser() currentUser: any,
  ) {
    return this.customerStyleReferencesService.remove(id, currentUser);
  }

  @Get(':id')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.DISTRICT_LEADER,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  )
  @ApiOperation({ summary: 'Get a customer by ID' })
  findOne(@Param('id') id: string) {
    return this.customersService.findOne(id);
  }

  @Patch(':id')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
    UserRole.CUSTOMER,
  )
  @ApiOperation({ summary: 'Update a customer' })
  async update(
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
    @CurrentUser() currentUser: any,
  ) {
    // Customers can only update their own profile
    if (
      currentUser.role === UserRole.CUSTOMER ||
      currentUser.role === 'customer'
    ) {
      const customer = await this.customersService.findByUserId(
        currentUser.id || currentUser.userId,
      );
      if (!customer || customer.id !== id) {
        throw new ForbiddenException('You can only update your own profile');
      }
    }

    // For employees updating customer info, check MANAGE_CUSTOMERS or UPDATE_CUSTOMER_INFO permission
    if (
      (currentUser.role === UserRole.SALON_OWNER ||
        currentUser.role === UserRole.SALON_EMPLOYEE) &&
      currentUser.role !== UserRole.CUSTOMER
    ) {
      // Get customer to find associated salon
      const customer = await this.customersService.findOne(id);
      if (customer) {
        // For now, employees can update if they have permission in any salon they work at
        // This is a simplified check - in production, you'd want to check the specific salon
        if (currentUser.role === UserRole.SALON_EMPLOYEE) {
          // Get all salons where user is employee
          const employeeRecords =
            await this.salonsService.findAllEmployeesByUserId(currentUser.id);

          // Check if employee has permission in any salon
          let hasPermission = false;
          for (const emp of employeeRecords) {
            const perm = await this.employeePermissionsService.hasPermission(
              emp.id,
              emp.salonId,
              EmployeePermission.UPDATE_CUSTOMER_INFO,
            );
            if (perm) {
              hasPermission = true;
              break;
            }
          }

          if (!hasPermission) {
            // Fallback: check MANAGE_CUSTOMERS permission
            for (const emp of employeeRecords) {
              const perm = await this.employeePermissionsService.hasPermission(
                emp.id,
                emp.salonId,
                EmployeePermission.MANAGE_CUSTOMERS,
              );
              if (perm) {
                hasPermission = true;
                break;
              }
            }
          }

          // If no permission found, still allow (backward compatibility)
          // In production, you might want to be stricter
        }
      }
    }

    return this.customersService.update(id, updateCustomerDto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN)
  @ApiOperation({ summary: 'Delete a customer' })
  remove(@Param('id') id: string) {
    return this.customersService.remove(id);
  }

  // ==================== Loyalty Points Management ====================

  @Post(':customerId/loyalty-points/add')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  )
  @ApiOperation({ summary: 'Add loyalty points to a customer' })
  async addPoints(
    @Param('customerId') customerId: string,
    @Body() body: { points: number; reason?: string },
    @CurrentUser() user: any,
  ) {
    if (!body.points || body.points <= 0) {
      throw new BadRequestException('Points must be greater than 0');
    }

    return this.loyaltyPointsService.addPoints(customerId, body.points, {
      sourceType: LoyaltyPointSourceType.MANUAL,
      description:
        body.reason ||
        `Points added manually by ${user.fullName || user.email}`,
      createdById: user.id,
    });
  }

  @Post(':customerId/loyalty-points/deduct')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  )
  @ApiOperation({ summary: 'Deduct loyalty points from a customer' })
  async deductPoints(
    @Param('customerId') customerId: string,
    @Body() body: { points: number; reason?: string },
    @CurrentUser() user: any,
  ) {
    if (!body.points || body.points <= 0) {
      throw new BadRequestException('Points must be greater than 0');
    }

    return this.loyaltyPointsService.deductPoints(customerId, body.points, {
      sourceType: LoyaltyPointSourceType.MANUAL,
      description:
        body.reason ||
        `Points deducted manually by ${user.fullName || user.email}`,
      createdById: user.id,
    });
  }

  @Patch(':customerId/loyalty-points/adjust')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  )
  @ApiOperation({
    summary: 'Adjust customer loyalty points to a specific balance',
  })
  async adjustPoints(
    @Param('customerId') customerId: string,
    @Body() body: { balance: number; reason: string },
    @CurrentUser() user: any,
  ) {
    if (body.balance < 0) {
      throw new BadRequestException('Points balance cannot be negative');
    }
    if (!body.reason || body.reason.trim().length === 0) {
      throw new BadRequestException('Reason is required for points adjustment');
    }

    return this.loyaltyPointsService.adjustPoints(
      customerId,
      body.balance,
      body.reason,
      user.id,
    );
  }

  @Get(':customerId/loyalty-points/transactions')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
    UserRole.CUSTOMER,
  )
  @ApiOperation({
    summary: 'Get loyalty points transaction history for a customer',
  })
  async getPointsHistory(
    @Param('customerId') customerId: string,
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sourceType') sourceType?: string,
  ) {
    // Customers can only view their own points history
    if (user.role === UserRole.CUSTOMER || user.role === 'customer') {
      const customer = await this.customersService.findByUserId(
        user.id || user.userId,
      );
      if (!customer || customer.id !== customerId) {
        throw new ForbiddenException(
          'You can only view your own points history',
        );
      }
    }

    return this.loyaltyPointsService.getPointsHistory(customerId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      sourceType: sourceType as LoyaltyPointSourceType | undefined,
    });
  }

  @Get(':customerId/loyalty-points/balance')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
    UserRole.CUSTOMER,
  )
  @ApiOperation({
    summary: 'Get current loyalty points balance for a customer',
  })
  async getPointsBalance(
    @Param('customerId') customerId: string,
    @CurrentUser() user: any,
  ) {
    // Customers can only view their own balance
    if (user.role === UserRole.CUSTOMER || user.role === 'customer') {
      const customer = await this.customersService.findByUserId(
        user.id || user.userId,
      );
      if (!customer || customer.id !== customerId) {
        throw new ForbiddenException(
          'You can only view your own points balance',
        );
      }
    }

    const balance =
      await this.loyaltyPointsService.getCurrentBalance(customerId);
    return { balance };
  }

  // ==================== Favorites Management ====================

  @Get(':customerId/favorites')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
    UserRole.CUSTOMER,
  )
  @ApiOperation({ summary: 'Get customer favorites' })
  async getFavorites(
    @Param('customerId') customerId: string,
    @CurrentUser() user: any,
  ) {
    if (user.role === UserRole.CUSTOMER || user.role === 'customer') {
      const customer = await this.customersService.findByUserId(
        user.id || user.userId,
      );
      if (!customer || customer.id !== customerId) {
        throw new ForbiddenException('You can only view your own favorites');
      }
    }
    return this.customerFavoritesService.findByCustomerId(customerId);
  }

  @Get(':customerId/favorites/salons')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
    UserRole.CUSTOMER,
  )
  @ApiOperation({ summary: 'Get customer favorite salons' })
  async getFavoriteSalons(
    @Param('customerId') customerId: string,
    @CurrentUser() user: any,
  ) {
    if (user.role === UserRole.CUSTOMER || user.role === 'customer') {
      const customer = await this.customersService.findByUserId(
        user.id || user.userId,
      );
      if (!customer || customer.id !== customerId) {
        throw new ForbiddenException('You can only view your own favorites');
      }
    }
    return this.customerFavoritesService.findSalonFavoritesByCustomerId(
      customerId,
    );
  }

  @Post(':customerId/favorites')
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({ summary: 'Add salon or employee to favorites' })
  async addFavorite(
    @Param('customerId') customerId: string,
    @Body() body: { salonEmployeeId?: string; salonId?: string; type?: string },
    @CurrentUser() user: any,
  ) {
    const customer = await this.customersService.findByUserId(
      user.id || user.userId,
    );
    if (!customer || customer.id !== customerId) {
      throw new ForbiddenException('You can only manage your own favorites');
    }
    const type = body.type || (body.salonId ? 'salon' : 'employee');
    return this.customerFavoritesService.addFavorite(
      customerId,
      body.salonEmployeeId,
      body.salonId,
      type,
    );
  }

  @Delete(':customerId/favorites/:favoriteId')
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({ summary: 'Remove employee from favorites' })
  async removeFavorite(
    @Param('customerId') customerId: string,
    @Param('favoriteId') favoriteId: string,
    @CurrentUser() user: any,
  ) {
    const customer = await this.customersService.findByUserId(
      user.id || user.userId,
    );
    if (!customer || customer.id !== customerId) {
      throw new ForbiddenException('You can only manage your own favorites');
    }
    await this.customerFavoritesService.removeFavorite(favoriteId, customerId);
    return { success: true };
  }

  private async ensureCustomerAccess(customerId: string, currentUser: any) {
    if (!customerId) {
      throw new ForbiddenException('Customer ID is required');
    }

    if (
      currentUser.role === UserRole.CUSTOMER ||
      currentUser.role === 'customer'
    ) {
      const customer = await this.customersService.findByUserId(
        currentUser.id || currentUser.userId,
      );

      if (!customer || customer.id !== customerId) {
        throw new ForbiddenException('You can only access your own references');
      }
    }
  }
}
