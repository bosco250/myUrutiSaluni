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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { EmployeePermissionGuard } from '../auth/guards/employee-permission.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequireEmployeePermission } from '../auth/decorators/require-employee-permission.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateMovementDto } from './dto/create-movement.dto';
import { SalonsService } from '../salons/salons.service';
import { EmployeePermissionsService } from '../salons/services/employee-permissions.service';
import { EmployeePermission } from '../common/enums/employee-permission.enum';

@ApiTags('Inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, EmployeePermissionGuard)
@Controller('inventory')
export class InventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly salonsService: SalonsService,
    private readonly employeePermissionsService: EmployeePermissionsService,
  ) {}

  @Post('products')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  )
  @RequireEmployeePermission(EmployeePermission.MANAGE_PRODUCTS)
  @ApiOperation({ summary: 'Create a new product' })
  async createProduct(
    @Body() createProductDto: CreateProductDto,
    @CurrentUser() user: any,
  ) {
    // Salon owners and employees can only create products for their salon
    if (
      (user.role === UserRole.SALON_OWNER ||
        user.role === UserRole.SALON_EMPLOYEE) &&
      createProductDto.salonId
    ) {
      const salon = await this.salonsService.findOne(createProductDto.salonId);

      if (user.role === UserRole.SALON_OWNER) {
        if (salon.ownerId !== user.id) {
          throw new ForbiddenException(
            'You can only create products for your own salon',
          );
        }
      } else if (user.role === UserRole.SALON_EMPLOYEE) {
        // Employees need MANAGE_PRODUCTS permission
        const employee =
          await this.employeePermissionsService.getEmployeeRecordByUserId(
            user.id,
            createProductDto.salonId,
          );
        if (employee) {
          const hasPermission =
            await this.employeePermissionsService.hasPermission(
              employee.id,
              createProductDto.salonId,
              EmployeePermission.MANAGE_PRODUCTS,
            );
          if (!hasPermission) {
            throw new ForbiddenException(
              'You do not have permission to manage products. Please contact your salon owner.',
            );
          }
        } else {
          throw new ForbiddenException(
            'You can only create products for salons you work at',
          );
        }
      }
    }
    return this.inventoryService.createProduct(createProductDto);
  }

  @Get('products')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.DISTRICT_LEADER,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
    UserRole.CUSTOMER,
  )
  @ApiOperation({ summary: 'Get all products' })
  async findAllProducts(
    @Query('salonId') salonId: string | undefined,
    @Query('browse') browse: string | undefined,
    @CurrentUser() user: any,
  ) {
    const isBrowseMode = browse === 'true';

    // Customers can view products for any salon (public browsing)
    if (user.role === UserRole.CUSTOMER || user.role === 'customer') {
      if (salonId) {
        // Return products for the specified salon
        return this.inventoryService.findAllProducts(salonId);
      }
      // If no salonId, return empty array (customers should specify a salon)
      return [];
    }

    // Employees can browse products from any salon when in browse mode
    if (user.role === UserRole.SALON_EMPLOYEE && isBrowseMode) {
      if (salonId) {
        return this.inventoryService.findAllProducts(salonId);
      }
      return [];
    }

    // Salon owners and employees (in management mode) can only see products for their salon(s)
    if (
      user.role === UserRole.SALON_OWNER ||
      user.role === UserRole.SALON_EMPLOYEE
    ) {
      let salonIds: string[] = [];

      if (user.role === UserRole.SALON_OWNER) {
        const salons = await this.salonsService.findByOwnerId(user.id);
        salonIds = salons.map((s) => s.id);
      } else {
        // For employees, find all salons they work at
        const employeeRecords =
          await this.salonsService.findAllEmployeesByUserId(user.id);
        salonIds = employeeRecords.map((e) => e.salonId);
      }

      if (salonIds.length === 0) {
        return [];
      }

      if (salonId && !salonIds.includes(salonId)) {
        throw new ForbiddenException(
          'You can only access products for your own salon',
        );
      }
      // If salonId is provided and valid, use only that salon; otherwise use all user's salons
      if (salonId && salonIds.includes(salonId)) {
        return this.inventoryService.findAllProducts(salonId);
      }
      return this.inventoryService.findProductsBySalonIds(salonIds);
    }
    // Admins can see all or filter by salonId
    return this.inventoryService.findAllProducts(salonId);
  }

  @Get('products/:id')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.DISTRICT_LEADER,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  )
  @ApiOperation({ summary: 'Get a product by ID' })
  async findOneProduct(@Param('id') id: string, @CurrentUser() user: any) {
    const product = await this.inventoryService.findOneProduct(id);

    // Salon owners and employees can only access products for their salon
    if (
      user.role === UserRole.SALON_OWNER ||
      user.role === UserRole.SALON_EMPLOYEE
    ) {
      const salon = await this.salonsService.findOne(product.salonId);

      if (user.role === UserRole.SALON_OWNER) {
        if (salon.ownerId !== user.id) {
          throw new ForbiddenException(
            'You can only access products for your own salon',
          );
        }
      } else {
        // Employee check
        const isEmployee = await this.salonsService.isUserEmployeeOfSalon(
          user.id,
          product.salonId,
        );
        if (!isEmployee) {
          throw new ForbiddenException(
            'You can only access products for salons you work at',
          );
        }
      }
    }

    return product;
  }

  @Patch('products/:id')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  )
  @RequireEmployeePermission(EmployeePermission.MANAGE_PRODUCTS)
  @ApiOperation({ summary: 'Update a product' })
  async updateProduct(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @CurrentUser() user: any,
  ) {
    const product = await this.inventoryService.findOneProduct(id);

    // Salon owners and employees can only update products for their salon
    if (
      user.role === UserRole.SALON_OWNER ||
      user.role === UserRole.SALON_EMPLOYEE
    ) {
      const salon = await this.salonsService.findOne(product.salonId);

      if (user.role === UserRole.SALON_OWNER) {
        if (salon.ownerId !== user.id) {
          throw new ForbiddenException(
            'You can only update products for your own salon',
          );
        }
      } else if (user.role === UserRole.SALON_EMPLOYEE) {
        // Employees need MANAGE_PRODUCTS permission
        const employee =
          await this.employeePermissionsService.getEmployeeRecordByUserId(
            user.id,
            product.salonId,
          );
        if (employee) {
          const hasPermission =
            await this.employeePermissionsService.hasPermission(
              employee.id,
              product.salonId,
              EmployeePermission.MANAGE_PRODUCTS,
            );
          if (!hasPermission) {
            throw new ForbiddenException(
              'You do not have permission to manage products. Please contact your salon owner.',
            );
          }
        } else {
          throw new ForbiddenException(
            'You can only update products for salons you work at',
          );
        }
      }
    }

    return this.inventoryService.updateProduct(id, updateProductDto);
  }

  @Delete('products/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.SALON_OWNER)
  @ApiOperation({ summary: 'Delete a product' })
  async removeProduct(@Param('id') id: string, @CurrentUser() user: any) {
    const product = await this.inventoryService.findOneProduct(id);

    // Salon owners can only delete products for their salon
    if (user.role === UserRole.SALON_OWNER) {
      const salon = await this.salonsService.findOne(product.salonId);
      if (salon.ownerId !== user.id) {
        throw new ForbiddenException(
          'You can only delete products for your own salon',
        );
      }
    }

    return this.inventoryService.removeProduct(id);
  }

  @Get('movements')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.DISTRICT_LEADER,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  )
  @ApiOperation({ summary: 'Get all inventory movements' })
  async findAllMovements(
    @Query('salonId') salonId: string | undefined,
    @Query('productId') productId: string | undefined,
    @CurrentUser() user: any,
  ) {
    // Salon owners and employees can only see movements for their salon(s)
    if (
      user.role === UserRole.SALON_OWNER ||
      user.role === UserRole.SALON_EMPLOYEE
    ) {
      let salonIds: string[] = [];

      if (user.role === UserRole.SALON_OWNER) {
        const salons = await this.salonsService.findByOwnerId(user.id);
        salonIds = salons.map((s) => s.id);
      } else {
        // For employees, find all salons they work at
        const employeeRecords =
          await this.salonsService.findAllEmployeesByUserId(user.id);
        salonIds = employeeRecords.map((e) => e.salonId);
      }

      if (salonIds.length === 0) {
        return [];
      }

      if (salonId && !salonIds.includes(salonId)) {
        throw new ForbiddenException(
          'You can only access movements for your own salon',
        );
      }
      // If no salonId specified, filter by all user's salons
      const filteredSalonId =
        salonId || (salonIds.length === 1 ? salonIds[0] : undefined);
      return this.inventoryService.findAllMovements(filteredSalonId, productId);
    }
    // Admins can see all or filter by salonId/productId
    return this.inventoryService.findAllMovements(salonId, productId);
  }

  @Post('movements')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  )
  @RequireEmployeePermission(EmployeePermission.MANAGE_INVENTORY)
  @ApiOperation({ summary: 'Create a new inventory movement' })
  async createMovement(
    @Body() createMovementDto: CreateMovementDto,
    @CurrentUser() user: any,
  ) {
    // Salon owners and employees can only create movements for their salon
    if (
      user.role === UserRole.SALON_OWNER ||
      user.role === UserRole.SALON_EMPLOYEE
    ) {
      const salon = await this.salonsService.findOne(createMovementDto.salonId);
      if (salon.ownerId !== user.id) {
        throw new ForbiddenException(
          'You can only create movements for your own salon',
        );
      }
    }

    return this.inventoryService.createMovement({
      ...createMovementDto,
      performedById: user.id,
    });
  }

  @Get('stock-levels')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.DISTRICT_LEADER,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  )
  @ApiOperation({ summary: 'Get products with stock levels' })
  async getStockLevels(
    @Query('salonId') salonId: string | undefined,
    @CurrentUser() user: any,
  ) {
    // Salon owners and employees can only see stock for their salon(s)
    if (
      user.role === UserRole.SALON_OWNER ||
      user.role === UserRole.SALON_EMPLOYEE
    ) {
      let salonIds: string[] = [];

      if (user.role === UserRole.SALON_OWNER) {
        const salons = await this.salonsService.findByOwnerId(user.id);
        salonIds = salons.map((s) => s.id);
      } else {
        // For employees, find all salons they work at
        const employeeRecords =
          await this.salonsService.findAllEmployeesByUserId(user.id);
        salonIds = employeeRecords.map((e) => e.salonId);
      }

      if (salonIds.length === 0) {
        return [];
      }

      if (salonId && !salonIds.includes(salonId)) {
        throw new ForbiddenException(
          'You can only access stock for your own salon',
        );
      }
      // If no salonId specified, get stock for all user's salons
      const filteredSalonId =
        salonId || (salonIds.length === 1 ? salonIds[0] : undefined);
      return this.inventoryService.getProductsWithStock(filteredSalonId);
    }
    // Admins can see all or filter by salonId
    return this.inventoryService.getProductsWithStock(salonId);
  }

  @Get('products/:id/stock')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.DISTRICT_LEADER,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  )
  @ApiOperation({ summary: 'Get stock level for a specific product' })
  async getProductStock(@Param('id') id: string, @CurrentUser() user: any) {
    const product = await this.inventoryService.findOneProduct(id);

    // Salon owners and employees can only access stock for their salon
    if (
      user.role === UserRole.SALON_OWNER ||
      user.role === UserRole.SALON_EMPLOYEE
    ) {
      const salon = await this.salonsService.findOne(product.salonId);

      if (user.role === UserRole.SALON_OWNER) {
        if (salon.ownerId !== user.id) {
          throw new ForbiddenException(
            'You can only access stock for your own salon',
          );
        }
      } else {
        // Employee check
        const isEmployee = await this.salonsService.isUserEmployeeOfSalon(
          user.id,
          product.salonId,
        );
        if (!isEmployee) {
          throw new ForbiddenException(
            'You can only access stock for salons you work at',
          );
        }
      }
    }

    const stockLevel = await this.inventoryService.getStockLevel(id);
    return { productId: id, stockLevel };
  }
}
