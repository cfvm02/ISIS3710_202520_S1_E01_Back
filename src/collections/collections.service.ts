import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Collection, CollectionDocument } from '../schemas/collection.schema';
import {
  CollectionItem,
  CollectionItemDocument,
} from '../schemas/collection-item.schema';
import { Post, PostDocument } from '../schemas/post.schema';
import { CreateCollectionDto, UpdateCollectionDto } from './dto/collection.dto';

@Injectable()
export class CollectionsService {
  constructor(
    @InjectModel(Collection.name)
    private collectionModel: Model<CollectionDocument>,
    @InjectModel(CollectionItem.name)
    private collectionItemModel: Model<CollectionItemDocument>,
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
  ) {}

  async create(
    userId: string,
    createCollectionDto: CreateCollectionDto,
  ): Promise<any> {
    const collection = await this.collectionModel.create({
      ...createCollectionDto,
      userId: new Types.ObjectId(userId),
    });

    return collection;
  }

  async findAll(userId: string): Promise<any[]> {
    console.log('🔍 [DEBUG] findAll called with userId:', userId, 'type:', typeof userId);

    const query = { userId: new Types.ObjectId(userId) };
    console.log('🔍 [DEBUG] Query object:', query);

    const collections = await this.collectionModel
      .find(query)
      .sort({ createdAt: -1 })
      .lean();

    console.log('🔍 [DEBUG] Found collections count:', collections.length);

    const collectionsWithCount = await Promise.all(
      collections.map(async (collection) => {
        const itemsCount = await this.collectionItemModel.countDocuments({
          collectionId: collection._id,
        });

        console.log(`🔍 [DEBUG] Collection "${collection.title}" (${collection._id}): itemsCount = ${itemsCount}`);

        return {
          ...collection,
          itemsCount,
        };
      }),
    );

    console.log('🔍 [DEBUG] Returning collections with counts:', collectionsWithCount.length);
    console.log('🔍 [DEBUG] Sample collection with count:', collectionsWithCount[0]);
    return collectionsWithCount;
  }

  async findOne(collectionId: string, userId?: string): Promise<any> {
    console.log('🔍 findOne called:');
    console.log('  collectionId:', collectionId);
    console.log('  userId (from JWT):', userId, 'type:', typeof userId);

    const collection = await this.collectionModel.findById(collectionId).lean();

    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    console.log('  collection.userId:', collection.userId, 'type:', typeof collection.userId);
    console.log('  collection.isPublic:', collection.isPublic);
    console.log('  collection.userId.toString():', collection.userId.toString());
    console.log('  Comparison:', collection.userId.toString(), '===', userId, '?', collection.userId.toString() === userId);

    if (
      !collection.isPublic &&
      (!userId || collection.userId.toString() !== userId)
    ) {
      console.log('❌ FORBIDDEN - Reason:', !userId ? 'No userId' : 'userId mismatch');
      throw new ForbiddenException('This collection is private');
    }

    console.log('✅ Access granted');

    const items = await this.collectionItemModel
      .find({ collectionId: new Types.ObjectId(collectionId) })
      .sort({ savedAt: -1 })
      .populate({
        path: 'postId',
        populate: {
          path: 'userId',
          select: 'username avatar firstName lastName',
        },
      })
      .lean();

    const posts = items.map((item: any) => item.postId);

    return {
      ...collection,
      items: posts,
      itemsCount: items.length,
    };
  }

  async update(
    collectionId: string,
    userId: string,
    updateCollectionDto: UpdateCollectionDto,
  ): Promise<any> {
    const collection = await this.collectionModel.findById(collectionId);

    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    if (collection.userId.toString() !== userId) {
      throw new ForbiddenException('You can only update your own collections');
    }

    const updatedCollection = await this.collectionModel
      .findByIdAndUpdate(
        collectionId,
        { $set: updateCollectionDto },
        { new: true },
      )
      .lean();

    return updatedCollection;
  }

  async remove(
    collectionId: string,
    userId: string,
  ): Promise<{ deleted: boolean }> {
    const collection = await this.collectionModel.findById(collectionId);

    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    if (collection.userId.toString() !== userId) {
      throw new ForbiddenException('You can only delete your own collections');
    }

    await this.collectionModel.findByIdAndDelete(collectionId);
    await this.collectionItemModel.deleteMany({ collectionId });

    return { deleted: true };
  }

  async addPost(
    collectionId: string,
    userId: string,
    postId: string,
  ): Promise<any> {
    console.log('🔍 addPost called:');
    console.log('  collectionId:', collectionId);
    console.log('  userId (from JWT):', userId, 'type:', typeof userId);

    const collection = await this.collectionModel.findById(collectionId);

    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    console.log('  collection.userId:', collection.userId, 'type:', typeof collection.userId);
    console.log('  collection.userId.toString():', collection.userId.toString());
    console.log('  Comparison:', collection.userId.toString(), '===', userId, '?', collection.userId.toString() === userId);

    if (collection.userId.toString() !== userId) {
      console.log('❌ FORBIDDEN: userId mismatch');
      throw new ForbiddenException(
        'You can only add posts to your own collections',
      );
    }

    console.log('✅ userId matches, proceeding...');

    const post = await this.postModel.findById(postId);
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const existingItem = await this.collectionItemModel.findOne({
      collectionId: new Types.ObjectId(collectionId),
      postId: new Types.ObjectId(postId),
    });

    if (existingItem) {
      throw new ConflictException('Post already in collection');
    }

    await this.collectionItemModel.create({
      collectionId: new Types.ObjectId(collectionId),
      postId: new Types.ObjectId(postId),
    });

    await this.postModel.findByIdAndUpdate(postId, {
      $inc: { savedCount: 1 },
    });

    const itemsCount = await this.collectionItemModel.countDocuments({
      collectionId,
    });

    return {
      saved: true,
      itemsCount,
    };
  }

  async removePost(
    collectionId: string,
    userId: string,
    postId: string,
  ): Promise<any> {
    const collection = await this.collectionModel.findById(collectionId);

    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    if (collection.userId.toString() !== userId) {
      throw new ForbiddenException(
        'You can only remove posts from your own collections',
      );
    }

    const item = await this.collectionItemModel.findOneAndDelete({
      collectionId: new Types.ObjectId(collectionId),
      postId: new Types.ObjectId(postId),
    });

    if (!item) {
      throw new NotFoundException('Post not in collection');
    }

    await this.postModel.findByIdAndUpdate(postId, {
      $inc: { savedCount: -1 },
    });

    const itemsCount = await this.collectionItemModel.countDocuments({
      collectionId,
    });

    return {
      removed: true,
      itemsCount,
    };
  }
}
