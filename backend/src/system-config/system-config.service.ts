import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemConfig } from './entities/system-config.entity';

@Injectable()
export class SystemConfigService implements OnModuleInit {
  constructor(
    @InjectRepository(SystemConfig)
    private configRepository: Repository<SystemConfig>,
  ) {}

  async onModuleInit() {
    // Ensure at least one config record exists
    const count = await this.configRepository.count();
    if (count === 0) {
      const defaultConfig = this.configRepository.create({});
      await this.configRepository.save(defaultConfig);
    }
  }

  async getConfig(): Promise<SystemConfig> {
    const config = await this.configRepository.findOne({ where: {} });
    return config!;
  }

  async updateConfig(updateData: Partial<SystemConfig>): Promise<SystemConfig> {
    const config = await this.getConfig();
    Object.assign(config, updateData);
    return this.configRepository.save(config);
  }
}
