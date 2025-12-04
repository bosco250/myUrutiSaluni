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
      return this.productsRepository.find({ where: { salonId }, relations: ['salon'] });
    }
    return this.productsRepository.find({ relations: ['salon'] });
  }

  async findProductsBySalonIds(salonIds: string[]): Promise<Product[]> {
    return this.productsRepository.find({
      where: salonIds.map(id => ({ salonId: id })),
      relations: ['salon'],
    });
  }

  async findOneProduct(id: string): Promise<Product> {
    return this.productsRepository.findOne({ where: { id }, relations: ['salon'] });
  }

  async updateProduct(id: string, updateData: Partial<Product>): Promise<Product> {
    await this.productsRepository.update(id, updateData);
    return this.findOneProduct(id);
  }

  async removeProduct(id: string): Promise<void> {
    await this.productsRepository.delete(id);
  }

  async createMovement(movementData: Partial<InventoryMovement>): Promise<InventoryMovement> {
    const movement = this.movementsRepository.create(movementData);
    return this.movementsRepository.save(movement);
  }

  async findAllMovements(salonId?: string, productId?: string): Promise<InventoryMovement[]> {
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
      .select('COALESCE(SUM(movement.quantity), 0)', 'stock')
      .where('movement.productId = :productId', { productId })
      .getRawOne();

    return parseFloat(result?.stock || '0');
  }

  async getStockLevelsForProducts(productIds: string[]): Promise<Record<string, number>> {
    if (productIds.length === 0) return {};

    const results = await this.movementsRepository
      .createQueryBuilder('movement')
      .select('movement.productId', 'productId')
      .addSelect('COALESCE(SUM(movement.quantity), 0)', 'stock')
      .where('movement.productId IN (:...productIds)', { productIds })
      .groupBy('movement.productId')
      .getRawMany();

    const stockLevels: Record<string, number> = {};
    results.forEach((result) => {
      stockLevels[result.productId] = parseFloat(result.stock || '0');
    });

    // Set 0 for products with no movements
    productIds.forEach((id) => {
      if (!stockLevels[id]) {
        stockLevels[id] = 0;
      }
    });

    return stockLevels;
  }

  async getProductsWithStock(salonId?: string): Promise<Array<Product & { stockLevel: number }>> {
    const products = salonId
      ? await this.productsRepository.find({ where: { salonId, isInventoryItem: true }, relations: ['salon'] })
      : await this.productsRepository.find({ where: { isInventoryItem: true }, relations: ['salon'] });

    const productIds = products.map((p) => p.id);
    const stockLevels = await this.getStockLevelsForProducts(productIds);

    return products.map((product) => ({
      ...product,
      stockLevel: stockLevels[product.id] || 0,
    }));
  }
}

