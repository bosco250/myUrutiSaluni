import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ChatService } from './chat.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreateConversationDto } from './dto/create-conversation.dto';

@ApiTags('Chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('conversations')
  @ApiOperation({ summary: 'Get or create a conversation' })
  async getOrCreateConversation(
    @Body() createDto: CreateConversationDto,
    @CurrentUser() currentUser: any,
    @Query('customerId') customerId: string,
  ) {
    // For customers, use their own customer ID
    if (currentUser.role === 'customer' || currentUser.role === 'CUSTOMER') {
      const customer = await this.chatService.customersService.findByUserId(
        currentUser.id || currentUser.userId,
      );
      if (!customer) {
        throw new Error('Customer not found');
      }
      customerId = customer.id;
    }

    if (!customerId) {
      throw new Error('Customer ID is required');
    }

    return this.chatService.getOrCreateConversation(
      customerId,
      createDto,
      currentUser,
    );
  }

  @Get('conversations')
  @ApiOperation({ summary: 'Get all conversations for current user' })
  @ApiQuery({ name: 'customerId', required: false })
  @ApiQuery({ name: 'employeeId', required: false })
  @ApiQuery({ name: 'salonId', required: false })
  async getConversations(
    @CurrentUser() currentUser: any,
    @Query('customerId') customerId?: string,
    @Query('employeeId') employeeId?: string,
    @Query('salonId') salonId?: string,
  ) {
    if (currentUser.role === 'customer' || currentUser.role === 'CUSTOMER') {
      const customer = await this.chatService.customersService.findByUserId(
        currentUser.id || currentUser.userId,
      );
      if (!customer) {
        return [];
      }
      return this.chatService.getCustomerConversations(
        customer.id,
        currentUser,
      );
    } else if (employeeId || currentUser.role === 'salon_employee') {
      const empId = employeeId || currentUser.id || currentUser.userId;
      // Multi-tenant: Auto-detect salonId from employee if not provided
      let empSalonId = salonId;
      if (!empSalonId) {
        const employee =
          await this.chatService.salonsService.findEmployeeByUserId(empId);
        if (employee) {
          empSalonId = employee.salonId;
        }
      }
      return this.chatService.getEmployeeConversations(empId, empSalonId);
    }

    // For salon owners/admins, get all conversations in their salon
    if (salonId && customerId) {
      return this.chatService.getCustomerConversations(customerId, currentUser);
    }

    return [];
  }

  @Get('conversations/:conversationId')
  @ApiOperation({ summary: 'Get conversation by ID' })
  @ApiParam({ name: 'conversationId' })
  async getConversation(
    @Param('conversationId') conversationId: string,
    @CurrentUser() currentUser: any,
  ) {
    return this.chatService.getConversation(conversationId, currentUser);
  }

  @Get('conversations/:conversationId/messages')
  @ApiOperation({ summary: 'Get messages for a conversation' })
  @ApiParam({ name: 'conversationId' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getMessages(
    @Param('conversationId') conversationId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 50,
    @CurrentUser() currentUser: any,
  ) {
    return this.chatService.getMessages(
      conversationId,
      page,
      limit,
      currentUser,
    );
  }

  @Post('messages')
  @ApiOperation({ summary: 'Send a message' })
  async createMessage(
    @Body() createDto: CreateMessageDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.chatService.createMessage(createDto, currentUser);
  }

  @Post('conversations/:conversationId/read')
  @ApiOperation({ summary: 'Mark messages as read' })
  @ApiParam({ name: 'conversationId' })
  async markAsRead(
    @Param('conversationId') conversationId: string,
    @CurrentUser() currentUser: any,
  ) {
    await this.chatService.markAsRead(conversationId, currentUser);
    return { success: true };
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get total unread message count' })
  async getUnreadCount(@CurrentUser() currentUser: any) {
    const count = await this.chatService.getUnreadCount(currentUser);
    return { count };
  }

  @Get('search-users')
  @ApiOperation({ summary: 'Search users to start a conversation with' })
  @ApiQuery({ name: 'query', required: false })
  @ApiQuery({ name: 'role', required: false })
  async searchUsersForChat(
    @CurrentUser() currentUser: any,
    @Query('query') query: string | undefined,
    @Query('role') role: string | undefined,
  ) {
    return this.chatService.searchUsersForChat(query, role);
  }
}
