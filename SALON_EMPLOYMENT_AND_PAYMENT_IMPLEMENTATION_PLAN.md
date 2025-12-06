# Salon Employment & Payment System - Complete Implementation Plan

## 🎯 Executive Summary

This document provides a **comprehensive implementation plan** for building a complete salon employment management system with commissions and payment processing. It combines analysis of what currently exists with a detailed roadmap for what needs to be built.

**Current Status**: The system has basic employee management and commission tracking, but lacks critical payroll, salary, and payment processing features.

**Goal**: Build a professional, functional employment and payment system that handles:
- Employee management with salary + commission support
- Automated payroll processing
- Complete payment tracking
- Comprehensive reporting

---

## 📊 Current System Status

### ✅ What Works (Keep & Enhance)

| Feature | Status | Notes |
|---------|--------|-------|
| **Employee CRUD** | ✅ Complete | Full create, read, update, delete operations |
| **Commission Creation** | ✅ Complete | Auto-creates from sale items |
| **Commission Tracking** | ✅ Complete | Tracks paid/unpaid status |
| **Basic Attendance** | ✅ Basic | Clock in/out functionality |
| **Employee Assignment** | ✅ Partial | Works for sales, limited for appointments |

### ❌ What's Missing (Must Build)

| Feature | Priority | Impact |
|---------|----------|--------|
| **Base Salary Support** | 🔴 Critical | Cannot pay fixed salaries |
| **Payroll System** | 🔴 Critical | No automated payroll processing |
| **Payment Method Tracking** | 🔴 Critical | No payment audit trail |
| **Leave Management** | 🟡 Important | No time-off tracking |
| **Enhanced Attendance** | 🟡 Important | Missing breaks, overtime, reports |
| **Reporting & Analytics** | 🟡 Important | Limited insights |

---

## 🏗️ Part 1: Employee Management Enhancements

### Current Employee Entity

```typescript
// Current: backend/src/salons/entities/salon-employee.entity.ts
{
  id: UUID
  userId: UUID (nullable)
  salonId: UUID (required)
  roleTitle: string (nullable)
  skills: string[] (array)
  hireDate: DATE (nullable)
  isActive: BOOLEAN (default: true)
  commissionRate: DECIMAL(5,2) (default: 0)
  createdAt: TIMESTAMP
  updatedAt: TIMESTAMP
}
```

### Required Enhancements

#### 1.1 Add Salary Fields to Employee Entity

**Migration Required**: Add columns to `salon_employees` table

```typescript
// New fields to add:
{
  baseSalary: DECIMAL(14,2) (nullable) - Fixed monthly/weekly salary
  salaryType: ENUM - 'COMMISSION_ONLY' | 'SALARY_ONLY' | 'SALARY_PLUS_COMMISSION'
  payFrequency: ENUM - 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY'
  hourlyRate: DECIMAL(12,2) (nullable) - For hourly employees
  overtimeRate: DECIMAL(5,2) (default: 1.5) - Overtime multiplier
  employmentType: ENUM - 'FULL_TIME' | 'PART_TIME' | 'CONTRACT'
  terminationDate: DATE (nullable)
  terminationReason: TEXT (nullable)
}
```

**Implementation Steps:**
1. Create database migration to add new columns
2. Update `SalonEmployee` entity with new fields
3. Update DTOs (`CreateEmployeeDto`, `UpdateEmployeeDto`)
4. Add validation rules
5. Update frontend forms

**Files to Modify:**
- `backend/src/salons/entities/salon-employee.entity.ts`
- `backend/src/salons/dto/create-employee.dto.ts`
- `backend/src/salons/dto/update-employee.dto.ts`
- `web/app/(dashboard)/salons/[id]/employees/page.tsx`

---

## 💰 Part 2: Commission System Enhancements

### Current Commission Flow

```
Sale Created → Sale Items (with employee) → Sale Completed 
→ processCommissions() → Commission Record (paid = false)
→ Manual Payment (owner marks as paid)
```

### Required Enhancements

#### 2.1 Enhanced Commission Payment Tracking

**Current Issue**: No payment method, reference, or audit trail

**Solution**: Add payment tracking fields to `commissions` table

