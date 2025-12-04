import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Comment, CommentDocument } from '../schemas/comment.schema';
import { Post, PostDocument } from '../schemas/post.schema';
import { CreateCommentDto } from './dto/create-comment.dto';
import { PaginatedResponseDto } from '../common/dto/pagination.dto';

@Injectable()
export class CommentsService {
  constructor(
    @InjectModel(Comment.name) private commentModel: Model<CommentDocument>,
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
  ) {}

  async create(
    postId: string,
    userId: string,
    createCommentDto: CreateCommentDto,
  ): Promise<any> {
    const post = await this.postModel.findById(postId);
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (createCommentDto.parentCommentId) {
      const parentComment = await this.commentModel.findById(
        createCommentDto.parentCommentId,
      );
      if (!parentComment) {
        throw new NotFoundException('Parent comment not found');
      }

      if (parentComment.parentCommentId) {
        throw new BadRequestException('Only one level of nesting is allowed');
      }

      if (parentComment.postId.toString() !== postId) {
        throw new BadRequestException(
          'Parent comment does not belong to this post',
        );
      }
    }

    const comment = await this.commentModel.create({
      ...createCommentDto,
      postId: new Types.ObjectId(postId),
      userId: new Types.ObjectId(userId),
    });

    await this.postModel.findByIdAndUpdate(postId, {
      $inc: { commentsCount: 1 },
    });

    return this.commentModel
      .findById(comment._id)
      .populate('userId', 'username avatar firstName lastName')
      .lean();
  }

  async findAll(
    postId: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<PaginatedResponseDto<any>> {
    const skip = (page - 1) * limit;

    const [comments, total] = await Promise.all([
      this.commentModel
        .find({ postId: new Types.ObjectId(postId), parentCommentId: null })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'username avatar firstName lastName')
        .lean(),
      this.commentModel.countDocuments({
        postId: new Types.ObjectId(postId),
        parentCommentId: null,
      }),
    ]);

    const commentsWithReplies = await Promise.all(
      comments.map(async (comment) => {
        const replies = await this.commentModel
          .find({ parentCommentId: comment._id })
          .sort({ createdAt: 1 })
          .populate('userId', 'username avatar firstName lastName')
          .lean();

        return {
          ...comment,
          replies,
        };
      }),
    );

    return new PaginatedResponseDto(commentsWithReplies, page, limit, total);
  }

  async remove(
    commentId: string,
    userId: string,
    postId: string,
  ): Promise<{ deleted: boolean }> {
    const comment = await this.commentModel.findById(commentId);

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId.toString() !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    const repliesToDelete = await this.commentModel.find({
      parentCommentId: commentId,
    });
    const totalToDelete = 1 + repliesToDelete.length;

    await this.commentModel.deleteMany({
      $or: [{ _id: commentId }, { parentCommentId: commentId }],
    });

    await this.postModel.findByIdAndUpdate(postId, {
      $inc: { commentsCount: -totalToDelete },
    });

    return { deleted: true };
  }
}
