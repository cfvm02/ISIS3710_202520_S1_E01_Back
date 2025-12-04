import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Public()
  @Get('posts')
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
    return this.searchService.searchPosts(q, occasion, style, tags);
  }

  @Public()
  @Get('users')
  @ApiOperation({ summary: 'Search users' })
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'style', required: false })
  @ApiResponse({ status: 200, description: 'Users found successfully' })
  searchUsers(
    @Query('q') q?: string,
    @Query('style') style?: string,
    @CurrentUser('userId') currentUserId?: string,
  ) {
    return this.searchService.searchUsers(q, style, currentUserId);
  }

  @Public()
  @Get('suggestions')
  @ApiOperation({ summary: 'Get search suggestions' })
  @ApiQuery({ name: 'q', required: true })
  @ApiResponse({
    status: 200,
    description: 'Suggestions retrieved successfully',
  })
  getSuggestions(@Query('q') q: string) {
    return this.searchService.getSuggestions(q);
  }
}
