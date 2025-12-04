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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
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
  ) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.SALON_OWNER, UserRole.SALON_EMPLOYEE)
  @ApiOperation({ summary: 'Create a new customer' })
  create(@Body() createCustomerDto: CreateCustomerDto) {
    return this.customersService.create(createCustomerDto);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.DISTRICT_LEADER, UserRole.SALON_OWNER, UserRole.SALON_EMPLOYEE)
  @ApiOperation({ summary: 'Get all customers' })
  findAll(@CurrentUser() user: any) {
    // Salon owners and employees can see all customers (they work with customers)
    // District leaders can see customers in their district
    // Admins can see all
    return this.customersService.findAll();
  }

  @Get('search')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.SALON_OWNER, UserRole.SALON_EMPLOYEE)
  @ApiOperation({ summary: 'Search customer by phone' })
  findByPhone(@Query('phone') phone: string) {
    return this.customersService.findByPhone(phone);
  }

  @Get('by-user/:userId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.DISTRICT_LEADER, UserRole.SALON_OWNER, UserRole.SALON_EMPLOYEE, UserRole.CUSTOMER)
  @ApiOperation({ summary: 'Get customer by user ID, auto-create if not exists for CUSTOMER role' })
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
    if (currentUser.role === UserRole.CUSTOMER || currentUser.role === 'customer') {
      if (currentUserId !== userId) {
        throw new ForbiddenException('You can only access your own customer information');
      }
    }
    
    let customer = await this.customersService.findByUserId(userId);
    
    // Auto-create customer record for users with CUSTOMER role if it doesn't exist
    const isCustomerRole = currentUser.role === UserRole.CUSTOMER || currentUser.role === 'customer';
    const isOwnRecord = currentUser.id === userId || currentUser.userId === userId;
    
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
      console.log('[CUSTOMERS CONTROLLER] Auto-creating customer record for user:', userId);
      console.log('[CUSTOMERS CONTROLLER] Current user object:', { 
        id: currentUser.id || currentUser.userId, 
        email: currentUser.email, 
        phone: currentUser.phone, 
        role: currentUser.role 
      });
      
      // Fetch full user details to get fullName (JWT payload doesn't include it)
      const userIdToFetch = currentUser.id || currentUser.userId || userId;
      const user = await this.usersService.findOne(userIdToFetch);
      if (!user) {
        console.error('[CUSTOMERS CONTROLLER] User not found:', userIdToFetch);
        throw new ForbiddenException('User not found');
      }
      
      console.log('[CUSTOMERS CONTROLLER] User details:', { id: user.id, fullName: user.fullName, email: user.email, phone: user.phone });
      
      try {
        customer = await this.customersService.create({
          userId: user.id,
          fullName: user.fullName,
          phone: user.phone || null,
          email: user.email || null,
          loyaltyPoints: 0,
        });
        console.log('[CUSTOMERS CONTROLLER] Customer record created successfully:', customer.id);
      } catch (error) {
        console.error('[CUSTOMERS CONTROLLER] Error creating customer record:', error);
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
        throw new BadRequestException('No file provided. Please select an image file.');
      }

      // Upload file and get URL
      const uploadResult = await this.fileUploadService.saveFile(file);
      console.log('[UPLOAD STYLE REFERENCE] File uploaded successfully:', uploadResult);

      // Parse tags if provided as string
      const tags = body.tags
        ? body.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean)
        : [];

      const dto: CreateStyleReferenceDto = {
        title: body.title,
        description: body.description || undefined,
        imageUrl: uploadResult.url,
        tags: tags.length > 0 ? tags : undefined,
        sharedWithEmployees: body.sharedWithEmployees === 'true' || body.sharedWithEmployees === true,
        appointmentId: body.appointmentId || undefined,
      };

      console.log('[UPLOAD STYLE REFERENCE] Creating style reference with DTO:', dto);
      const result = await this.customerStyleReferencesService.create(customerId, dto, currentUser.id);
      console.log('[UPLOAD STYLE REFERENCE] Style reference created successfully:', result.id);
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
  @ApiOperation({ summary: 'Create a style reference for a customer (with URL)' })
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
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.DISTRICT_LEADER, UserRole.SALON_OWNER, UserRole.SALON_EMPLOYEE)
  @ApiOperation({ summary: 'Get a customer by ID' })
  findOne(@Param('id') id: string) {
    return this.customersService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.SALON_OWNER, UserRole.SALON_EMPLOYEE, UserRole.CUSTOMER)
  @ApiOperation({ summary: 'Update a customer' })
  async update(
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
    @CurrentUser() currentUser: any,
  ) {
    // Customers can only update their own profile
    if (currentUser.role === UserRole.CUSTOMER || currentUser.role === 'customer') {
      const customer = await this.customersService.findByUserId(currentUser.id || currentUser.userId);
      if (!customer || customer.id !== id) {
        throw new ForbiddenException('You can only update your own profile');
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

  private async ensureCustomerAccess(customerId: string, currentUser: any) {
    if (!customerId) {
      throw new ForbiddenException('Customer ID is required');
    }

    if (currentUser.role === UserRole.CUSTOMER || currentUser.role === 'customer') {
      const customer = await this.customersService.findByUserId(
        currentUser.id || currentUser.userId,
      );

      if (!customer || customer.id !== customerId) {
        throw new ForbiddenException('You can only access your own references');
      }
    }
  }
}

