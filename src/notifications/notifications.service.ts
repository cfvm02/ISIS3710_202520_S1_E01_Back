import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Notification,
  NotificationDocument,
} from '../schemas/notification.schema';
import { PaginatedResponseDto } from '../common/dto/pagination.dto';
import { FileUrlService } from '../common/services/file-url.service';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<NotificationDocument>,
    private readonly fileUrlService: FileUrlService,
  ) {}

  async findAll(
    userId: string,
    unread?: boolean,
    page: number = 1,
    limit: number = 50,
  ): Promise<any> {
    const skip = (page - 1) * limit;
    const query: any = { recipientId: new Types.ObjectId(userId) };

    if (unread !== undefined) {
      query.isRead = !unread;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      this.notificationModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('senderId', 'username avatar firstName lastName')
        .populate('postId', 'imageUrl description')
        .lean(),
      this.notificationModel.countDocuments(query),
      this.notificationModel.countDocuments({
        recipientId: new Types.ObjectId(userId),
        isRead: false,
      }),
    ]);

    const normalizedNotifications = notifications.map((notification) => {
      const post: any = notification.postId as any;
      if (post && typeof post === 'object' && 'imageUrl' in post) {
        const normalizedImageUrl =
          this.fileUrlService.toPublicUrl(post.imageUrl) || post.imageUrl;

        return {
          ...notification,
          postId: {
            ...post,
            imageUrl: normalizedImageUrl,
          },
        };
      }
      return notification;
    });

    const paginatedData = new PaginatedResponseDto(
      normalizedNotifications,
      page,
      limit,
      total,
    );

    return {
      ...paginatedData,
      unreadCount,
    };
  }

  async markAsRead(
    notificationId: string,
    userId: string,
  ): Promise<{ read: boolean }> {
    const notification = await this.notificationModel.findOne({
      _id: notificationId,
      recipientId: new Types.ObjectId(userId),
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    notification.isRead = true;
    await notification.save();

    return { read: true };
  }

  async markAllAsRead(userId: string): Promise<{ updated: number }> {
    const result = await this.notificationModel.updateMany(
      { recipientId: new Types.ObjectId(userId), isRead: false },
      { $set: { isRead: true } },
    );

    return { updated: result.modifiedCount };
  }

  async remove(
    notificationId: string,
    userId: string,
  ): Promise<{ deleted: boolean }> {
    const notification = await this.notificationModel.findOneAndDelete({
      _id: notificationId,
      recipientId: new Types.ObjectId(userId),
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return { deleted: true };
  }

  async createNotification(
    recipientId: string,
    senderId: string,
    type: string,
    message: string,
    postId?: string,
    commentId?: string,
    ratingId?: string,
  ): Promise<void> {
    if (recipientId === senderId) {
      return;
    }

    await this.notificationModel.create({
      recipientId: new Types.ObjectId(recipientId),
      senderId: new Types.ObjectId(senderId),
      type,
      message,
      postId: postId ? new Types.ObjectId(postId) : null,
      commentId: commentId ? new Types.ObjectId(commentId) : null,
      ratingId: ratingId ? new Types.ObjectId(ratingId) : null,
    });
  }
}
