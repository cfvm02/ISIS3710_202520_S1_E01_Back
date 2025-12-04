import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { PostsService } from './posts.service';
import { CreatePostDto, UpdatePostDto } from './dto/create-post.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { PaginatedPostsResponseDto } from './dto/paginated-posts-response.dto';

@ApiTags('Posts')
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new post' })
  @ApiResponse({ status: 201, description: 'Post created successfully' })
  create(
    @CurrentUser('userId') userId: string,
    @Body() createPostDto: CreatePostDto,
  ) {
    return this.postsService.create(userId, createPostDto);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get posts feed (with filters)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'filter', required: false, enum: ['following', 'all'] })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'sort', required: false, enum: ['recent', 'popular'] })
  @ApiQuery({ name: 'section', required: false })
  @ApiQuery({ name: 'occasion', required: false })
  @ApiQuery({ name: 'style', required: false })
  @ApiQuery({ name: 'tags', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ['published', 'draft'] })
  @ApiResponse({ status: 200, description: 'Posts retrieved successfully' })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('filter') filter?: string,
    @Query('userId') userId?: string,
    @Query('sort') sort?: string,
    @Query('section') section?: string,
    @Query('occasion') occasion?: string,
    @Query('style') style?: string,
    @Query('tags') tags?: string,
    @Query('status') status?: string,
    @CurrentUser('userId') currentUserId?: string,
  ): Promise<PaginatedPostsResponseDto> {
    return this.postsService.findAll(
      page,
      limit,
      filter,
      userId,
      sort,
      section,
      occasion,
      style,
      tags,
      status,
      currentUserId,
    );
  }

  @Public()
  @Get('search')
  @ApiOperation({ summary: 'Search posts' })
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'occasion', required: false })
  @ApiQuery({ name: 'style', required: false })
  @ApiQuery({ name: 'tags', required: false })
  @ApiResponse({ status: 200, description: 'Posts found successfully' })
  searchPosts(
    @Query('q') q?: string,
    @Query('occasion') occasion?: string,
    @Query('style') style?: string,
    @Query('tags') tags?: string,
  ) {
    return this.postsService.searchPosts(q, occasion, style, tags);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get post by id' })
  @ApiResponse({ status: 200, description: 'Post retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  findOne(
    @Param('id') id: string,
    @CurrentUser('userId') currentUserId?: string,
  ) {
    return this.postsService.findOne(id, currentUserId);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update post' })
  @ApiResponse({ status: 200, description: 'Post updated successfully' })
  @ApiResponse({
    status: 403,
    description: 'You can only update your own posts',
  })
  @ApiResponse({ status: 404, description: 'Post not found' })
  update(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @Body() updatePostDto: UpdatePostDto,
  ) {
    return this.postsService.update(id, userId, updatePostDto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete post' })
  @ApiResponse({ status: 200, description: 'Post deleted successfully' })
  @ApiResponse({
    status: 403,
    description: 'You can only delete your own posts',
  })
  @ApiResponse({ status: 404, description: 'Post not found' })
  remove(@Param('id') id: string, @CurrentUser('userId') userId: string) {
    return this.postsService.remove(id, userId);
  }

  @Post(':id/like')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Like a post' })
  @ApiResponse({ status: 201, description: 'Post liked successfully' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  likePost(@Param('id') id: string, @CurrentUser('userId') userId: string) {
    return this.postsService.likePost(id, userId);
  }

  @Delete(':id/like')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unlike a post' })
  @ApiResponse({ status: 200, description: 'Post unliked successfully' })
  @ApiResponse({ status: 404, description: 'Post not liked' })
  unlikePost(@Param('id') id: string, @CurrentUser('userId') userId: string) {
    return this.postsService.unlikePost(id, userId);
  }
}
