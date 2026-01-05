import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SalonRewardsConfig } from './entities/rewards-config.entity';

@Injectable()
export class RewardsConfigService {
  private readonly logger = new Logger(RewardsConfigService.name);

  constructor(
    @InjectRepository(SalonRewardsConfig)
    private rewardsConfigRepository: Repository<SalonRewardsConfig>,
  ) {}

  /**
   * Get or create rewards configuration for a salon
   */
  async getOrCreate(salonId: string): Promise<SalonRewardsConfig> {
    let config = await this.rewardsConfigRepository.findOne({
      where: { salonId },
    });

    if (!config) {
      // Create default configuration
      config = this.rewardsConfigRepository.create({
        salonId,
        pointsPerCurrencyUnit: 0.01, // 1 point per RWF 100
        redemptionRate: 0.1, // 100 points = RWF 10
        minRedemptionPoints: 100,
        pointsExpirationDays: null, // Never expire by default
        vipThresholdPoints: 1000,
      });
      config = await this.rewardsConfigRepository.save(config);
      this.logger.log(`Created default rewards config for salon ${salonId}`);
    }

    return config;
  }

  /**
   * Get rewards configuration for a salon
   */
  async findBySalonId(salonId: string): Promise<SalonRewardsConfig | null> {
    return this.rewardsConfigRepository.findOne({
      where: { salonId },
    });
  }

  /**
   * Update rewards configuration for a salon
   */
  async update(
    salonId: string,
    updateData: Partial<SalonRewardsConfig>,
  ): Promise<SalonRewardsConfig> {
    const config = await this.getOrCreate(salonId);

    // Validate values
    if (updateData.pointsPerCurrencyUnit !== undefined) {
      if (updateData.pointsPerCurrencyUnit < 0) {
        throw new Error('Points per currency unit cannot be negative');
      }
    }

    if (updateData.redemptionRate !== undefined) {
      if (updateData.redemptionRate < 0) {
        throw new Error('Redemption rate cannot be negative');
      }
    }

    if (updateData.minRedemptionPoints !== undefined) {
      if (updateData.minRedemptionPoints < 0) {
        throw new Error('Minimum redemption points cannot be negative');
      }
    }

    if (updateData.vipThresholdPoints !== undefined) {
      if (updateData.vipThresholdPoints < 0) {
        throw new Error('VIP threshold points cannot be negative');
      }
    }

    Object.assign(config, updateData);
    const updated = await this.rewardsConfigRepository.save(config);

    this.logger.log(`Updated rewards config for salon ${salonId}`);
    return updated;
  }

  /**
   * Delete rewards configuration for a salon
   */
  async delete(salonId: string): Promise<void> {
    const result = await this.rewardsConfigRepository.delete({ salonId });
    if (result.affected === 0) {
      throw new NotFoundException(
        `Rewards config for salon ${salonId} not found`,
      );
    }
    this.logger.log(`Deleted rewards config for salon ${salonId}`);
  }
}
