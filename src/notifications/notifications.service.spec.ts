import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { FileUrlService } from '../common/services/file-url.service';

// Mock Notification Model
const notificationModelMock = {
  find: jest.fn(),
  countDocuments: jest.fn(),
  findOne: jest.fn(),
  findOneAndDelete: jest.fn(),
  updateMany: jest.fn(),
  create: jest.fn(),
};

// Mock FileUrlService
const fileUrlServiceMock = {
  toPublicUrl: jest.fn(),
};

describe('NotificationsService', () => {
  let service: NotificationsService;

  // IDs válidos
  const USER_ID = new Types.ObjectId().toHexString();
  const OTHER_ID = new Types.ObjectId().toHexString();
  const NOTIF_ID = new Types.ObjectId().toHexString();
  const POST_ID = new Types.ObjectId().toHexString();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: getModelToken('Notification'),
          useValue: notificationModelMock,
        },
        { provide: FileUrlService, useValue: fileUrlServiceMock },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);

    jest.clearAllMocks();
  });

  // Test encontrar todas las notificaciones
  it('should return all notifications with normalized image URLs', async () => {
    const mockNotifications = [
      {
        _id: NOTIF_ID,
        postId: { imageUrl: 'image.jpg', description: 'desc' },
      },
    ];

    notificationModelMock.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              populate: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue(mockNotifications),
              }),
            }),
          }),
        }),
      }),
    });

    notificationModelMock.countDocuments.mockResolvedValueOnce(1);
    notificationModelMock.countDocuments.mockResolvedValueOnce(0);

    fileUrlServiceMock.toPublicUrl.mockReturnValue('https://cdn/image.jpg');

    const result = (await service.findAll(
      USER_ID,
      false,
      1,
      10,
    )) as unknown as {
      data: Array<{ postId: { imageUrl: string } }>;
      unreadCount: number;
    };

    expect(result.data.length).toBe(1);
    expect(result.data[0].postId.imageUrl).toBe('https://cdn/image.jpg');
    expect(result.unreadCount).toBe(0);
  });

  // Test marcar una notificación como leída
  it('should mark notification as read', async () => {
    const mockNotification = {
      _id: NOTIF_ID,
      isRead: false,
      save: jest.fn().mockResolvedValue(true),
    };

    notificationModelMock.findOne.mockResolvedValue(mockNotification);

    const result = await service.markAsRead(NOTIF_ID, USER_ID);

    expect(mockNotification.isRead).toBe(true);
    expect(mockNotification.save).toHaveBeenCalled();
    expect(result.read).toBe(true);
  });

  // Test error al marcar como leída si no existe
  it('should throw NotFoundException if notification not found when marking read', async () => {
    notificationModelMock.findOne.mockResolvedValue(null);

    await expect(service.markAsRead(NOTIF_ID, USER_ID)).rejects.toThrow(
      NotFoundException,
    );
  });

  // Test marcar todas como leídas
  it('should mark all notifications as read', async () => {
    notificationModelMock.updateMany.mockResolvedValue({ modifiedCount: 3 });

    const result = await service.markAllAsRead(USER_ID);

    expect(result.updated).toBe(3);
  });

  // Test eliminar una notificación
  it('should delete a notification', async () => {
    const mockNotification = { _id: NOTIF_ID };

    notificationModelMock.findOneAndDelete.mockResolvedValue(mockNotification);

    const result = await service.remove(NOTIF_ID, USER_ID);

    expect(result.deleted).toBe(true);
  });

  // Test error al eliminar si no existe
  it('should throw NotFoundException when deleting nonexistent notification', async () => {
    notificationModelMock.findOneAndDelete.mockResolvedValue(null);

    await expect(service.remove(NOTIF_ID, USER_ID)).rejects.toThrow(
      NotFoundException,
    );
  });

  // Test crear notificación
  it('should create a notification', async () => {
    notificationModelMock.create.mockResolvedValue({});

    await service.createNotification(
      USER_ID,
      OTHER_ID,
      'like',
      'message',
      POST_ID,
    );

    expect(notificationModelMock.create).toHaveBeenCalled();
  });

  // Test NO crear notificación cuando senderId === recipientId
  it('should NOT create notification when sender equals recipient', async () => {
    await service.createNotification(USER_ID, USER_ID, 'like', 'msg');

    expect(notificationModelMock.create).not.toHaveBeenCalled();
  });
});
