import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Conversation, ConversationType } from './entities/conversation.entity';
import { Message, MessageStatus, MessageType } from './entities/message.entity';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { CustomersService } from '../customers/customers.service';
import { UsersService } from '../users/users.service';
import { SalonsService } from '../salons/salons.service';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    public customersService: CustomersService,
    private usersService: UsersService,
    public salonsService: SalonsService,
  ) {}

  /**
   * Get or create a conversation between customer and employee/salon
   */
  async getOrCreateConversation(
    customerId: string,
    createDto: CreateConversationDto,
    currentUser: any,
  ): Promise<Conversation> {
    // Verify customer access
    const customer = await this.customersService.findOne(customerId);
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // Check if customer is accessing their own conversation
    if (currentUser.role === 'customer' || currentUser.role === 'CUSTOMER') {
      const customerUser = await this.customersService.findByUserId(
        currentUser.id || currentUser.userId,
      );
      if (!customerUser || customerUser.id !== customerId) {
        throw new ForbiddenException(
          'You can only access your own conversations',
        );
      }
    }

    const type = createDto.type || ConversationType.CUSTOMER_EMPLOYEE;
    const salonEmployeeId = createDto.employeeId;
    let salonId = createDto.salonId;
    let employeeUserId: string | undefined;

    // Multi-tenant: Resolve employeeId to actual User ID (FK references User table, not SalonEmployee)
    if (salonEmployeeId) {
      const employee =
        await this.salonsService.findEmployeeById(salonEmployeeId);
      if (employee && employee.user) {
        // Use the User ID, not the SalonEmployee ID
        employeeUserId = employee.user.id;
        // Also get salonId if not provided
        if (!salonId && employee.salon) {
          salonId = employee.salon.id;
        }
        this.logger.log(
          `Resolved SalonEmployee ${salonEmployeeId} -> User ${employeeUserId} (salon: ${salonId})`,
        );
      } else {
        throw new NotFoundException(
          `Employee ${salonEmployeeId} not found or has no user account`,
        );
      }
    }

    // Find existing conversation - use employeeUserId (User ID) for lookup
    const where: any = { customerId };
    if (type === ConversationType.CUSTOMER_EMPLOYEE && employeeUserId) {
      where.employeeId = employeeUserId;
      // Multi-tenant: Include salonId in conversation lookup
      if (salonId) {
        where.salonId = salonId;
      }
    } else if (type === ConversationType.CUSTOMER_SALON && salonId) {
      where.salonId = salonId;
    }
    where.appointmentId = createDto.appointmentId || null;

    let conversation = await this.conversationRepository.findOne({
      where,
      relations: ['customer', 'employee', 'salon', 'appointment'],
    });

    // Create new conversation if it doesn't exist
    if (!conversation) {
      conversation = this.conversationRepository.create({
        customerId,
        employeeId: employeeUserId, // Use User ID, not SalonEmployee ID
        salonId, // Always set salonId for multi-tenant isolation
        appointmentId: createDto.appointmentId,
        type,
      });
      conversation = await this.conversationRepository.save(conversation);
      this.logger.log(
        `Created new conversation: ${conversation.id} (salon: ${salonId}, employeeUserId: ${employeeUserId})`,
      );
    }

    return conversation;
  }

  /**
   * Get all conversations for a customer
   */
  async getCustomerConversations(
    customerId: string,
    currentUser: any,
  ): Promise<Conversation[]> {
    // Verify access
    if (currentUser.role === 'customer' || currentUser.role === 'CUSTOMER') {
      const customerUser = await this.customersService.findByUserId(
        currentUser.id || currentUser.userId,
      );
      if (!customerUser || customerUser.id !== customerId) {
        throw new ForbiddenException(
          'You can only access your own conversations',
        );
      }
    }

    return this.conversationRepository.find({
      where: { customerId, isArchived: false },
      relations: ['employee', 'salon', 'appointment'],
      order: { lastMessageAt: 'DESC', updatedAt: 'DESC' },
    });
  }

  /**
   * Get all conversations for an employee
   */
  async getEmployeeConversations(
    employeeId: string,
    salonId?: string,
  ): Promise<Conversation[]> {
    const where: any = { employeeId, isArchived: false };
    if (salonId) {
      where.salonId = salonId;
    }

    return this.conversationRepository.find({
      where,
      relations: ['customer', 'salon', 'appointment'],
      order: { lastMessageAt: 'DESC', updatedAt: 'DESC' },
    });
  }

  /**
   * Get conversation by ID
   */
  async getConversation(
    conversationId: string,
    currentUser: any,
  ): Promise<Conversation> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
      relations: ['customer', 'employee', 'salon', 'appointment'],
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Verify access
    if (currentUser.role === 'customer' || currentUser.role === 'CUSTOMER') {
      const customerUser = await this.customersService.findByUserId(
        currentUser.id || currentUser.userId,
      );
      if (!customerUser || customerUser.id !== conversation.customerId) {
        throw new ForbiddenException(
          'You can only access your own conversations',
        );
      }
    }

    // Multi-tenant: Verify employee/salon owner can only access conversations from their salon
    if (
      (currentUser.role === 'salon_employee' ||
        currentUser.role === 'SALON_EMPLOYEE' ||
        currentUser.role === 'salon_owner' ||
        currentUser.role === 'SALON_OWNER') &&
      conversation.salonId
    ) {
      // Get employee's salon
      const employee = await this.salonsService.findEmployeeByUserId(
        currentUser.id || currentUser.userId,
      );

      // For salon owners, check if they own the salon
      if (
        currentUser.role === 'salon_owner' ||
        currentUser.role === 'SALON_OWNER'
      ) {
        const salon = await this.salonsService.findOne(conversation.salonId);
        if (salon && salon.ownerId !== (currentUser.id || currentUser.userId)) {
          throw new ForbiddenException(
            'You can only access conversations from your salon',
          );
        }
      } else if (employee && employee.salonId !== conversation.salonId) {
        // For employees, check if they belong to the same salon
        throw new ForbiddenException(
          'You can only access conversations from your salon',
        );
      }
    }

    return conversation;
  }

  /**
   * Get messages for a conversation
   */
  async getMessages(
    conversationId: string,
    page: number = 1,
    limit: number = 50,
    currentUser: any,
  ): Promise<{ messages: Message[]; total: number }> {
    // Verify conversation access
    await this.getConversation(conversationId, currentUser);

    const skip = (page - 1) * limit;

    const [messages, total] = await this.messageRepository.findAndCount({
      where: { conversationId },
      relations: ['sender', 'customerSender'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip,
    });

    // Reverse to show oldest first
    return {
      messages: messages.reverse(),
      total,
    };
  }

  /**
   * Create a new message
   */
  async createMessage(
    createDto: CreateMessageDto,
    currentUser: any,
  ): Promise<Message> {
    const conversation = await this.getConversation(
      createDto.conversationId,
      currentUser,
    );

    // Determine if message is from customer
    const isFromCustomer =
      currentUser.role === 'customer' || currentUser.role === 'CUSTOMER';
    let customerSenderId: string | undefined;
    let senderId: string | undefined;

    if (isFromCustomer) {
      const customerUser = await this.customersService.findByUserId(
        currentUser.id || currentUser.userId,
      );
      if (!customerUser || customerUser.id !== conversation.customerId) {
        throw new ForbiddenException('Invalid customer');
      }
      customerSenderId = customerUser.id;
    } else {
      senderId = currentUser.id || currentUser.userId;
    }

    // Create message
    const message = this.messageRepository.create({
      conversationId: createDto.conversationId,
      content: createDto.content,
      type: createDto.type || MessageType.TEXT,
      status: MessageStatus.SENT,
      isFromCustomer,
      senderId,
      customerSenderId,
      metadata: createDto.metadata,
      deliveredAt: new Date(),
    });

    const savedMessage = await this.messageRepository.save(message);

    // Update conversation
    conversation.lastMessageId = savedMessage.id;
    conversation.lastMessageAt = savedMessage.createdAt;
    if (isFromCustomer) {
      conversation.employeeUnreadCount += 1;
    } else {
      conversation.customerUnreadCount += 1;
    }
    await this.conversationRepository.save(conversation);

    // Return message with relations
    return this.messageRepository.findOne({
      where: { id: savedMessage.id },
      relations: ['sender', 'customerSender'],
    });
  }

  /**
   * Mark messages as read
   */
  async markAsRead(conversationId: string, currentUser: any): Promise<void> {
    const conversation = await this.getConversation(
      conversationId,
      currentUser,
    );

    const isFromCustomer =
      currentUser.role === 'customer' || currentUser.role === 'CUSTOMER';

    // Update unread count
    if (isFromCustomer) {
      conversation.customerUnreadCount = 0;
    } else {
      conversation.employeeUnreadCount = 0;
    }
    await this.conversationRepository.save(conversation);

    // Mark messages as read
    const where: any = {
      conversationId,
      status: In([MessageStatus.SENT, MessageStatus.DELIVERED]),
    };

    if (isFromCustomer) {
      where.isFromCustomer = false;
    } else {
      where.isFromCustomer = true;
    }

    await this.messageRepository.update(where, {
      status: MessageStatus.READ,
      readAt: new Date(),
    });
  }

  /**
   * Get unread count for a user
   */
  async getUnreadCount(currentUser: any): Promise<number> {
    if (currentUser.role === 'customer' || currentUser.role === 'CUSTOMER') {
      const customerUser = await this.customersService.findByUserId(
        currentUser.id || currentUser.userId,
      );
      if (!customerUser) {
        return 0;
      }

      const conversations = await this.conversationRepository.find({
        where: { customerId: customerUser.id, isArchived: false },
      });

      return conversations.reduce(
        (sum, conv) => sum + conv.customerUnreadCount,
        0,
      );
    } else {
      // Employee
      const conversations = await this.conversationRepository.find({
        where: {
          employeeId: currentUser.id || currentUser.userId,
          isArchived: false,
        },
      });

      return conversations.reduce(
        (sum, conv) => sum + conv.employeeUnreadCount,
        0,
      );
    }
  }

  /**
   * Search users that can be messaged (employees, salon owners)
   */
  async searchUsersForChat(
    query?: string,
    role?: string,
  ): Promise<
    Array<{
      id: string;
      userId: string;
      name: string;
      email?: string;
      phone?: string;
      role: string;
      salonId?: string;
      salonName?: string;
      isActive?: boolean;
    }>
  > {
    // Require a search query (at least 2 characters)
    if (!query || query.trim().length < 2) {
      return [];
    }

    const results: Array<{
      id: string;
      userId: string;
      name: string;
      email?: string;
      phone?: string;
      role: string;
      salonId?: string;
      salonName?: string;
      isActive?: boolean;
    }> = [];

    const searchLower = query.trim().toLowerCase();

    // Get all salons with employees
    const allSalons = await this.salonsService.findAll();

    for (const salon of allSalons) {
      // Get employees for this salon
      const employees = await this.salonsService.getSalonEmployees(salon.id);

      for (const employee of employees) {
        if (!employee.isActive) continue;

        const user = employee.user;
        if (!user) continue;

        // Filter by query (required)
        const matches =
          user.fullName?.toLowerCase().includes(searchLower) ||
          user.email?.toLowerCase().includes(searchLower) ||
          user.phone?.includes(query.trim());

        if (!matches) continue;

        // Filter by role if provided
        if (role && role !== 'SALON_EMPLOYEE') continue;

        results.push({
          id: employee.id,
          userId: user.id,
          name: user.fullName || 'Employee',
          email: user.email,
          phone: user.phone,
          role: 'SALON_EMPLOYEE',
          salonId: salon.id,
          salonName: salon.name,
          isActive: employee.isActive,
        });
      }

      // Add salon owner
      if (salon.owner) {
        const owner = salon.owner;

        // Filter by query (required)
        const matches =
          salon.name?.toLowerCase().includes(searchLower) ||
          owner.fullName?.toLowerCase().includes(searchLower) ||
          owner.email?.toLowerCase().includes(searchLower) ||
          owner.phone?.includes(query.trim());

        if (!matches) continue;

        // Filter by role if provided
        if (role && role !== 'SALON_OWNER') continue;

        results.push({
          id: salon.id,
          userId: owner.id,
          name: owner.fullName || salon.name,
          email: owner.email,
          phone: owner.phone,
          role: 'SALON_OWNER',
          salonId: salon.id,
          salonName: salon.name,
          isActive: salon.status === 'active',
        });
      }
    }

    // Remove duplicates (same userId and role)
    const uniqueResults = results.reduce(
      (acc, current) => {
        const existing = acc.find(
          (r) => r.userId === current.userId && r.role === current.role,
        );
        if (!existing) {
          acc.push(current);
        }
        return acc;
      },
      [] as typeof results,
    );

    return uniqueResults;
  }
}
