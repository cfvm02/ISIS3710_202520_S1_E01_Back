import { Test, TestingModule } from '@nestjs/testing';
import { RatingsService } from './ratings.service';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';

describe('RatingsService', () => {
  let service: RatingsService;

  // IDs válidos
  const postId = new Types.ObjectId().toString();
  const userId = new Types.ObjectId().toString();

  const ratingModelMock = {
    findOne: jest.fn(),
    findOneAndDelete: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
  };

  const postModelMock = {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RatingsService,
        { provide: getModelToken('Rating'), useValue: ratingModelMock },
        { provide: getModelToken('Post'), useValue: postModelMock },
      ],
    }).compile();

    service = module.get<RatingsService>(RatingsService);

    jest.clearAllMocks();
  });

  // --------------------------
  // upsertRating
  // --------------------------

  it('should throw NotFoundException if post does not exist', async () => {
    postModelMock.findById.mockResolvedValue(null);

    await expect(
      service.upsertRating(postId, userId, { score: 5 }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should create a new rating if none exists', async () => {
    postModelMock.findById.mockResolvedValue({ _id: postId });

    ratingModelMock.findOne.mockResolvedValue(null);
    ratingModelMock.create.mockResolvedValue({});
    ratingModelMock.find.mockResolvedValue([{ score: 5 }]);

    postModelMock.findByIdAndUpdate.mockResolvedValue({});

    const result = await service.upsertRating(postId, userId, { score: 5 });

    expect(result.rating).toBe(5);
    expect(result.ratingAvg).toBe(5);
    expect(result.ratingCount).toBe(1);
  });

  it('should update an existing rating', async () => {
    postModelMock.findById.mockResolvedValue({ _id: postId });

    const existing = {
      _id: 'r1',
      score: 3,
      save: jest.fn(),
    };

    ratingModelMock.findOne.mockResolvedValue(existing);
    ratingModelMock.find.mockResolvedValue([{ score: 4 }]); // simulated new avg

    postModelMock.findByIdAndUpdate.mockResolvedValue({});

    const result = await service.upsertRating(postId, userId, { score: 4 });

    expect(existing.save).toHaveBeenCalled();
    expect(result.rating).toBe(4);
  });

  // --------------------------
  // getUserRating
  // --------------------------

  it('should return null rating if user has not rated', async () => {
    ratingModelMock.findOne.mockResolvedValue(null);

    const result = await service.getUserRating(postId, userId);

    expect(result).toEqual({ rating: null, score: null });
  });

  it('should return user rating if exists', async () => {
    ratingModelMock.findOne.mockResolvedValue({
      _id: 'r1',
      score: 5,
    });

    const result = await service.getUserRating(postId, userId);

    expect(result.rating).toBe('r1');
    expect(result.score).toBe(5);
  });

  // --------------------------
  // deleteRating
  // --------------------------

  it('should throw NotFoundException if rating does not exist', async () => {
    ratingModelMock.findOneAndDelete.mockResolvedValue(null);

    await expect(service.deleteRating(postId, userId)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should delete rating and return updated stats', async () => {
    ratingModelMock.findOneAndDelete.mockResolvedValue({ _id: 'r1' });

    ratingModelMock.find.mockResolvedValue([{ score: 3 }, { score: 5 }]);
    postModelMock.findByIdAndUpdate.mockResolvedValue({});

    const result = await service.deleteRating(postId, userId);

    expect(result.deleted).toBe(true);
    expect(result.ratingAvg).toBe(4);
    expect(result.ratingCount).toBe(2);
  });
});
