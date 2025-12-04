import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';
import * as bcrypt from 'bcrypt';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true, unique: true, trim: true })
  username: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true, select: false })
  passwordHash: string;

  @Prop({ default: null })
  avatar: string;

  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ default: null })
  bio: string;

  @Prop({ default: null })
  location: string;

  @Prop({
    enum: ['Street', 'Minimalist', 'Formal', 'Boho', 'Vintage', 'Casual'],
    default: 'Casual',
  })
  style: string;

  @Prop({ enum: ['en', 'es'], default: 'en' })
  language: string;

  @Prop({ default: 0 })
  followersCount: number;

  @Prop({ default: 0 })
  followingCount: number;

  @Prop({ default: 0 })
  postsCount: number;

  @Prop({ default: false })
  isPrivate: boolean;

  @Prop({ default: false })
  isVerified: boolean;

  @Prop({ default: null })
  lastLoginAt: Date;

  @Prop({ default: null, select: false })
  refreshToken: string;

  async comparePassword(candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.passwordHash);
  }
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ username: 1 });
UserSchema.index({ email: 1 });
UserSchema.index({ style: 1 });

UserSchema.methods.comparePassword = async function (
  candidatePassword: string,
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};
