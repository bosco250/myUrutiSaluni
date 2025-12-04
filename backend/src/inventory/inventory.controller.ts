import { Controller, Get, Post, Body, UseGuards, Query, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CreateProductDto } from './dto/create-product.dto';
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
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.SALON_OWNER, UserRole.SALON_EMPLOYEE)
  @ApiOperation({ summary: 'Create a new product' })
  async createProduct(@Body() createProductDto: CreateProductDto, @CurrentUser() user: any) {
    // Salon owners and employees can only create products for their salon
    if (
      (user.role === UserRole.SALON_OWNER || user.role === UserRole.SALON_EMPLOYEE) &&
      createProductDto.salonId
    ) {
      const salon = await this.salonsService.findOne(createProductDto.salonId);
      if (salon.ownerId !== user.id) {
        throw new ForbiddenException('You can only create products for your own salon');
      }
    }
    return this.inventoryService.createProduct(createProductDto);
  }

  @Get('products')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.DISTRICT_LEADER, UserRole.SALON_OWNER, UserRole.SALON_EMPLOYEE)
  @ApiOperation({ summary: 'Get all products' })
  async findAllProducts(@Query('salonId') salonId: string | undefined, @CurrentUser() user: any) {
    // Salon owners and employees can only see products for their salon(s)
    if (user.role === UserRole.SALON_OWNER || user.role === UserRole.SALON_EMPLOYEE) {
      const salons = await this.salonsService.findByOwnerId(user.id);
      const salonIds = salons.map(s => s.id);
      if (salonId && !salonIds.includes(salonId)) {
        throw new ForbiddenException('You can only access products for your own salon');
      }
      return this.inventoryService.findProductsBySalonIds(salonIds);
    }
    // Admins can see all or filter by salonId
    return this.inventoryService.findAllProducts(salonId);
  }
}