```typescript
// Add to Commission entity:
{
  paymentMethod: ENUM (nullable) - 'cash' | 'bank_transfer' | 'mobile_money' | 'payroll'
  paymentReference: VARCHAR(255) (nullable) - Transaction ID
  paidBy: UUID (nullable) - User who processed payment
  payrollItemId: UUID (nullable) - Link to payroll if paid via payroll
}
```

**Implementation Steps:**
1. Create migration to add payment fields
2. Update `Commission` entity
3. Update `markAsPaid()` methods to accept payment details
4. Update API endpoints to accept payment information
5. Add payment history tracking

#### 2.2 Appointment-Based Commissions

**Current Issue**: Appointments don't generate commissions

**Solution**: Create commissions when appointments are completed

```typescript
// In appointments.service.ts - update() method
if (updateData.status === 'completed' && appointment.metadata?.preferredEmployeeId) {
  // Get appointment service price
  // Calculate commission
  // Create commission record
  await commissionsService.createCommission(
    appointment.metadata.preferredEmployeeId,
    null, // No sale item for appointments
    servicePrice
  );
}
```

**Implementation Steps:**
1. Update `AppointmentsService` to create commissions on completion
2. Handle appointment-to-sale conversion (if applicable)
3. Add commission rate validation for appointments

---

## 💵 Part 3: Payroll System Implementation

### Database Tables (Already Exist)

```sql
-- payroll_runs table exists
CREATE TABLE payroll_runs (
  id UUID PRIMARY KEY,
  salon_id UUID REFERENCES salons(id),
  period_start DATE,
  period_end DATE,
  total_amount NUMERIC(14,2),
  processed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'
);

-- payroll_items table exists
CREATE TABLE payroll_items (
  id UUID PRIMARY KEY,
  payroll_run_id UUID REFERENCES payroll_runs(id),
  salon_employee_id UUID REFERENCES salon_employees(id),
  gross_pay NUMERIC(14,2),
  deductions NUMERIC(14,2) DEFAULT 0,
  net_pay NUMERIC(14,2),
  paid BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 3.1 Create Payroll Module

**Structure:**
```
backend/src/payroll/
├── payroll.module.ts
├── payroll.service.ts
├── payroll.controller.ts
├── entities/
│   ├── payroll-run.entity.ts
│   └── payroll-item.entity.ts
└── dto/
    ├── create-payroll-run.dto.ts
    ├── process-payroll.dto.ts
    └── payroll-summary.dto.ts
```

#### 3.1.1 PayrollRun Entity

```typescript
// backend/src/payroll/entities/payroll-run.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, OneToMany, Index } from 'typeorm';
import { Salon } from '../../salons/entities/salon.entity';
import { PayrollItem } from './payroll-item.entity';

export enum PayrollStatus {
  DRAFT = 'draft',
  PROCESSED = 'processed',
  PAID = 'paid',
  CANCELLED = 'cancelled'
}

@Entity('payroll_runs')
export class PayrollRun {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Salon, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'salon_id' })
  salon: Salon;

  @Index()
  @Column({ name: 'salon_id' })
  salonId: string;

  @Column({ name: 'period_start', type: 'date' })
  periodStart: Date;

  @Column({ name: 'period_end', type: 'date' })
  periodEnd: Date;

  @Column({ name: 'total_amount', type: 'decimal', precision: 14, scale: 2, default: 0 })
  totalAmount: number;

  @Column({
    type: 'enum',
    enum: PayrollStatus,
    default: PayrollStatus.DRAFT
  })
  status: PayrollStatus;

  @Column({ name: 'processed_at', type: 'timestamptz', nullable: true })
  processedAt: Date;

  @Column({ name: 'processed_by', nullable: true })
  processedById: string;

  @Column({ type: 'simple-json', default: '{}' })
  metadata: Record<string, any>;

  @OneToMany(() => PayrollItem, item => item.payrollRun, { cascade: true })
  items: PayrollItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
```

#### 3.1.2 PayrollItem Entity

```typescript
// backend/src/payroll/entities/payroll-item.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { PayrollRun } from './payroll-run.entity';
import { SalonEmployee } from '../../salons/entities/salon-employee.entity';

