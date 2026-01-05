import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { InventoryMovement } from './entities/inventory-movement.entity';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Product)
    private productsRepository: Repository<Product>,
    @InjectRepository(InventoryMovement)
    private movementsRepository: Repository<InventoryMovement>,
  ) {}

  async createProduct(productData: Partial<Product>): Promise<Product> {
    const product = this.productsRepository.create(productData);
    return this.productsRepository.save(product);
  }

  async findAllProducts(salonId?: string): Promise<Product[]> {
    if (salonId) {
      return this.productsRepository.find({
        where: { salonId },
        relations: ['salon'],
      });
    }
    return this.productsRepository.find({ relations: ['salon'] });
  }

  async findProductsBySalonIds(salonIds: string[]): Promise<Product[]> {
    return this.productsRepository.find({
      where: salonIds.map((id) => ({ salonId: id })),
      relations: ['salon'],
    });
  }

  async findOneProduct(id: string): Promise<Product> {
    return this.productsRepository.findOne({
      where: { id },
      relations: ['salon'],
    });
  }

  async updateProduct(
    id: string,
    updateData: Partial<Product>,
  ): Promise<Product> {
    await this.productsRepository.update(id, updateData);
    return this.findOneProduct(id);
  }

  async removeProduct(id: string): Promise<void> {
    await this.productsRepository.delete(id);
  }

  async createMovement(
    movementData: Partial<InventoryMovement>,
  ): Promise<InventoryMovement> {
    const movement = this.movementsRepository.create(movementData);
    return this.movementsRepository.save(movement);
  }

  async findAllMovements(
    salonId?: string,
    productId?: string,
  ): Promise<InventoryMovement[]> {
    const where: any = {};
    if (salonId) where.salonId = salonId;
    if (productId) where.productId = productId;

    return this.movementsRepository.find({
      where,
      relations: ['product', 'salon', 'performedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async getStockLevel(productId: string): Promise<number> {
    const result = await this.movementsRepository
      .createQueryBuilder('movement')
      .select(
        `COALESCE(SUM(
          CASE 
            WHEN LOWER(movement.movement_type) IN ('purchase', 'return') THEN movement.quantity
            WHEN LOWER(movement.movement_type) IN ('consumption', 'transfer') THEN -movement.quantity
            WHEN LOWER(movement.movement_type) = 'adjustment' THEN movement.quantity
            ELSE 0
          END
        ), 0)`,
        'stock',
      )
      .where('movement.product_id = :productId', { productId })
      .getRawOne();

    const stock = parseFloat(result?.stock || '0');
    return Math.max(0, stock); // Ensure stock is never negative
  }

  async getStockLevelsForProducts(
    productIds: string[],
  ): Promise<Record<string, number>> {
    if (productIds.length === 0) return {};

    // Calculate stock: purchase/return adds, consumption/transfer subtracts
    // Note: adjustment can be positive or negative depending on the quantity sign
    // For consumption: we store positive quantity, SQL negates it to subtract from stock
    const results = await this.movementsRepository
      .createQueryBuilder('movement')
      .select('movement.product_id', 'productId')
      .addSelect(
        `COALESCE(SUM(
          CASE 
            WHEN LOWER(movement.movement_type) IN ('purchase', 'return') THEN movement.quantity
            WHEN LOWER(movement.movement_type) IN ('consumption', 'transfer') THEN -movement.quantity
            WHEN LOWER(movement.movement_type) = 'adjustment' THEN movement.quantity
            ELSE 0
          END
        ), 0)`,
        'stock',
      )
      .where('movement.product_id IN (:...productIds)', { productIds })
      .groupBy('movement.product_id')
      .getRawMany();

    const stockLevels: Record<string, number> = {};
    results.forEach((result) => {
      const stock = parseFloat(result.stock || '0');
      stockLevels[result.productId] = Math.max(0, stock); // Ensure stock is never negative
    });

    // Set 0 for products with no movements
    productIds.forEach((id) => {
      if (!stockLevels[id]) {
        stockLevels[id] = 0;
      }
    });

    console.log(`[INVENTORY] Stock levels calculated:`, stockLevels);
    return stockLevels;
  }

  async getProductsWithStock(
    salonId?: string,
  ): Promise<Array<Product & { stockLevel: number }>> {
    // Get all products (not just inventory items) so they can be used in sales
    const whereCondition = salonId ? { salonId } : {};
    const products = await this.productsRepository.find({
      where: whereCondition,
      relations: ['salon'],
      order: { name: 'ASC' }, // Order by name for consistency
    });

    if (products.length === 0) {
      return [];
    }

    const productIds = products.map((p) => p.id);

    const stockLevels = await this.getStockLevelsForProducts(productIds);

    const productsWithStock = products.map((product) => {
      const stockLevel = stockLevels[product.id] || 0;
      return {
        ...product,
        stockLevel,
      };
    });

    return productsWithStock;
  }
}
