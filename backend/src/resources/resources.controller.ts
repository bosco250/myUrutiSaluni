import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { ResourcesService } from './resources.service';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';
import { ResourceCategory, ResourceType, ResourceStatus } from './entities/resource.entity';
import { FileUploadService } from '../common/services/file-upload.service';

@ApiTags('Resources')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('resources')
export class ResourcesController {
  constructor(
    private readonly resourcesService: ResourcesService,
    private readonly fileUploadService: FileUploadService,
  ) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN)
  @ApiOperation({ summary: 'Create a new resource' })
  create(@Body() createDto: CreateResourceDto, @CurrentUser() user: any) {
    return this.resourcesService.create(createDto, user.id);
  }

  @Post('upload')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        title: { type: 'string' },
        description: { type: 'string' },
        type: { type: 'string', enum: Object.values(ResourceType) },
        category: { type: 'string', enum: Object.values(ResourceCategory) },
        tags: { type: 'string' },
      },
    },
  })
  @ApiOperation({ summary: 'Upload a resource file' })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
    @CurrentUser() user: any,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const fileInfo = await this.fileUploadService.saveFile(file, 'resources');

    const createDto: CreateResourceDto = {
      title: body.title || file.originalname,
      description: body.description,
      type: body.type || this.getResourceTypeFromMime(file.mimetype),
      category: body.category || ResourceCategory.OTHER,
      fileUrl: fileInfo.url,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      tags: body.tags ? JSON.parse(body.tags) : [],
      status: ResourceStatus.PUBLISHED,
    };

    return this.resourcesService.create(createDto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all resources' })
  findAll(
    @Query('category') category?: ResourceCategory,
    @Query('type') type?: ResourceType,
    @Query('status') status?: ResourceStatus,
    @Query('search') search?: string,
    @CurrentUser() user?: any,
  ) {
    return this.resourcesService.findAll(user?.role, category, type, status, search);
  }

  @Get('featured')
  @ApiOperation({ summary: 'Get featured resources' })
  getFeatured(@CurrentUser() user?: any) {
    return this.resourcesService.getFeatured(user?.role);
  }

  @Get('category/:category')
  @ApiOperation({ summary: 'Get resources by category' })
  getByCategory(@Param('category') category: ResourceCategory, @CurrentUser() user?: any) {
    return this.resourcesService.getByCategory(category, user?.role);
  }

  @Get('statistics')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN)
  @ApiOperation({ summary: 'Get resource statistics' })
  getStatistics() {
    return this.resourcesService.getStatistics();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get resource by ID' })
  findOne(@Param('id') id: string, @CurrentUser() user?: any) {
    return this.resourcesService.findOne(id, user?.role);
  }

  @Post(':id/download')
  @ApiOperation({ summary: 'Increment download count' })
  async download(@Param('id') id: string) {
    await this.resourcesService.incrementDownloadCount(id);
    const resource = await this.resourcesService.findOne(id);
    return { downloadUrl: resource.fileUrl || resource.externalUrl };
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN)
  @ApiOperation({ summary: 'Update resource' })
  update(@Param('id') id: string, @Body() updateDto: UpdateResourceDto) {
    return this.resourcesService.update(id, updateDto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN)
  @ApiOperation({ summary: 'Delete resource' })
  remove(@Param('id') id: string) {
    return this.resourcesService.remove(id);
  }

  private getResourceTypeFromMime(mimeType: string): ResourceType {
    if (mimeType.startsWith('video/')) return ResourceType.VIDEO;
    if (mimeType.startsWith('audio/')) return ResourceType.AUDIO;
    if (mimeType.startsWith('image/')) return ResourceType.IMAGE;
    if (mimeType === 'application/pdf' || mimeType.includes('document')) return ResourceType.DOCUMENT;
    return ResourceType.DOCUMENT;
  }
}