@Entity('payroll_items')
export class PayrollItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => PayrollRun, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'payroll_run_id' })
  payrollRun: PayrollRun;

  @Index()
  @Column({ name: 'payroll_run_id' })
  payrollRunId: string;

  @ManyToOne(() => SalonEmployee, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'salon_employee_id' })
  salonEmployee: SalonEmployee;

  @Index()
  @Column({ name: 'salon_employee_id' })
  salonEmployeeId: string;

  @Column({ name: 'base_salary', type: 'decimal', precision: 14, scale: 2, default: 0 })
  baseSalary: number;

  @Column({ name: 'commission_amount', type: 'decimal', precision: 14, scale: 2, default: 0 })
  commissionAmount: number;

  @Column({ name: 'overtime_amount', type: 'decimal', precision: 14, scale: 2, default: 0 })
  overtimeAmount: number;

  @Column({ name: 'gross_pay', type: 'decimal', precision: 14, scale: 2 })
  grossPay: number;

  @Column({ name: 'deductions', type: 'decimal', precision: 14, scale: 2, default: 0 })
  deductions: number;

  @Column({ name: 'net_pay', type: 'decimal', precision: 14, scale: 2 })
  netPay: number;

  @Column({ default: false })
  paid: boolean;

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt: Date;

  @Column({ name: 'paid_by', nullable: true })
  paidById: string;

  @Column({ name: 'payment_method', length: 32, nullable: true })
  paymentMethod: string;

  @Column({ name: 'payment_reference', length: 255, nullable: true })
  paymentReference: string;

  @Column({ type: 'simple-json', default: '{}' })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
```

### 3.2 Payroll Service Implementation

#### 3.2.1 Core Payroll Calculation Logic

```typescript
// backend/src/payroll/payroll.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { PayrollRun, PayrollStatus } from './entities/payroll-run.entity';
import { PayrollItem } from './entities/payroll-item.entity';
import { SalonEmployee } from '../salons/entities/salon-employee.entity';
import { Commission } from '../commissions/entities/commission.entity';

@Injectable()
export class PayrollService {
  constructor(
    @InjectRepository(PayrollRun)
    private payrollRunsRepository: Repository<PayrollRun>,
    @InjectRepository(PayrollItem)
    private payrollItemsRepository: Repository<PayrollItem>,
    @InjectRepository(SalonEmployee)
    private salonEmployeesRepository: Repository<SalonEmployee>,
    @InjectRepository(Commission)
    private commissionsRepository: Repository<Commission>,
  ) {}

  /**
   * Calculate and create payroll for a period
   */
  async calculatePayroll(
    salonId: string,
    periodStart: Date,
    periodEnd: Date,
    processedById: string
  ): Promise<PayrollRun> {
    // 1. Get all active employees for salon
    const employees = await this.salonEmployeesRepository.find({
      where: { salonId, isActive: true },
      relations: ['user'],
    });

    if (employees.length === 0) {
      throw new BadRequestException('No active employees found for this salon');
    }

    // 2. Create payroll run
    const payrollRun = this.payrollRunsRepository.create({
      salonId,
      periodStart,
      periodEnd,
      status: PayrollStatus.DRAFT,
      totalAmount: 0,
    });
    const savedRun = await this.payrollRunsRepository.save(payrollRun);

    let totalPayrollAmount = 0;
    const payrollItems: PayrollItem[] = [];

    // 3. Calculate pay for each employee
    for (const employee of employees) {
      const payrollItem = await this.calculateEmployeePay(
        employee,
        periodStart,
        periodEnd,
        savedRun.id
      );
      
      payrollItems.push(payrollItem);
      totalPayrollAmount += Number(payrollItem.netPay);
    }

    // 4. Save all payroll items
    await this.payrollItemsRepository.save(payrollItems);

    // 5. Update payroll run with total
    savedRun.totalAmount = totalPayrollAmount;
    savedRun.status = PayrollStatus.PROCESSED;
    savedRun.processedAt = new Date();
    savedRun.processedById = processedById;

    return this.payrollRunsRepository.save(savedRun);
  }

