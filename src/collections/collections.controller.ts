import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CollectionsService } from './collections.service';
import {
  CreateCollectionDto,
  UpdateCollectionDto,
  AddPostToCollectionDto,
} from './dto/collection.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Collections')
@Controller('collections')
export class CollectionsController {
  constructor(private readonly collectionsService: CollectionsService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new collection' })
  @ApiResponse({ status: 201, description: 'Collection created successfully' })
  create(
    @CurrentUser('userId') userId: string,
    @Body() createCollectionDto: CreateCollectionDto,
  ) {
    return this.collectionsService.create(userId, createCollectionDto);
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all collections for current user' })
  @ApiResponse({
    status: 200,
    description: 'Collections retrieved successfully',
  })
  findAll(@CurrentUser('userId') userId: string) {
    return this.collectionsService.findAll(userId);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get collection by id' })
  @ApiResponse({
    status: 200,
    description: 'Collection retrieved successfully',
  })
  findOne(@Param('id') id: string, @CurrentUser() user?: any) {
    const userId = user?.userId;
    return this.collectionsService.findOne(id, userId);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update collection' })
  @ApiResponse({ status: 200, description: 'Collection updated successfully' })
  update(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @Body() updateCollectionDto: UpdateCollectionDto,
  ) {
    return this.collectionsService.update(id, userId, updateCollectionDto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete collection' })
  @ApiResponse({ status: 200, description: 'Collection deleted successfully' })
  remove(@Param('id') id: string, @CurrentUser('userId') userId: string) {
    return this.collectionsService.remove(id, userId);
  }

  @Post(':id/items')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add post to collection' })
  @ApiResponse({
    status: 201,
    description: 'Post added to collection successfully',
  })
  addPost(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @Body() addPostDto: AddPostToCollectionDto,
  ) {
    return this.collectionsService.addPost(id, userId, addPostDto.postId);
  }

  @Delete(':id/items/:postId')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove post from collection' })
  @ApiResponse({
    status: 200,
    description: 'Post removed from collection successfully',
  })
  removePost(
    @Param('id') id: string,
    @Param('postId') postId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.collectionsService.removePost(id, userId, postId);
  }
}
