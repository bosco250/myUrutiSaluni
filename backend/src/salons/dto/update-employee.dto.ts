import { PartialType } from '@nestjs/swagger';
import { CreateEmployeeDto } from './create-employee.dto';

export class UpdateEmployeeDto extends PartialType(CreateEmployeeDto) {
  // Remove salonId from updates (employees can't be moved between salons)
  salonId?: never;
}
