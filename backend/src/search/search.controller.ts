import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SearchService, GlobalSearchResult } from './search.service';
import { UserRole } from '../users/entities/user.entity';
import { SalonsService } from '../salons/salons.service';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Search')
@ApiBearerAuth()
@Controller('search')
export class SearchController {
  constructor(
    private readonly searchService: SearchService,
    private readonly salonsService: SalonsService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Global search across all entities with role-based access',
  })
  @ApiQuery({
    name: 'q',
    required: true,
    description: 'Search query (min 2 characters)',
  })
  async globalSearch(
    @Query('q') query: string,
    @Request() req: any,
  ): Promise<GlobalSearchResult> {
    const user = req.user;

    // Get user's accessible salon IDs for filtering
    let salonIds: string[] = [];
    let userId: string | undefined = undefined;
    let userRole: any = 'GUEST';

    if (user) {
      userId = user.id;
      userRole = user.role;
      try {
        if (user.role === UserRole.SALON_OWNER) {
          const salons = await this.salonsService.findByOwnerId(user.id);
          salonIds = salons.map((s) => s.id);
        } else if (user.role === UserRole.SALON_EMPLOYEE) {
          // Get salons where user is an employee
          const employees = await this.salonsService.findAllEmployeesByUserId(
            user.id,
          );
          salonIds = employees.map((e) => e.salonId).filter(Boolean) as string[];
        }
      } catch (error) {
        // If salon lookup fails, continue without salon filtering
      }
    }

    return this.searchService.globalSearch(query, {
      userId,
      userRole,
      salonIds: salonIds.length > 0 ? salonIds : undefined,
    });
  }

  @Get('legacy')
  @ApiOperation({ summary: 'Legacy search for salons and services only' })
  async legacySearch(
    @Query('q') query: string,
  ): Promise<{ salons: any[]; services: any[] }> {
    return this.searchService.search(query);
  }
}
