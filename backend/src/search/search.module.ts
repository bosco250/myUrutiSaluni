import { Module, forwardRef } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { SalonsModule } from '../salons/salons.module';
import { ServicesModule } from '../services/services.module';

@Module({
  imports: [forwardRef(() => SalonsModule), forwardRef(() => ServicesModule)],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
