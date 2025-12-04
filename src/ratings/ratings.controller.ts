import {
  Controller,
  Get,
  Put,
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
import { RatingsService } from './ratings.service';
import { CreateRatingDto } from './dto/create-rating.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Ratings')
@Controller('posts/:postId/ratings')
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  @Put()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create or update rating for a post' })
  @ApiResponse({
    status: 200,
    description: 'Rating created/updated successfully',
  })
  upsertRating(
    @Param('postId') postId: string,
    @CurrentUser('userId') userId: string,
    @Body() createRatingDto: CreateRatingDto,
  ) {
    return this.ratingsService.upsertRating(postId, userId, createRatingDto);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user rating for a post' })
  @ApiResponse({ status: 200, description: 'Rating retrieved successfully' })
  getUserRating(
    @Param('postId') postId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.ratingsService.getUserRating(postId, userId);
  }

  @Delete()
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete rating for a post' })
  @ApiResponse({ status: 200, description: 'Rating deleted successfully' })
  deleteRating(
    @Param('postId') postId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.ratingsService.deleteRating(postId, userId);
  }
}
