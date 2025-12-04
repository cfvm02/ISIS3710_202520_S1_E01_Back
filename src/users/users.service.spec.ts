import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getModelToken } from '@nestjs/mongoose';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';

// ObjectId válido para todas las pruebas
const validId = '507f1f77bcf86cd799439011';

// ----------------------
// MOCKS COMPLETOS
// ----------------------

const userModelMock = {
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  find: jest.fn(),
};

const followModelMock = {
  findOne: jest.fn(),
  findOneAndDelete: jest.fn(),
  deleteMany: jest.fn(),
  find: jest.fn(),
  countDocuments: jest.fn(),
  create: jest.fn(), // <-- NECESARIO
};

const blockedUserModelMock = {
  findOne: jest.fn(),
  findOneAndDelete: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
};

const postModelMock = {
  find: jest.fn(),
  countDocuments: jest.fn(),
};

// ----------------------
// INICIO DEL TEST
// ----------------------

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getModelToken('User'), useValue: userModelMock },
        { provide: getModelToken('Follow'), useValue: followModelMock },
        { provide: getModelToken('BlockedUser'), useValue: blockedUserModelMock },
        { provide: getModelToken('Post'), useValue: postModelMock },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);

    jest.clearAllMocks();
  });

  // -------------------------------------------------------------
  // getUserProfile
  // -------------------------------------------------------------

  describe('getUserProfile', () => {
    it('should throw NotFoundException if user does not exist', async () => {
      userModelMock.findById.mockResolvedValue(null);

      await expect(service.getUserProfile(validId)).rejects.toThrow(NotFoundException);
    });

    it('should return profile without follow info if no currentUserId', async () => {
      const mockUser = {
        _id: validId,
        username: 'test',
        email: 'mail@mail.com',
        postsCount: 3,
        followersCount: 2,
        followingCount: 1,
      };

      userModelMock.findById.mockResolvedValue(mockUser);

      const result = await service.getUserProfile(validId);

      expect(result.user.id).toBe(validId);
      expect(result.isFollowing).toBeUndefined();
    });

    it('should return profile with follow and block info', async () => {
      const mockUser = { _id: validId, username: 'john' };
      userModelMock.findById.mockResolvedValue(mockUser);

      followModelMock.findOne.mockResolvedValue({});
      blockedUserModelMock.findOne.mockResolvedValue(null);

      const result = await service.getUserProfile(validId, validId);

      expect(result.user.id).toBe(validId);
    });
  });

  // -------------------------------------------------------------
  // getUserPosts
  // -------------------------------------------------------------

  describe('getUserPosts', () => {
    it('should throw NotFoundException if user not found', async () => {
      userModelMock.findById.mockResolvedValue(null);

      await expect(service.getUserPosts(validId)).rejects.toThrow(NotFoundException);
    });

    it('should return posts and total count', async () => {
      userModelMock.findById.mockResolvedValue({ _id: validId });

      postModelMock.find.mockReturnValue({
        sort: () => ({
          skip: () => ({
            limit: () => ({
              populate: () => ({
                lean: () => [{ title: 'Post 1' }],
              }),
            }),
          }),
        }),
      });

      postModelMock.countDocuments.mockResolvedValue(1);

      const result = await service.getUserPosts(validId);

      expect(result.posts.length).toBe(1);
      expect(result.total).toBe(1);
    });
  });

  // -------------------------------------------------------------
  // getFollowers
  // -------------------------------------------------------------

  describe('getFollowers', () => {
    it('should return followers list', async () => {
      followModelMock.find.mockReturnValue({
        sort: () => ({
          skip: () => ({
            limit: () => ({
              populate: () => ({
                lean: () => [
                  { followerId: { username: 'john', avatar: 'img.jpg' } },
                ],
              }),
            }),
          }),
        }),
      });

      followModelMock.countDocuments.mockResolvedValue(1);

      const result = await service.getFollowers(validId);

      expect(result.data.length).toBe(1);
      expect(result.total).toBe(1);
    });
  });

  // -------------------------------------------------------------
  // getFollowing
  // -------------------------------------------------------------

  describe('getFollowing', () => {
    it('should return following users', async () => {
      followModelMock.find.mockReturnValue({
        sort: () => ({
          skip: () => ({
            limit: () => ({
              populate: () => ({
                lean: () => [
                  { followeeId: { username: 'kate', avatar: 'img.jpg' } },
                ],
              }),
            }),
          }),
        }),
      });

      followModelMock.countDocuments.mockResolvedValue(1);

      const result = await service.getFollowing(validId);

      expect(result.data.length).toBe(1);
    });
  });

  // -------------------------------------------------------------
  // followUser
  // -------------------------------------------------------------

  describe('followUser', () => {
    it('should throw BadRequestException if user follows himself', async () => {
      await expect(service.followUser(validId, validId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if target does not exist', async () => {
      userModelMock.findById.mockResolvedValue(null);

      await expect(service.followUser(validId, '507f1f77bcf86cd799439012')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if already following', async () => {
      userModelMock.findById.mockResolvedValue({});
      followModelMock.findOne.mockResolvedValue({}); // already exists

      await expect(service.followUser(validId, '507f1f77bcf86cd799439013')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should follow successfully', async () => {
      userModelMock.findById.mockResolvedValue({ followersCount: 2 });
      followModelMock.findOne.mockResolvedValue(null);
      blockedUserModelMock.findOne.mockResolvedValue(null);

      followModelMock.create.mockResolvedValue({});
      userModelMock.findByIdAndUpdate.mockResolvedValue({ followersCount: 3 });

      const result = await service.followUser(validId, '507f1f77bcf86cd799439014');

      expect(result.isFollowing).toBe(true);
      expect(result.followersCount).toBe(3);
    });
  });

  // -------------------------------------------------------------
  // unfollowUser
  // -------------------------------------------------------------

  describe('unfollowUser', () => {
    it('should throw NotFoundException if not following', async () => {
      followModelMock.findOneAndDelete.mockResolvedValue(null);

      await expect(service.unfollowUser(validId, validId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should unfollow successfully', async () => {
      followModelMock.findOneAndDelete.mockResolvedValue({});
      userModelMock.findByIdAndUpdate.mockResolvedValue({ followersCount: 1 });

      const result = await service.unfollowUser(
        validId,
        '507f1f77bcf86cd799439015',
      );

      expect(result.isFollowing).toBe(false);
    });
  });

  // -------------------------------------------------------------
  // blockUser
  // -------------------------------------------------------------

  describe('blockUser', () => {
    it('should throw BadRequestException if blocking self', async () => {
      await expect(service.blockUser(validId, validId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      userModelMock.findById.mockResolvedValue(null);

      await expect(service.blockUser(validId, '507f1f77bcf86cd799439016')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if already blocked', async () => {
      userModelMock.findById.mockResolvedValue({});
      blockedUserModelMock.findOne.mockResolvedValue({});

      await expect(service.blockUser(validId, '507f1f77bcf86cd799439017')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should block user successfully', async () => {
      userModelMock.findById.mockResolvedValue({});
      blockedUserModelMock.findOne.mockResolvedValue(null);

      blockedUserModelMock.create.mockResolvedValue({});

      const result = await service.blockUser(validId, '507f1f77bcf86cd799439018');

      expect(result.blocked).toBe(true);
    });
  });

  // -------------------------------------------------------------
  // unblockUser
  // -------------------------------------------------------------

  describe('unblockUser', () => {
    it('should throw NotFoundException if no block', async () => {
      blockedUserModelMock.findOneAndDelete.mockResolvedValue(null);

      await expect(service.unblockUser(validId, validId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should unblock successfully', async () => {
      blockedUserModelMock.findOneAndDelete.mockResolvedValue({});

      const result = await service.unblockUser(validId, '507f1f77bcf86cd799439019');

      expect(result.blocked).toBe(false);
    });
  });

  // -------------------------------------------------------------
  // searchUsers
  // -------------------------------------------------------------

  describe('searchUsers', () => {
    it('should return results', async () => {
      userModelMock.find.mockReturnValue({
        select: () => ({
          limit: () => ({
            lean: () => [{ username: 'john' }],
          }),
        }),
      });

      const result = await service.searchUsers('john');

      expect(result.length).toBe(1);
      expect(result[0].username).toBe('john');
    });
  });
});
