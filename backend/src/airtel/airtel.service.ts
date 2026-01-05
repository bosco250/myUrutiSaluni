import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AirtelAgent } from './entities/airtel-agent.entity';
import { AirtelTransaction } from './entities/airtel-transaction.entity';

@Injectable()
export class AirtelService {
  constructor(
    @InjectRepository(AirtelAgent)
    private airtelAgentsRepository: Repository<AirtelAgent>,
    @InjectRepository(AirtelTransaction)
    private airtelTransactionsRepository: Repository<AirtelTransaction>,
  ) {}

  async registerAgent(agentData: Partial<AirtelAgent>): Promise<AirtelAgent> {
    const agent = this.airtelAgentsRepository.create(agentData);
    return this.airtelAgentsRepository.save(agent);
  }

  async findAllAgents(): Promise<AirtelAgent[]> {
    return this.airtelAgentsRepository.find({ relations: ['user', 'salon'] });
  }

  async createTransaction(
    transactionData: Partial<AirtelTransaction>,
  ): Promise<AirtelTransaction> {
    const transaction =
      this.airtelTransactionsRepository.create(transactionData);
    return this.airtelTransactionsRepository.save(transaction);
  }

  async getAgentTransactions(agentId: string): Promise<AirtelTransaction[]> {
    return this.airtelTransactionsRepository.find({
      where: { airtelAgentId: agentId },
      order: { createdAt: 'DESC' },
    });
  }
}
