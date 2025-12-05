import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Appointment } from './entities/appointment.entity';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Appointment)
    private appointmentsRepository: Repository<Appointment>,
  ) {}

  async create(appointmentData: any): Promise<Appointment> {
    const appointment = this.appointmentsRepository.create({
      ...appointmentData,
      scheduledStart: appointmentData.scheduledStart ? new Date(appointmentData.scheduledStart) : new Date(),
      scheduledEnd: appointmentData.scheduledEnd ? new Date(appointmentData.scheduledEnd) : new Date(),
    });
    const saved = await this.appointmentsRepository.save(appointment);
    return Array.isArray(saved) ? saved[0] : saved;
  }

  async findAll(salonId?: string): Promise<Appointment[]> {
    if (salonId) {
      return this.appointmentsRepository.find({ where: { salonId }, relations: ['customer', 'service', 'salon'] });
    }
    return this.appointmentsRepository.find({ relations: ['customer', 'service', 'salon'] });
  }

  async findBySalonIds(salonIds: string[]): Promise<Appointment[]> {
    return this.appointmentsRepository.find({
      where: salonIds.map(id => ({ salonId: id })),
      relations: ['customer', 'service', 'salon'],
    });
  }

  async findByCustomerId(customerId: string): Promise<Appointment[]> {
    return this.appointmentsRepository.find({
      where: { customerId },
      relations: ['customer', 'service', 'salon', 'createdBy'],
      order: { scheduledStart: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Appointment> {
    return this.appointmentsRepository.findOne({ 
      where: { id }, 
      relations: ['customer', 'service', 'salon', 'createdBy'] 
    });
  }

  async update(id: string, updateData: any): Promise<Appointment> {
    const updatePayload: any = { ...updateData };
    if (updateData.scheduledStart) {
      updatePayload.scheduledStart = new Date(updateData.scheduledStart);
    }
    if (updateData.scheduledEnd) {
      updatePayload.scheduledEnd = new Date(updateData.scheduledEnd);
    }
    await this.appointmentsRepository.update(id, updatePayload);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.appointmentsRepository.delete(id);
  }

  async findByPreferredEmployee(salonEmployeeId: string): Promise<Appointment[]> {
    // Query appointments where metadata contains preferredEmployeeId
    // Since metadata is stored as JSON, we need to use a JSON query
    return this.appointmentsRepository
      .createQueryBuilder('appointment')
      .leftJoinAndSelect('appointment.customer', 'customer')
      .leftJoinAndSelect('appointment.service', 'service')
      .leftJoinAndSelect('appointment.salon', 'salon')
      .leftJoinAndSelect('appointment.createdBy', 'createdBy')
      .where("appointment.metadata->>'preferredEmployeeId' = :salonEmployeeId", {
        salonEmployeeId,
      })
      .orderBy('appointment.scheduledStart', 'DESC')
      .getMany();
  }
}

