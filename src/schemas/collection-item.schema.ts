import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Types } from 'mongoose';

export type CollectionItemDocument = HydratedDocument<CollectionItem>;

@Schema({ timestamps: true })
export class CollectionItem extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Collection', required: true })
  collectionId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Post', required: true })
  postId: Types.ObjectId;

  @Prop({ default: Date.now })
  savedAt: Date;
}

export const CollectionItemSchema =
  SchemaFactory.createForClass(CollectionItem);

CollectionItemSchema.index({ collectionId: 1, postId: 1 }, { unique: true });
CollectionItemSchema.index({ collectionId: 1 });
