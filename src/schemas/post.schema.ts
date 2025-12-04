import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Types } from 'mongoose';

export type PostDocument = HydratedDocument<Post>;

class ClothItem {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  shop: string;

  @Prop()
  imageUrl: string;

  @Prop()
  category: string;

  @Prop()
  price: number;
}

@Schema({ timestamps: true })
export class Post extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  imageUrl: string;

  @Prop({ required: true })
  description: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({
    enum: ['party', 'work', 'casual', 'travel', 'sport', 'night', 'formal'],
  })
  occasion: string;

  @Prop({
    enum: ['Street', 'Minimalist', 'Formal', 'Boho', 'Vintage', 'Casual'],
  })
  style: string;

  @Prop()
  location: string;

  @Prop({ type: [ClothItem], default: [] })
  clothItems: ClothItem[];

  @Prop({ default: 0, min: 0, max: 5 })
  ratingAvg: number;

  @Prop({ default: 0 })
  ratingCount: number;

  @Prop({ default: 0 })
  likesCount: number;

  @Prop({ default: 0 })
  commentsCount: number;

  @Prop({ default: 0 })
  savedCount: number;

  @Prop({ default: 0 })
  viewsCount: number;

  @Prop({ enum: ['published', 'draft'], default: 'published' })
  status: string;

  @Prop({ default: true })
  isPublic: boolean;
}

export const PostSchema = SchemaFactory.createForClass(Post);

PostSchema.index({ userId: 1, createdAt: -1 });
PostSchema.index({ status: 1, createdAt: -1 });
PostSchema.index({ likesCount: -1 });
PostSchema.index({ occasion: 1, style: 1 });
PostSchema.index({ tags: 1 });
PostSchema.index({ description: 'text', tags: 'text' });
