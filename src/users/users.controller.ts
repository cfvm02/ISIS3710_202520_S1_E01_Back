import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
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
import { UsersService } from './users.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { UserProfileResponseDto } from './dto/user-profile-response.dto';
import { FollowResponseDto, BlockResponseDto } from './dto/follow-response.dto';
import { PaginatedResponseDto } from '../common/dto/pagination.dto';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Search users' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'style', required: false })
  @ApiResponse({ status: 200, description: 'Users found successfully' })
  async searchUsers(
    @Query('search') search?: string,
    @Query('style') style?: string,
    @CurrentUser('userId') currentUserId?: string,
  ) {
    return this.usersService.searchUsers(search || '', style, currentUserId);
  }

  @Public()
  @Get(':userId')
  @ApiOperation({ summary: 'Get user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    type: UserProfileResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserProfile(
    @Param('userId') userId: string,
    @CurrentUser('userId') currentUserId?: string,
  ): Promise<UserProfileResponseDto> {
    return this.usersService.getUserProfile(userId, currentUserId);
  }

  @Public()
  @Get(':userId/posts')
  @ApiOperation({ summary: 'Get user posts' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: ['published', 'draft'] })
  @ApiResponse({
    status: 200,
    description: 'Posts retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        posts: {
          type: 'array',
          items: { type: 'object' },
        },
        total: { type: 'number' },
      },
    },
  })
  async getUserPosts(
    @Param('userId') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
  ): Promise<{ posts: any[]; total: number }> {
    return this.usersService.getUserPosts(userId, page, limit, status);
  }

  @Public()
  @Get(':userId/followers')
  @ApiOperation({ summary: 'Get user followers' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Followers retrieved successfully' })
  async getFollowers(
    @Param('userId') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<PaginatedResponseDto<any>> {
    return this.usersService.getFollowers(userId, page, limit);
  }

  @Public()
  @Get(':userId/following')
  @ApiOperation({ summary: 'Get users followed by this user' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Following retrieved successfully' })
  async getFollowing(
    @Param('userId') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<PaginatedResponseDto<any>> {
    return this.usersService.getFollowing(userId, page, limit);
  }

  @Post(':userId/follow')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Follow a user' })
  @ApiResponse({
    status: 201,
    description: 'User followed successfully',
    type: FollowResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'Already following this user' })
  async followUser(
    @CurrentUser('userId') currentUserId: string,
    @Param('userId') userId: string,
  ): Promise<FollowResponseDto> {
    return this.usersService.followUser(currentUserId, userId);
  }

  @Delete(':userId/follow')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unfollow a user' })
  @ApiResponse({
    status: 200,
    description: 'User unfollowed successfully',
    type: FollowResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Not following this user' })
  async unfollowUser(
    @CurrentUser('userId') currentUserId: string,
    @Param('userId') userId: string,
  ): Promise<FollowResponseDto> {
    return this.usersService.unfollowUser(currentUserId, userId);
  }

  @Post(':userId/block')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Block a user' })
  @ApiResponse({
    status: 201,
    description: 'User blocked successfully',
    type: BlockResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async blockUser(
    @CurrentUser('userId') currentUserId: string,
    @Param('userId') userId: string,
  ): Promise<BlockResponseDto> {
    return this.usersService.blockUser(currentUserId, userId);
  }

  @Delete(':userId/block')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unblock a user' })
  @ApiResponse({
    status: 200,
    description: 'User unblocked successfully',
    type: BlockResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not blocked' })
  async unblockUser(
    @CurrentUser('userId') currentUserId: string,
    @Param('userId') userId: string,
  ): Promise<BlockResponseDto> {
    return this.usersService.unblockUser(currentUserId, userId);
  }
}
