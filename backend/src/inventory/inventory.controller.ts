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
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateMovementDto } from './dto/create-movement.dto';
import { SalonsService } from '../salons/salons.service';

@ApiTags('Inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inventory')
export class InventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly salonsService: SalonsService,
  ) {}

  @Post('products')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ASSOCIATION_ADMIN,
    UserRole.SALON_OWNER,
    UserRole.SALON_EMPLOYEE,
  )
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
      if (salon.ownerId !== user.id) {
        throw new ForbiddenException(
          'You can only create products for your own salon',
        );
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
  )
  @ApiOperation({ summary: 'Get all products' })
  async findAllProducts(
    @Query('salonId') salonId: string | undefined,
    @CurrentUser() user: any,
  ) {
    // Salon owners and employees can only see products for their salon(s)
    if (
      user.role === UserRole.SALON_OWNER ||
      user.role === UserRole.SALON_EMPLOYEE
    ) {
      const salons = await this.salonsService.findByOwnerId(user.id);
      const salonIds = salons.map((s) => s.id);
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
      if (salon.ownerId !== user.id) {
        throw new ForbiddenException(
          'You can only access products for your own salon',
        );
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
      if (salon.ownerId !== user.id) {
        throw new ForbiddenException(
          'You can only update products for your own salon',
        );
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
      const salons = await this.salonsService.findByOwnerId(user.id);
      const salonIds = salons.map((s) => s.id);
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
      const salons = await this.salonsService.findByOwnerId(user.id);
      const salonIds = salons.map((s) => s.id);
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
      if (salon.ownerId !== user.id) {
        throw new ForbiddenException(
          'You can only access stock for your own salon',
        );
      }
    }

    const stockLevel = await this.inventoryService.getStockLevel(id);
    return { productId: id, stockLevel };
  }
}
