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

  async createMovement(movementData: Partial<InventoryMovement>): Promise<InventoryMovement> {
    const movement = this.movementsRepository.create(movementData);
    return this.movementsRepository.save(movement);
  }
}

