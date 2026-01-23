import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { Product } from './entities/product.entity';
import { InventoryMovement } from './entities/inventory-movement.entity';
import { SalonsModule } from '../salons/salons.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, InventoryMovement]),
    forwardRef(() => SalonsModule),
  ],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
