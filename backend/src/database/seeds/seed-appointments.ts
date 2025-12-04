import { DataSource } from 'typeorm';
import { Appointment, AppointmentStatus } from '../../appointments/entities/appointment.entity';
import { Salon } from '../../salons/entities/salon.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { Service } from '../../services/entities/service.entity';
import { User, UserRole } from '../../users/entities/user.entity';

export async function seedAppointments(dataSource: DataSource) {
  const appointmentRepository = dataSource.getRepository(Appointment);
  const salonRepository = dataSource.getRepository(Salon);
  const customerRepository = dataSource.getRepository(Customer);
  const serviceRepository = dataSource.getRepository(Service);
  const userRepository = dataSource.getRepository(User);

  console.log('🌱 Seeding appointments...');

  // Check existing appointments
  const existingAppointmentsCount = await appointmentRepository.count();
  console.log(`📊 Current database state: ${existingAppointmentsCount} existing appointment(s)`);

  // Get existing data
  const salons = await salonRepository.find({ take: 10 });
  const customers = await customerRepository.find({ take: 20 });
  const services = await serviceRepository.find({ take: 30 });
  const salonOwners = await userRepository.find({
    where: { role: UserRole.SALON_OWNER },
    take: 10,
  });

  if (salons.length === 0) {
    console.log('⚠️  No salons found. Please run salon seeds first.');
    return;
  }

  if (services.length === 0) {
    console.log('⚠️  No services found. Please run service seeds first.');
    return;
  }

  console.log(`📋 Found ${salons.length} salons, ${customers.length} customers, ${services.length} services`);

  // Helper function to add days/hours to a date
  const addDays = (date: Date, days: number): Date => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };

  const addHours = (date: Date, hours: number): Date => {
    const result = new Date(date);
    result.setHours(result.getHours() + hours);
    return result;
  };

  // Generate appointments
  const now = new Date();
  const appointments: Partial<Appointment>[] = [];

  // Past appointments (completed, cancelled, no_show)
  for (let i = 0; i < 15; i++) {
    const salon = salons[Math.floor(Math.random() * salons.length)];
    const service = services[Math.floor(Math.random() * services.length)];
    const customer = customers.length > 0 ? customers[Math.floor(Math.random() * customers.length)] : null;
    const owner = salonOwners.find(o => o.id === salon.ownerId) || salonOwners[0];

    const daysAgo = Math.floor(Math.random() * 30) + 1; // 1-30 days ago
    const hour = Math.floor(Math.random() * 8) + 9; // 9 AM - 5 PM
    const scheduledStart = new Date(now);
    scheduledStart.setDate(scheduledStart.getDate() - daysAgo);
    scheduledStart.setHours(hour, Math.random() < 0.5 ? 0 : 30, 0, 0);
    const scheduledEnd = addHours(scheduledStart, service.durationMinutes ? service.durationMinutes / 60 : 1);

    const statuses = [AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW];
    const status = statuses[Math.floor(Math.random() * statuses.length)];

    appointments.push({
      salonId: salon.id,
      customerId: customer?.id || null,
      serviceId: service.id,
      scheduledStart,
      scheduledEnd,
      status,
      createdById: owner?.id || null,
      notes: status === AppointmentStatus.COMPLETED 
        ? 'Service completed successfully' 
        : status === AppointmentStatus.CANCELLED 
        ? 'Customer cancelled appointment' 
        : 'Customer did not show up',
    });
  }

  // Today's appointments (confirmed, in_progress, booked)
  for (let i = 0; i < 10; i++) {
    const salon = salons[Math.floor(Math.random() * salons.length)];
    const service = services[Math.floor(Math.random() * services.length)];
    const customer = customers.length > 0 ? customers[Math.floor(Math.random() * customers.length)] : null;
    const owner = salonOwners.find(o => o.id === salon.ownerId) || salonOwners[0];

    const hour = Math.floor(Math.random() * 8) + 9; // 9 AM - 5 PM
    const scheduledStart = new Date(now);
    scheduledStart.setHours(hour, Math.random() < 0.5 ? 0 : 30, 0, 0);
    const scheduledEnd = addHours(scheduledStart, service.durationMinutes ? service.durationMinutes / 60 : 1);

    const statuses = [AppointmentStatus.BOOKED, AppointmentStatus.CONFIRMED, AppointmentStatus.IN_PROGRESS];
    const status = statuses[Math.floor(Math.random() * statuses.length)];

    appointments.push({
      salonId: salon.id,
      customerId: customer?.id || null,
      serviceId: service.id,
      scheduledStart,
      scheduledEnd,
      status,
      createdById: owner?.id || null,
      notes: status === AppointmentStatus.CONFIRMED 
        ? 'Appointment confirmed by customer' 
        : status === AppointmentStatus.IN_PROGRESS
        ? 'Service in progress'
        : 'Appointment booked',
    });
  }

  // Future appointments (booked, confirmed)
  for (let i = 0; i < 25; i++) {
    const salon = salons[Math.floor(Math.random() * salons.length)];
    const service = services[Math.floor(Math.random() * services.length)];
    const customer = customers.length > 0 ? customers[Math.floor(Math.random() * customers.length)] : null;
    const owner = salonOwners.find(o => o.id === salon.ownerId) || salonOwners[0];

    const daysAhead = Math.floor(Math.random() * 30) + 1; // 1-30 days ahead
    const hour = Math.floor(Math.random() * 8) + 9; // 9 AM - 5 PM
    const scheduledStart = new Date(now);
    scheduledStart.setDate(scheduledStart.getDate() + daysAhead);
    scheduledStart.setHours(hour, Math.random() < 0.5 ? 0 : 30, 0, 0);
    const scheduledEnd = addHours(scheduledStart, service.durationMinutes ? service.durationMinutes / 60 : 1);

    const statuses = [AppointmentStatus.BOOKED, AppointmentStatus.CONFIRMED];
    const status = statuses[Math.floor(Math.random() * statuses.length)];

    appointments.push({
      salonId: salon.id,
      customerId: customer?.id || null,
      serviceId: service.id,
      scheduledStart,
      scheduledEnd,
      status,
      createdById: owner?.id || null,
      notes: status === AppointmentStatus.CONFIRMED 
        ? 'Appointment confirmed' 
        : 'Appointment booked, awaiting confirmation',
    });
  }

  // Insert appointments
  let created = 0;
  let skipped = 0;

  for (const appointmentData of appointments) {
    try {
      // Check if appointment already exists (same salon, service, and time)
      const existing = await appointmentRepository.findOne({
        where: {
          salonId: appointmentData.salonId,
          serviceId: appointmentData.serviceId,
          scheduledStart: appointmentData.scheduledStart,
        },
      });

      if (existing) {
        skipped++;
        continue;
      }

      const appointment = appointmentRepository.create(appointmentData);
      await appointmentRepository.save(appointment);
      created++;
    } catch (error) {
      console.error(`Error creating appointment:`, error);
      skipped++;
    }
  }

  console.log(`✅ Appointments seeding completed!`);
  console.log(`   - Created: ${created} appointments`);
  console.log(`   - Skipped: ${skipped} appointments (already exist)`);
  console.log(`   - Total appointments in database: ${await appointmentRepository.count()}`);
}

