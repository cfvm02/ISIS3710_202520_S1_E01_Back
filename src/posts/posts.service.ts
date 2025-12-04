import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Post, PostDocument } from '../schemas/post.schema';
import { PostLike, PostLikeDocument } from '../schemas/post-like.schema';
import { User, UserDocument } from '../schemas/user.schema';
import { Follow, FollowDocument } from '../schemas/follow.schema';
import {
  CollectionItem,
  CollectionItemDocument,
} from '../schemas/collection-item.schema';
import { Rating, RatingDocument } from '../schemas/rating.schema';
import { CreatePostDto, UpdatePostDto } from './dto/create-post.dto';
import { PaginatedResponseDto } from '../common/dto/pagination.dto';
import { PaginatedPostsResponseDto } from './dto/paginated-posts-response.dto';
import { FileUrlService } from '../common/services/file-url.service';

@Injectable()
export class PostsService {
  constructor(
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
    @InjectModel(PostLike.name) private postLikeModel: Model<PostLikeDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Follow.name) private followModel: Model<FollowDocument>,
    @InjectModel(CollectionItem.name)
    private collectionItemModel: Model<CollectionItemDocument>,
    @InjectModel(Rating.name) private ratingModel: Model<RatingDocument>,
    private readonly fileUrlService: FileUrlService,
  ) {}

  async create(userId: string, createPostDto: CreatePostDto): Promise<any> {
    const post = await this.postModel.create({
      ...createPostDto,
      userId: new Types.ObjectId(userId),
    });

    await this.userModel.findByIdAndUpdate(userId, {
      $inc: { postsCount: 1 },
    });

    const populated = await this.populatePost(post);
    return this.normalizePostMedia(populated);
  }

  async findAll(
    page: number = 1,
    limit: number = 20,
    filter?: string,
    userId?: string,
    sort: string = 'recent',
    section?: string,
    occasion?: string,
    style?: string,
    tags?: string,
    status: string = 'published',
    currentUserId?: string,
  ): Promise<PaginatedPostsResponseDto> {
    const skip = (page - 1) * limit;
    const query: any = { status };

    if (filter === 'following' && currentUserId) {
      const following = await this.followModel
        .find({ followerId: currentUserId })
        .select('followeeId')
        .lean();
      const followingIds = following.map((f) => f.followeeId);
      query.userId = { $in: followingIds };
    }

    if (userId) {
      query.userId = new Types.ObjectId(userId);
    }

    if (occasion) {
      query.occasion = occasion;
    }

    if (style) {
      query.style = style;
    }

    if (tags) {
      const tagsArray = tags.split(',').map((tag) => tag.trim());
      query.tags = { $in: tagsArray };
    }

    let sortOption: any = { createdAt: -1 };
    if (sort === 'popular') {
      sortOption = { likesCount: -1, createdAt: -1 };
    }

    const [posts, total] = await Promise.all([
      this.postModel
        .find(query)
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .populate('userId', 'username avatar firstName lastName isVerified')
        .lean(),
      this.postModel.countDocuments(query),
    ]);

    const postsWithDetails = await this.addUserInteractions(
      posts,
      currentUserId,
    );

    const normalizedPosts = postsWithDetails.map((post) =>
      this.normalizePostMedia(post),
    );

    const paginatedResponse = new PaginatedResponseDto(
      normalizedPosts,
      page,
      limit,
      total,
    );

    return new PaginatedPostsResponseDto(paginatedResponse);
  }

  async findOne(postId: string, currentUserId?: string): Promise<any> {
    const post = await this.postModel
      .findById(postId)
      .populate('userId', 'username avatar firstName lastName isVerified')
      .lean();

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    await this.postModel.findByIdAndUpdate(postId, {
      $inc: { viewsCount: 1 },
    });

    let isSaved = false;
    let isLiked = false;
    let userRating = null;

    if (currentUserId) {
      const [savedItem, like, rating] = await Promise.all([
        this.collectionItemModel.findOne({
          postId: new Types.ObjectId(postId),
        }),
        this.postLikeModel.findOne({
          postId: new Types.ObjectId(postId),
          userId: new Types.ObjectId(currentUserId),
        }),
        this.ratingModel.findOne({
          postId: new Types.ObjectId(postId),
          userId: new Types.ObjectId(currentUserId),
        }),
      ]);

      isSaved = !!savedItem;
      isLiked = !!like;
      userRating = rating ? rating.score : (null as any);
    }

    return this.normalizePostMedia({
      ...post,
      isSaved,
      isLiked,
      userRating,
    });
  }

  async update(
    postId: string,
    userId: string,
    updatePostDto: UpdatePostDto,
  ): Promise<any> {
    const post = await this.postModel.findById(postId);

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.userId.toString() !== userId) {
      throw new ForbiddenException('You can only update your own posts');
    }

    const updatedPost = await this.postModel
      .findByIdAndUpdate(postId, { $set: updatePostDto }, { new: true })
      .populate('userId', 'username avatar firstName lastName isVerified')
      .lean();

    return this.normalizePostMedia(updatedPost);
  }

  async remove(postId: string, userId: string): Promise<{ deleted: boolean }> {
    const post = await this.postModel.findById(postId);

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.userId.toString() !== userId) {
      throw new ForbiddenException('You can only delete your own posts');
    }

    await this.postModel.findByIdAndDelete(postId);

    await this.userModel.findByIdAndUpdate(userId, {
      $inc: { postsCount: -1 },
    });

    await Promise.all([
      this.postLikeModel.deleteMany({ postId }),
      this.collectionItemModel.deleteMany({ postId }),
      this.ratingModel.deleteMany({ postId }),
    ]);

    return { deleted: true };
  }

  async likePost(
    postId: string,
    userId: string,
  ): Promise<{ liked: boolean; likesCount: number }> {
    const post = await this.postModel.findById(postId);

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const existingLike = await this.postLikeModel.findOne({
      postId: new Types.ObjectId(postId),
      userId: new Types.ObjectId(userId),
    });

    if (existingLike) {
      throw new BadRequestException('Post already liked');
    }

    await this.postLikeModel.create({
      postId: new Types.ObjectId(postId),
      userId: new Types.ObjectId(userId),
    });

    const updatedPost = await this.postModel.findByIdAndUpdate(
      postId,
      { $inc: { likesCount: 1 } },
      { new: true },
    );

    return {
      liked: true,
      likesCount: updatedPost?.likesCount || 0,
    };
  }

  async unlikePost(
    postId: string,
    userId: string,
  ): Promise<{ liked: boolean; likesCount: number }> {
    const like = await this.postLikeModel.findOneAndDelete({
      postId: new Types.ObjectId(postId),
      userId: new Types.ObjectId(userId),
    });

    if (!like) {
      throw new NotFoundException('Post not liked');
    }

    const updatedPost = await this.postModel.findByIdAndUpdate(
      postId,
      { $inc: { likesCount: -1 } },
      { new: true },
    );

    return {
      liked: false,
      likesCount: updatedPost?.likesCount || 0,
    };
  }

  async searchPosts(
    q?: string,
    occasion?: string,
    style?: string,
    tags?: string,
  ): Promise<any[]> {
    const query: any = { status: 'published' };

    if (q) {
      query.$text = { $search: q };
    }

    if (occasion) {
      query.occasion = occasion;
    }

    if (style) {
      query.style = style;
    }

    if (tags) {
      const tagsArray = tags.split(',').map((tag) => tag.trim());
      query.tags = { $in: tagsArray };
    }

    const posts = await this.postModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('userId', 'username avatar firstName lastName isVerified')
      .lean();

    return posts.map((post) => this.normalizePostMedia(post));
  }

  private normalizePostMedia(post: any): any {
    if (!post) {
      return post;
    }

    const normalize = (url?: string | null) => {
      const publicUrl = this.fileUrlService.toPublicUrl(url);
      if (publicUrl === null || publicUrl === undefined) {
        return url ?? null;
      }
      return publicUrl;
    };

    const clothItems = Array.isArray(post.clothItems)
      ? post.clothItems.map((item: any) => ({
          ...item,
          imageUrl: normalize(item?.imageUrl),
        }))
      : post.clothItems;

    const id =
      typeof post._id === 'object' && post._id && 'toString' in post._id
        ? (post._id as any).toString()
        : typeof post._id === 'string'
          ? post._id
          : post.id;

    return {
      ...post,
      _id: id || post._id || post.id,
      id,
      imageUrl: normalize(post.imageUrl),
      clothItems,
    };
  }

  private async populatePost(post: PostDocument): Promise<any> {
    return this.postModel
      .findById(post._id)
      .populate('userId', 'username avatar firstName lastName isVerified')
      .lean();
  }

  private async addUserInteractions(
    posts: any[],
    userId?: string,
  ): Promise<any[]> {
    if (!userId) {
      return posts;
    }

    const postIds = posts.map((p) => p._id);

    const [likes, savedItems, ratings] = await Promise.all([
      this.postLikeModel
        .find({
          postId: { $in: postIds },
          userId: new Types.ObjectId(userId),
        })
        .lean(),
      this.collectionItemModel
        .find({
          postId: { $in: postIds },
        })
        .lean(),
      this.ratingModel
        .find({
          postId: { $in: postIds },
          userId: new Types.ObjectId(userId),
        })
        .lean(),
    ]);

    const likedPostIds = new Set(likes.map((l) => l.postId.toString()));
    const savedPostIds = new Set(savedItems.map((s) => s.postId.toString()));
    const ratingMap = new Map(
      ratings.map((r) => [r.postId.toString(), r.score]),
    );

    return posts.map((post) => ({
      ...post,
      isLiked: likedPostIds.has(post._id.toString()),
      isSaved: savedPostIds.has(post._id.toString()),
      userRating: ratingMap.get(post._id.toString()) || null,
    }));
  }
}