  /**
   * Calculate pay for a single employee
   */
  private async calculateEmployeePay(
    employee: SalonEmployee,
    periodStart: Date,
    periodEnd: Date,
    payrollRunId: string
  ): Promise<PayrollItem> {
    let baseSalary = 0;
    let commissionAmount = 0;
    let overtimeAmount = 0;
    let deductions = 0;

    // Calculate base salary based on pay frequency
    if (employee.baseSalary && employee.salaryType !== 'COMMISSION_ONLY') {
      baseSalary = this.calculatePeriodSalary(
        Number(employee.baseSalary),
        employee.payFrequency,
        periodStart,
        periodEnd
      );
    }

    // Calculate commissions (unpaid commissions in period)
    if (employee.salaryType !== 'SALARY_ONLY') {
      const unpaidCommissions = await this.commissionsRepository.find({
        where: {
          salonEmployeeId: employee.id,
          paid: false,
          createdAt: Between(periodStart, periodEnd),
        },
      });

      commissionAmount = unpaidCommissions.reduce(
        (sum, c) => sum + Number(c.amount),
        0
      );
    }

    // TODO: Calculate overtime (requires attendance data)
    // overtimeAmount = await this.calculateOvertime(employee, periodStart, periodEnd);

    // TODO: Calculate deductions (taxes, loans, etc.)
    // deductions = await this.calculateDeductions(employee, grossPay);

    const grossPay = baseSalary + commissionAmount + overtimeAmount;
    const netPay = grossPay - deductions;

    const payrollItem = this.payrollItemsRepository.create({
      payrollRunId,
      salonEmployeeId: employee.id,
      baseSalary,
      commissionAmount,
      overtimeAmount,
      grossPay,
      deductions,
      netPay,
      paid: false,
      metadata: {
        employeeName: employee.user?.fullName || employee.roleTitle,
        commissionCount: unpaidCommissions?.length || 0,
      },
    });

    return payrollItem;
  }

  /**
   * Calculate salary for a period based on frequency
   */
  private calculatePeriodSalary(
    annualSalary: number,
    payFrequency: string,
    periodStart: Date,
    periodEnd: Date
  ): number {
    const daysInPeriod = Math.ceil(
      (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)
    );

    switch (payFrequency) {
      case 'WEEKLY':
        return (annualSalary / 52) * (daysInPeriod / 7);
      case 'BIWEEKLY':
        return (annualSalary / 26) * (daysInPeriod / 14);
      case 'MONTHLY':
        return (annualSalary / 12) * (daysInPeriod / 30);
      default:
        return 0;
    }
  }

  /**
   * Mark payroll as paid
   */
  async markPayrollAsPaid(
    payrollRunId: string,
    paymentMethod: string,
    paymentReference: string,
    paidById: string
  ): Promise<PayrollRun> {
    const payrollRun = await this.payrollRunsRepository.findOne({
      where: { id: payrollRunId },
      relations: ['items'],
    });

    if (!payrollRun) {
      throw new NotFoundException('Payroll run not found');
    }

    // Mark all items as paid
    for (const item of payrollRun.items) {
      item.paid = true;
      item.paidAt = new Date();
      item.paidById = paidById;
      item.paymentMethod = paymentMethod;
      item.paymentReference = paymentReference;

      // Mark commissions as paid
      if (item.commissionAmount > 0) {
        await this.markCommissionsAsPaid(
          item.salonEmployeeId,
          payrollRun.periodStart,
          payrollRun.periodEnd,
          item.id
        );
      }
    }

    await this.payrollItemsRepository.save(payrollRun.items);
    
    payrollRun.status = PayrollStatus.PAID;
    return this.payrollRunsRepository.save(payrollRun);
  }

  /**
   * Mark commissions as paid when payroll is processed
   */
  private async markCommissionsAsPaid(
    salonEmployeeId: string,
    periodStart: Date,
    periodEnd: Date,
    payrollItemId: string
  ): Promise<void> {
    const commissions = await this.commissionsRepository.find({
      where: {
        salonEmployeeId,
        paid: false,
        createdAt: Between(periodStart, periodEnd),
      },
    });

    for (const commission of commissions) {
      commission.paid = true;
      commission.paidAt = new Date();
      commission.paymentMethod = 'payroll';
      commission.payrollItemId = payrollItemId;
    }

    await this.commissionsRepository.save(commissions);
  }

