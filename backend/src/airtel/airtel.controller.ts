import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AirtelService } from './airtel.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateAirtelAgentDto } from './dto/create-airtel-agent.dto';

@ApiTags('Airtel')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('airtel')
export class AirtelController {
  constructor(private readonly airtelService: AirtelService) {}

  @Post('agents')
  @ApiOperation({ summary: 'Register an Airtel agent' })
  registerAgent(@Body() registerAgentDto: CreateAirtelAgentDto) {
    return this.airtelService.registerAgent(registerAgentDto);
  }

  @Get('agents')
  @ApiOperation({ summary: 'Get all Airtel agents' })
  findAllAgents() {
    return this.airtelService.findAllAgents();
  }

  @Get('agents/:agentId/transactions')
  @ApiOperation({ summary: 'Get agent transactions' })
  getAgentTransactions(@Param('agentId') agentId: string) {
    return this.airtelService.getAgentTransactions(agentId);
  }
}

