import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Loan } from './entities/loan.entity';
import { LoanProduct } from './entities/loan-product.entity';
import { LoanRepayment } from './entities/loan-repayment.entity';
import { CreditScore } from './entities/credit-score.entity';

@Injectable()
export class LoansService {
  constructor(
    @InjectRepository(Loan)
    private loansRepository: Repository<Loan>,
    @InjectRepository(LoanProduct)
    private loanProductsRepository: Repository<LoanProduct>,
    @InjectRepository(LoanRepayment)
    private repaymentsRepository: Repository<LoanRepayment>,
    @InjectRepository(CreditScore)
    private creditScoresRepository: Repository<CreditScore>,
  ) {}

  async createLoan(loanData: any): Promise<Loan> {
    const loan = this.loansRepository.create({
      ...loanData,
      applicationDate: loanData.applicationDate
        ? new Date(loanData.applicationDate)
        : new Date(),
      approvedDate: loanData.approvedDate
        ? new Date(loanData.approvedDate)
        : undefined,
      disbursedDate: loanData.disbursedDate
        ? new Date(loanData.disbursedDate)
        : undefined,
      firstPaymentDate: loanData.firstPaymentDate
        ? new Date(loanData.firstPaymentDate)
        : undefined,
      nextPaymentDate: loanData.nextPaymentDate
        ? new Date(loanData.nextPaymentDate)
        : undefined,
      completedDate: loanData.completedDate
        ? new Date(loanData.completedDate)
        : undefined,
      defaultedDate: loanData.defaultedDate
        ? new Date(loanData.defaultedDate)
        : undefined,
    });
    const saved = await this.loansRepository.save(loan);
    return Array.isArray(saved) ? saved[0] : saved;
  }

  async findAllLoans(): Promise<Loan[]> {
    return this.loansRepository.find({
      relations: ['applicant', 'loanProduct'],
    });
  }

  async createLoanProduct(
    productData: Partial<LoanProduct>,
  ): Promise<LoanProduct> {
    const product = this.loanProductsRepository.create(productData);
    return this.loanProductsRepository.save(product);
  }

  async findAllLoanProducts(): Promise<LoanProduct[]> {
    return this.loanProductsRepository.find();
  }

  async calculateCreditScore(userId: string): Promise<CreditScore> {
    // Simplified credit scoring - implement actual logic
    const score = Math.floor(Math.random() * 500) + 500; // 500-1000
    const riskLevel =
      score >= 750
        ? 'excellent'
        : score >= 600
          ? 'good'
          : score >= 450
            ? 'fair'
            : 'poor';

    const creditScore = this.creditScoresRepository.create({
      userId,
      score,
      riskLevel,
      factors: {},
    });
    return this.creditScoresRepository.save(creditScore);
  }
}