  /**
   * Get payroll history for a salon
   */
  async getPayrollHistory(salonId: string): Promise<PayrollRun[]> {
    return this.payrollRunsRepository.find({
      where: { salonId },
      relations: ['items', 'items.salonEmployee', 'items.salonEmployee.user'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get payroll summary for a period
   */
  async getPayrollSummary(
    salonId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<any> {
    const payrollRuns = await this.payrollRunsRepository.find({
      where: {
        salonId,
        periodStart: Between(periodStart, periodEnd),
      },
      relations: ['items'],
    });

    const totalGrossPay = payrollRuns.reduce(
      (sum, run) => sum + run.items.reduce((s, item) => s + Number(item.grossPay), 0),
      0
    );

    const totalDeductions = payrollRuns.reduce(
      (sum, run) => sum + run.items.reduce((s, item) => s + Number(item.deductions), 0),
      0
    );

    const totalNetPay = totalGrossPay - totalDeductions;

    return {
      periodStart,
      periodEnd,
      totalRuns: payrollRuns.length,
      totalGrossPay,
      totalDeductions,
      totalNetPay,
      employeeCount: new Set(
        payrollRuns.flatMap(run => run.items.map(item => item.salonEmployeeId))
      ).size,
    };
  }
}
```

### 3.3 Payroll Controller

```typescript
// backend/src/payroll/payroll.controller.ts
import { Controller, Get, Post, Body, Param, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PayrollService } from './payroll.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('Payroll')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payroll')
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Post('calculate')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.SALON_OWNER)
  @ApiOperation({ summary: 'Calculate payroll for a period' })
  async calculatePayroll(
    @Body() body: {
      salonId: string;
      periodStart: string;
      periodEnd: string;
    },
    @CurrentUser() user: any,
  ) {
    return this.payrollService.calculatePayroll(
      body.salonId,
      new Date(body.periodStart),
      new Date(body.periodEnd),
      user.id,
    );
  }

  @Post(':id/mark-paid')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.SALON_OWNER)
  @ApiOperation({ summary: 'Mark payroll as paid' })
  async markAsPaid(
    @Param('id') id: string,
    @Body() body: {
      paymentMethod: string;
      paymentReference: string;
    },
    @CurrentUser() user: any,
  ) {
    return this.payrollService.markPayrollAsPaid(
      id,
      body.paymentMethod,
      body.paymentReference,
      user.id,
    );
  }

  @Get('salon/:salonId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.SALON_OWNER)
  @ApiOperation({ summary: 'Get payroll history for a salon' })
  async getPayrollHistory(@Param('salonId') salonId: string) {
    return this.payrollService.getPayrollHistory(salonId);
  }

  @Get('summary')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.SALON_OWNER)
  @ApiOperation({ summary: 'Get payroll summary' })
  async getSummary(
    @Query('salonId') salonId: string,
    @Query('periodStart') periodStart: string,
    @Query('periodEnd') periodEnd: string,
  ) {
    return this.payrollService.getPayrollSummary(
      salonId,
      new Date(periodStart),
      new Date(periodEnd),
    );
  }
}
```

---

## 📋 Implementation Checklist

### Phase 1: Foundation (Week 1-2)

#### Database & Entities
- [ ] Create migration to add salary fields to `salon_employees`
- [ ] Create migration to add payment fields to `commissions`
- [ ] Update `SalonEmployee` entity with new fields
- [ ] Update `Commission` entity with payment fields
- [ ] Create `PayrollRun` entity
- [ ] Create `PayrollItem` entity

#### Backend Services
- [ ] Create `payroll` module structure
- [ ] Implement `PayrollService` with calculation logic
- [ ] Create `PayrollController` with API endpoints
- [ ] Update `CommissionsService` to support payment details
- [ ] Update `SalonsService` to handle salary fields

#### DTOs & Validation
- [ ] Create `CreatePayrollRunDto`
- [ ] Create `ProcessPayrollDto`
- [ ] Update `CreateEmployeeDto` with salary fields
- [ ] Update `UpdateEmployeeDto` with salary fields
- [ ] Add validation rules for all new fields

### Phase 2: Integration (Week 3)

#### Commission Integration
- [ ] Update `AppointmentsService` to create commissions on completion
- [ ] Link commissions to payroll items
- [ ] Auto-mark commissions as paid when payroll processed
- [ ] Add payment method tracking to commission payments

#### Payroll Calculation
- [ ] Implement base salary calculation
- [ ] Implement commission aggregation
- [ ] Add overtime calculation (requires attendance enhancement)
- [ ] Add deduction calculation (taxes, loans, etc.)

### Phase 3: Frontend (Week 4)

#### Employee Management UI
- [ ] Update employee form with salary fields
- [ ] Add salary type selection
- [ ] Add pay frequency selection
- [ ] Add validation and error handling

#### Payroll UI
- [ ] Create payroll calculation page
- [ ] Create payroll history view
- [ ] Create payroll detail view
- [ ] Add "Mark as Paid" functionality
- [ ] Add payment method selection

#### Commission UI
- [ ] Update commission payment form with payment details
- [ ] Show payment method and reference
- [ ] Link commissions to payroll items
- [ ] Add commission reports

### Phase 4: Reporting (Week 5)

#### Reports to Build
- [ ] Employee earnings report (salary + commissions)
- [ ] Payroll summary report
- [ ] Unpaid commissions report
- [ ] Commission trends over time
- [ ] Top performers report

---

## 🎨 UI/UX Recommendations

### Employee Management Page
```
┌─────────────────────────────────────────┐
│  Employee Management                    │
├─────────────────────────────────────────┤
│  [Add Employee] [Export] [Filter]       │
├─────────────────────────────────────────┤
│  Name        | Role      | Salary Type │
│  ─────────────────────────────────────  │
│  Jane Doe    | Stylist   | Salary+Comm │
│  John Smith  | Manager   | Salary Only │
│  ...                                    │
└─────────────────────────────────────────┘
```

### Payroll Processing Page
```
┌─────────────────────────────────────────┐
│  Process Payroll                        │
├─────────────────────────────────────────┤
│  Period: [Start] to [End]               │
│  Salon: [Select Salon]                   │
│  [Calculate Payroll]                    │
├─────────────────────────────────────────┤
│  Employee    | Base | Comm | Gross | Net│
│  ─────────────────────────────────────  │
│  Jane Doe    | 500K | 150K | 650K  | 600K│
│  [Mark as Paid]                         │
└─────────────────────────────────────────┘
```

### Commission Dashboard
```
┌─────────────────────────────────────────┐
│  Commissions                            │
├─────────────────────────────────────────┤
│  Total: 2.5M | Paid: 1.8M | Unpaid: 700K│
├─────────────────────────────────────────┤
│  Employee | Amount | Status | Actions   │
│  ─────────────────────────────────────  │
│  Jane Doe | 150K   | Unpaid | [Pay]    │
│  ...                                    │
└─────────────────────────────────────────┘
```

---

## 🔒 Security & Access Control

### Permissions Required

| Action | Roles Allowed |
|--------|---------------|
| View Employees | Owner, Employee, Admin |
| Add/Edit Employees | Owner, Admin |
| View Commissions | Owner, Employee (own), Admin |
| Mark Commissions Paid | Owner, Admin |
| Calculate Payroll | Owner, Admin |
| Mark Payroll Paid | Owner, Admin |
| View Payroll History | Owner, Admin |

---

## 📊 Testing Checklist

### Unit Tests
- [ ] Payroll calculation logic
- [ ] Salary period calculation
- [ ] Commission aggregation
- [ ] Deduction calculations

### Integration Tests
- [ ] Payroll creation flow
- [ ] Commission payment flow
- [ ] Payroll payment flow
- [ ] Commission-to-payroll linking

### E2E Tests
- [ ] Complete payroll processing
- [ ] Employee salary configuration
- [ ] Commission payment with details

---

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] Database migrations tested
- [ ] All tests passing
- [ ] API documentation updated
- [ ] Frontend builds successfully

### Deployment
- [ ] Run database migrations
- [ ] Deploy backend
- [ ] Deploy frontend
- [ ] Verify API endpoints
- [ ] Test payroll calculation

### Post-Deployment
- [ ] Monitor error logs
- [ ] Verify payroll calculations
- [ ] Check payment processing
- [ ] Gather user feedback

---

## 📝 Next Steps

1. **Start with Phase 1** - Build foundation (entities, migrations)
2. **Implement Payroll Service** - Core calculation logic
3. **Build Frontend** - User-friendly interfaces
4. **Add Reporting** - Analytics and insights
5. **Enhance Features** - Overtime, deductions, etc.

---

## 🎯 Success Criteria

The system will be considered complete when:
- ✅ Employees can have salary + commission configuration
- ✅ Payroll can be calculated automatically
- ✅ Commissions can be paid individually or via payroll
- ✅ All payments have audit trail
- ✅ Reports provide actionable insights
- ✅ UI is intuitive and professional

---

**Ready to build?** Start with Phase 1 and work through each phase systematically. This will create a professional, functional employment and payment system for your salon management platform.

