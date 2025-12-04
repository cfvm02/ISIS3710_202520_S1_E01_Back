import { Test, TestingModule } from '@nestjs/testing';
import { SearchService } from './search.service';
import { getModelToken } from '@nestjs/mongoose';

describe('SearchService', () => {
  let service: SearchService;

  const postModelMock = {
    find: jest.fn(),
    aggregate: jest.fn(),
  };

  const userModelMock = {
    find: jest.fn(),
    select: jest.fn(),
    limit: jest.fn(),
    lean: jest.fn(),
  };

  const blockedUserModelMock = {
    find: jest.fn(),
  };

  const mockQuery = () => ({
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue([]),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: getModelToken('Post'), useValue: postModelMock },
        { provide: getModelToken('User'), useValue: userModelMock },
        { provide: getModelToken('BlockedUser'), useValue: blockedUserModelMock },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);

    jest.clearAllMocks();

    // Default mock behavior
    postModelMock.find.mockReturnValue(mockQuery());
    userModelMock.find.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([]),
    });
    postModelMock.aggregate.mockResolvedValue([]);
  });

  // -----------------------------------------------------
  // searchPosts
  // -----------------------------------------------------
  describe('searchPosts', () => {
    it('should search posts with basic query', async () => {
      await service.searchPosts('dress');

      expect(postModelMock.find).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'published',
          $text: { $search: 'dress' },
        }),
      );
    });

    it('should filter by occasion, style and tags', async () => {
      await service.searchPosts('', 'party', 'street', 'red,summer');

      expect(postModelMock.find).toHaveBeenCalledWith(
        expect.objectContaining({
          occasion: 'party',
          style: 'street',
          tags: { $in: ['red', 'summer'] },
        }),
      );
    });
  });

  // -----------------------------------------------------
  // searchUsers
  // -----------------------------------------------------
  describe('searchUsers', () => {
    it('should search users by regex query', async () => {
      userModelMock.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([{ username: 'test' }]),
      });

      const result = await service.searchUsers('car', undefined);

      expect(userModelMock.find).toHaveBeenCalledWith(
        expect.objectContaining({
          $or: [
            { username: { $regex: 'car', $options: 'i' } },
            { firstName: { $regex: 'car', $options: 'i' } },
            { lastName: { $regex: 'car', $options: 'i' } },
          ],
        }),
      );

      expect(result).toEqual([{ username: 'test' }]);
    });

    it('should exclude blocked users', async () => {
      blockedUserModelMock.find.mockResolvedValue([
        { blockerId: '1', blockedId: '2' },
      ]);

      await service.searchUsers('', '', '1');

      expect(userModelMock.find).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: { $nin: ['2'] },
        }),
      );
    });
  });

  // -----------------------------------------------------
  // getSuggestions
  // -----------------------------------------------------
  describe('getSuggestions', () => {
    it('should return suggested users and tags', async () => {
      userModelMock.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([{ username: 'carolina' }]),
      });

      postModelMock.aggregate.mockResolvedValue([
        { _id: 'casual', count: 5 },
        { _id: 'street', count: 3 },
      ]);

      const result = await service.getSuggestions('c');

      expect(result).toEqual({
        users: [{ username: 'carolina' }],
        tags: ['casual', 'street'],
      });
    });
  });
});
