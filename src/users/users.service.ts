import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import { Follow, FollowDocument } from '../schemas/follow.schema';
import {
  BlockedUser,
  BlockedUserDocument,
} from '../schemas/blocked-user.schema';
import { Post, PostDocument } from '../schemas/post.schema';
import { PaginatedResponseDto } from '../common/dto/pagination.dto';
import { UserProfileResponseDto } from './dto/user-profile-response.dto';
import { FollowResponseDto, BlockResponseDto } from './dto/follow-response.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Follow.name) private followModel: Model<FollowDocument>,
    @InjectModel(BlockedUser.name)
    private blockedUserModel: Model<BlockedUserDocument>,
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
  ) {}

  async getUserProfile(
    userId: string,
    currentUserId?: string,
  ): Promise<UserProfileResponseDto> {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    let isFollowing = false;
    let isBlocked = false;

    if (currentUserId && currentUserId !== userId) {
      const follow = await this.followModel.findOne({
        followerId: currentUserId,
        followeeId: userId,
      });
      isFollowing = !!follow;

      const blocked = await this.blockedUserModel.findOne({
        $or: [
          { blockerId: currentUserId, blockedId: userId },
          { blockerId: userId, blockedId: currentUserId },
        ],
      });
      isBlocked = !!blocked;
    }

    return {
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
        bio: user.bio,
        location: user.location,
        style: user.style,
        isVerified: user.isVerified,
        createdAt: (user as any).createdAt,
      },
      postsCount: user.postsCount,
      followersCount: user.followersCount,
      followingCount: user.followingCount,
      isFollowing: currentUserId ? isFollowing : undefined,
      isBlocked: currentUserId ? isBlocked : undefined,
    };
  }

  async getUserPosts(
    userId: string,
    page: number = 1,
    limit: number = 20,
    status: string = 'published',
  ): Promise<any> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const skip = (page - 1) * limit;
    const query: any = { userId: new Types.ObjectId(userId), status };

    const [posts, total] = await Promise.all([
      this.postModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'username avatar firstName lastName')
        .lean(),
      this.postModel.countDocuments(query),
    ]);

    return {
      posts,
      total,
    };
  }

  async getFollowers(
    userId: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<PaginatedResponseDto<any>> {
    const skip = (page - 1) * limit;

    const [follows, total] = await Promise.all([
      this.followModel
        .find({ followeeId: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate(
          'followerId',
          'username avatar firstName lastName bio style followersCount',
        )
        .lean(),
      this.followModel.countDocuments({ followeeId: userId }),
    ]);

    const users = follows.map((f: any) => f.followerId);

    return new PaginatedResponseDto(users, page, limit, total);
  }

  async getFollowing(
    userId: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<PaginatedResponseDto<any>> {
    const skip = (page - 1) * limit;

    const [follows, total] = await Promise.all([
      this.followModel
        .find({ followerId: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate(
          'followeeId',
          'username avatar firstName lastName bio style followersCount',
        )
        .lean(),
      this.followModel.countDocuments({ followerId: userId }),
    ]);

    const users = follows.map((f: any) => f.followeeId);

    return new PaginatedResponseDto(users, page, limit, total);
  }

  async followUser(
    currentUserId: string,
    userIdToFollow: string,
  ): Promise<FollowResponseDto> {
    if (currentUserId === userIdToFollow) {
      throw new BadRequestException('You cannot follow yourself');
    }

    const userToFollow = await this.userModel.findById(userIdToFollow);
    if (!userToFollow) {
      throw new NotFoundException('User not found');
    }

    const isBlocked = await this.blockedUserModel.findOne({
      $or: [
        { blockerId: currentUserId, blockedId: userIdToFollow },
        { blockerId: userIdToFollow, blockedId: currentUserId },
      ],
    });

    if (isBlocked) {
      throw new BadRequestException('Cannot follow this user');
    }

    const existingFollow = await this.followModel.findOne({
      followerId: currentUserId,
      followeeId: userIdToFollow,
    });

    if (existingFollow) {
      throw new ConflictException('Already following this user');
    }

    await this.followModel.create({
      followerId: currentUserId,
      followeeId: userIdToFollow,
    });

    await this.userModel.findByIdAndUpdate(currentUserId, {
      $inc: { followingCount: 1 },
    });

    const updatedUser = await this.userModel.findByIdAndUpdate(
      userIdToFollow,
      { $inc: { followersCount: 1 } },
      { new: true },
    );

    return {
      isFollowing: true,
      followersCount: updatedUser?.followersCount || 0,
    };
  }

  async unfollowUser(
    currentUserId: string,
    userIdToUnfollow: string,
  ): Promise<FollowResponseDto> {
    const follow = await this.followModel.findOneAndDelete({
      followerId: currentUserId,
      followeeId: userIdToUnfollow,
    });

    if (!follow) {
      throw new NotFoundException('Not following this user');
    }

    await this.userModel.findByIdAndUpdate(currentUserId, {
      $inc: { followingCount: -1 },
    });

    const updatedUser = await this.userModel.findByIdAndUpdate(
      userIdToUnfollow,
      { $inc: { followersCount: -1 } },
      { new: true },
    );

    return {
      isFollowing: false,
      followersCount: updatedUser?.followersCount || 0,
    };
  }

  async blockUser(
    currentUserId: string,
    userIdToBlock: string,
  ): Promise<BlockResponseDto> {
    if (currentUserId === userIdToBlock) {
      throw new BadRequestException('You cannot block yourself');
    }

    const userToBlock = await this.userModel.findById(userIdToBlock);
    if (!userToBlock) {
      throw new NotFoundException('User not found');
    }

    const existingBlock = await this.blockedUserModel.findOne({
      blockerId: currentUserId,
      blockedId: userIdToBlock,
    });

    if (existingBlock) {
      throw new ConflictException('User already blocked');
    }

    await this.blockedUserModel.create({
      blockerId: currentUserId,
      blockedId: userIdToBlock,
    });

    await this.followModel.deleteMany({
      $or: [
        { followerId: currentUserId, followeeId: userIdToBlock },
        { followerId: userIdToBlock, followeeId: currentUserId },
      ],
    });

    return { blocked: true };
  }

  async unblockUser(
    currentUserId: string,
    userIdToUnblock: string,
  ): Promise<BlockResponseDto> {
    const block = await this.blockedUserModel.findOneAndDelete({
      blockerId: currentUserId,
      blockedId: userIdToUnblock,
    });

    if (!block) {
      throw new NotFoundException('User not blocked');
    }

    return { blocked: false };
  }

  async searchUsers(
    query: string,
    style?: string,
    currentUserId?: string,
  ): Promise<any[]> {
    const searchQuery: any = {};

    if (query) {
      searchQuery.$or = [
        { username: { $regex: query, $options: 'i' } },
        { firstName: { $regex: query, $options: 'i' } },
        { lastName: { $regex: query, $options: 'i' } },
      ];
    }

    if (style) {
      searchQuery.style = style;
    }

    if (currentUserId) {
      const blockedUsers = await this.blockedUserModel.find({
        $or: [{ blockerId: currentUserId }, { blockedId: currentUserId }],
      });

      const blockedIds = blockedUsers.map((b) =>
        b.blockerId.toString() === currentUserId
          ? b.blockedId.toString()
          : b.blockerId.toString(),
      );

      if (blockedIds.length > 0) {
        searchQuery._id = { $nin: blockedIds };
      }
    }

    const users = await this.userModel
      .find(searchQuery)
      .select('username avatar firstName lastName bio style followersCount')
      .limit(50)
      .lean();

    return users;
  }
}
