import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { Post, PostSchema } from '../schemas/post.schema';
import { PostLike, PostLikeSchema } from '../schemas/post-like.schema';
import { User, UserSchema } from '../schemas/user.schema';
import { Follow, FollowSchema } from '../schemas/follow.schema';
import {
  CollectionItem,
  CollectionItemSchema,
} from '../schemas/collection-item.schema';
import { Rating, RatingSchema } from '../schemas/rating.schema';
import { FileUrlService } from '../common/services/file-url.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Post.name, schema: PostSchema },
      { name: PostLike.name, schema: PostLikeSchema },
      { name: User.name, schema: UserSchema },
      { name: Follow.name, schema: FollowSchema },
      { name: CollectionItem.name, schema: CollectionItemSchema },
      { name: Rating.name, schema: RatingSchema },
    ]),
  ],
  controllers: [PostsController],
  providers: [PostsService, FileUrlService],
  exports: [PostsService],
})
export class PostsModule {}
