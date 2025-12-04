import { ApiProperty } from '@nestjs/swagger';
import { PaginatedResponseDto } from '../../common/dto/pagination.dto';

export class PaginatedPostsResponseDto {
  @ApiProperty({ description: 'List of posts' })
  posts: any[];

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  total: number;

  @ApiProperty()
  totalPages: number;

  @ApiProperty()
  hasNext: boolean;

  @ApiProperty()
  hasPrev: boolean;

  constructor(paginatedResponse: PaginatedResponseDto<any>) {
    this.posts = paginatedResponse.data;
    this.page = paginatedResponse.page;
    this.limit = paginatedResponse.limit;
    this.total = paginatedResponse.total;
    this.totalPages = paginatedResponse.totalPages;
    this.hasNext = paginatedResponse.hasNext;
    this.hasPrev = paginatedResponse.hasPrev;
  }
}
