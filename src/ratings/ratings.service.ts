import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Rating, RatingDocument } from '../schemas/rating.schema';
import { Post, PostDocument } from '../schemas/post.schema';
import { CreateRatingDto } from './dto/create-rating.dto';

@Injectable()
export class RatingsService {
  constructor(
    @InjectModel(Rating.name) private ratingModel: Model<RatingDocument>,
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
  ) {}

  async upsertRating(
    postId: string,
    userId: string,
    createRatingDto: CreateRatingDto,
  ): Promise<any> {
    const post = await this.postModel.findById(postId);
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const existingRating = await this.ratingModel.findOne({
      postId: new Types.ObjectId(postId),
      userId: new Types.ObjectId(userId),
    });

    if (existingRating) {
      existingRating.score = createRatingDto.score;
      await existingRating.save();
    } else {
      await this.ratingModel.create({
        postId: new Types.ObjectId(postId),
        userId: new Types.ObjectId(userId),
        score: createRatingDto.score,
      });
    }

    const { ratingAvg, ratingCount } = await this.recalculateRatings(postId);

    return {
      rating: createRatingDto.score,
      ratingAvg,
      ratingCount,
    };
  }

  async getUserRating(postId: string, userId: string): Promise<any> {
    const rating = await this.ratingModel.findOne({
      postId: new Types.ObjectId(postId),
      userId: new Types.ObjectId(userId),
    });

    if (!rating) {
      return { rating: null, score: null };
    }

    return {
      rating: rating._id,
      score: rating.score,
    };
  }

  async deleteRating(postId: string, userId: string): Promise<any> {
    const rating = await this.ratingModel.findOneAndDelete({
      postId: new Types.ObjectId(postId),
      userId: new Types.ObjectId(userId),
    });

    if (!rating) {
      throw new NotFoundException('Rating not found');
    }

    const { ratingAvg, ratingCount } = await this.recalculateRatings(postId);

    return {
      deleted: true,
      ratingAvg,
      ratingCount,
    };
  }

  private async recalculateRatings(
    postId: string,
  ): Promise<{ ratingAvg: number; ratingCount: number }> {
    const ratings = await this.ratingModel.find({
      postId: new Types.ObjectId(postId),
    });

    const ratingCount = ratings.length;
    const ratingAvg =
      ratingCount > 0
        ? ratings.reduce((sum, r) => sum + r.score, 0) / ratingCount
        : 0;

    await this.postModel.findByIdAndUpdate(postId, {
      ratingAvg: Math.round(ratingAvg * 10) / 10,
      ratingCount,
    });

    return { ratingAvg: Math.round(ratingAvg * 10) / 10, ratingCount };
  }
}
