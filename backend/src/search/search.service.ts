import { Injectable } from '@nestjs/common';
import { SalonsService } from '../salons/salons.service';
import { ServicesService } from '../services/services.service';

export interface SearchResult {
  salons: any[];
  services: any[];
}

@Injectable()
export class SearchService {
  constructor(
    private readonly salonsService: SalonsService,
    private readonly servicesService: ServicesService,
  ) {}

  async search(query: string): Promise<SearchResult> {
    if (!query || query.length < 2) {
      return { salons: [], services: [] };
    }

    const [salons, services] = await Promise.all([
      this.salonsService.search(query),
      this.servicesService.search(query),
    ]);

    return {
      salons,
      services,
    };
  }
}
