import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Post, PostDocument } from '../schemas/post.schema';
import { User, UserDocument } from '../schemas/user.schema';
import {
  BlockedUser,
  BlockedUserDocument,
} from '../schemas/blocked-user.schema';

@Injectable()
export class SearchService {
  constructor(
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(BlockedUser.name)
    private blockedUserModel: Model<BlockedUserDocument>,
  ) {}

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

    return posts;
  }

  async searchUsers(
    q?: string,
    style?: string,
    currentUserId?: string,
  ): Promise<any[]> {
    const searchQuery: any = {};

    if (q) {
      searchQuery.$or = [
        { username: { $regex: q, $options: 'i' } },
        { firstName: { $regex: q, $options: 'i' } },
        { lastName: { $regex: q, $options: 'i' } },
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

  async getSuggestions(q: string): Promise<any> {
    const [users, tags] = await Promise.all([
      this.userModel
        .find({ username: { $regex: `^${q}`, $options: 'i' } })
        .select('username avatar')
        .limit(5)
        .lean(),
      this.postModel.aggregate([
        { $match: { status: 'published' } },
        { $unwind: '$tags' },
        { $match: { tags: { $regex: `^${q}`, $options: 'i' } } },
        { $group: { _id: '$tags', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
    ]);

    return {
      users,
      tags: tags.map((t) => t._id),
    };
  }
}
