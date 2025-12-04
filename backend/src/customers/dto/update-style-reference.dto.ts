import { PartialType } from '@nestjs/mapped-types';
import { CreateStyleReferenceDto } from './create-style-reference.dto';

export class UpdateStyleReferenceDto extends PartialType(CreateStyleReferenceDto) {}


