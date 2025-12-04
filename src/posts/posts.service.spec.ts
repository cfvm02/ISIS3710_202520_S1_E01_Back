import { Test, TestingModule } from '@nestjs/testing';
import { PostsService } from './posts.service';
import { getModelToken } from '@nestjs/mongoose';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { FileUrlService } from '../common/services/file-url.service';
import type { CreatePostDto } from './dto/create-post.dto';

// IDs válidos reutilizables
const USER_ID = new Types.ObjectId().toHexString();
const OTHER_USER_ID = new Types.ObjectId().toHexString();
const POST_ID = new Types.ObjectId().toHexString();

// Mocks de modelos
const postModelMock = {
  create: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
  countDocuments: jest.fn(),
};

const postLikeModelMock = {
  find: jest.fn(),
  findOne: jest.fn(),
  findOneAndDelete: jest.fn(),
  create: jest.fn(),
  deleteMany: jest.fn(),
};

const userModelMock = {
  findByIdAndUpdate: jest.fn(),
};

const followModelMock = {
  find: jest.fn(),
};

const collectionItemModelMock = {
  find: jest.fn(),
  findOne: jest.fn(),
  deleteMany: jest.fn(),
};

const ratingModelMock = {
  find: jest.fn(),
  findOne: jest.fn(),
  deleteMany: jest.fn(),
};

// Mock FileUrlService
const fileUrlServiceMock = {
  toPublicUrl: jest.fn((url?: string | null) =>
    url ? `public/${url}` : (url ?? null),
  ),
};

// Helper para consultas encadenables de Mongoose (.sort().skip().limit().populate().lean())
function mockFindQuery(resolvedValue: any) {
  return {
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(resolvedValue),
  };
}

describe('PostsService FULL TESTS', () => {
  let service: PostsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostsService,
        { provide: getModelToken('Post'), useValue: postModelMock },
        { provide: getModelToken('PostLike'), useValue: postLikeModelMock },
        { provide: getModelToken('User'), useValue: userModelMock },
        { provide: getModelToken('Follow'), useValue: followModelMock },
        {
          provide: getModelToken('CollectionItem'),
          useValue: collectionItemModelMock,
        },
        { provide: getModelToken('Rating'), useValue: ratingModelMock },
        { provide: FileUrlService, useValue: fileUrlServiceMock },
      ],
    }).compile();

    service = module.get<PostsService>(PostsService);
    jest.clearAllMocks();
  });

  // Test para crear post
  it('should create a post and normalize media', async () => {
    const dto = {
      imageUrl: 'image.jpg',
      description: 'desc',
    } as unknown as CreatePostDto;

    const createdPost = { _id: new Types.ObjectId(POST_ID) };

    postModelMock.create.mockResolvedValue(createdPost);

    userModelMock.findByIdAndUpdate.mockResolvedValue({});

    const populatedPost = {
      _id: new Types.ObjectId(POST_ID),
      imageUrl: 'image.jpg',
      clothItems: [{ imageUrl: 'cloth.jpg' }],
      userId: {
        username: 'user',
        avatar: 'avatar.jpg',
      },
    };

    postModelMock.findById.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(populatedPost),
      }),
    });

    const result = (await service.create(USER_ID, dto)) as unknown as {
      id: string;
      imageUrl: string;
      clothItems: Array<{ imageUrl: string }>;
    };

    expect(postModelMock.create).toHaveBeenCalled();
    expect(userModelMock.findByIdAndUpdate).toHaveBeenCalledWith(USER_ID, {
      $inc: { postsCount: 1 },
    });
    expect(result.id).toBe(POST_ID);
    expect(result.imageUrl).toBe('public/image.jpg');
    expect(result.clothItems[0].imageUrl).toBe('public/cloth.jpg');
  });

  // Test para listar posts sin usuario actual
  it('should list posts without user interactions when currentUserId is not provided', async () => {
    const posts = [
      {
        _id: new Types.ObjectId(POST_ID),
        imageUrl: 'img.jpg',
        clothItems: [],
      },
    ];

    postModelMock.find.mockReturnValue(mockFindQuery(posts));
    postModelMock.countDocuments.mockResolvedValue(1);

    const result = await service.findAll(1, 10);

    type NormalizedPost = {
      imageUrl: string;
      clothItems: any[];
      [key: string]: any;
    };

    const items = result.posts as NormalizedPost[];

    expect(items.length).toBe(1);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(items[0].imageUrl).toBe('public/img.jpg');
  });

  // Test para obtener un post por id sin usuario actual
  it('should get a post by id and increment views without current user', async () => {
    const storedPost = {
      _id: new Types.ObjectId(POST_ID),
      imageUrl: 'img.jpg',
      clothItems: [],
    };

    postModelMock.findById.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(storedPost),
      }),
    });

    postModelMock.findByIdAndUpdate.mockResolvedValue({});

    const result = (await service.findOne(POST_ID)) as unknown as {
      id: string;
      imageUrl: string;
      isLiked: boolean;
    };

    expect(result.id).toBe(POST_ID);
    expect(result.imageUrl).toBe('public/img.jpg');
    expect(postModelMock.findByIdAndUpdate).toHaveBeenCalled();
  });

  // Test para obtener un post con interacciones de usuario
  it('should get a post with user interactions', async () => {
    const storedPost = {
      _id: new Types.ObjectId(POST_ID),
      imageUrl: 'img.jpg',
      clothItems: [],
    };

    postModelMock.findById.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(storedPost),
      }),
    });

    postModelMock.findByIdAndUpdate.mockResolvedValue({});

    collectionItemModelMock.findOne.mockResolvedValue({ _id: 'saved' });
    postLikeModelMock.findOne.mockResolvedValue({ _id: 'like' });
    ratingModelMock.findOne.mockResolvedValue({ score: 5 });

    const result = (await service.findOne(POST_ID, USER_ID)) as unknown as {
      isSaved: boolean;
      isLiked: boolean;
      userRating: number;
    };

    expect(result.isSaved).toBe(true);
    expect(result.isLiked).toBe(true);
    expect(result.userRating).toBe(5);
  });

  // Test para error al obtener post inexistente
  it('should throw NotFoundException when post is not found in findOne', async () => {
    postModelMock.findById.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      }),
    });

    await expect(service.findOne(POST_ID)).rejects.toThrow(NotFoundException);
  });

  // Test para actualizar un post propio
  it('should update a post when user is owner', async () => {
    postModelMock.findById.mockResolvedValue({
      _id: new Types.ObjectId(POST_ID),
      userId: new Types.ObjectId(USER_ID),
    });

    const updatedPost = {
      _id: new Types.ObjectId(POST_ID),
      imageUrl: 'updated.jpg',
      clothItems: [],
    };

    postModelMock.findByIdAndUpdate.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(updatedPost),
      }),
    });

    const result = (await service.update(POST_ID, USER_ID, {
      description: 'new desc',
    } as any)) as unknown as { id: string; imageUrl: string };

    expect(result.id).toBe(POST_ID);
    expect(result.imageUrl).toBe('public/updated.jpg');
  });

  // Test para error al actualizar post inexistente
  it('should throw NotFoundException when updating non-existing post', async () => {
    postModelMock.findById.mockResolvedValue(null);

    await expect(
      service.update(POST_ID, USER_ID, { description: 'x' } as any),
    ).rejects.toThrow(NotFoundException);
  });

  // Test para error al actualizar post de otro usuario
  it('should throw ForbiddenException when updating another user post', async () => {
    postModelMock.findById.mockResolvedValue({
      _id: new Types.ObjectId(POST_ID),
      userId: new Types.ObjectId(OTHER_USER_ID),
    });

    await expect(
      service.update(POST_ID, USER_ID, { description: 'x' } as any),
    ).rejects.toThrow(ForbiddenException);
  });

  // Test para eliminar post propio
  it('should delete a post when user is owner', async () => {
    postModelMock.findById.mockResolvedValue({
      _id: new Types.ObjectId(POST_ID),
      userId: new Types.ObjectId(USER_ID),
    });

    postModelMock.findByIdAndDelete.mockResolvedValue({});
    userModelMock.findByIdAndUpdate.mockResolvedValue({});
    postLikeModelMock.deleteMany.mockResolvedValue({});
    collectionItemModelMock.deleteMany.mockResolvedValue({});
    ratingModelMock.deleteMany.mockResolvedValue({});

    const result = await service.remove(POST_ID, USER_ID);

    expect(result.deleted).toBe(true);
    expect(postModelMock.findByIdAndDelete).toHaveBeenCalled();
  });

  // Test para error al eliminar post inexistente
  it('should throw NotFoundException when deleting non-existing post', async () => {
    postModelMock.findById.mockResolvedValue(null);

    await expect(service.remove(POST_ID, USER_ID)).rejects.toThrow(
      NotFoundException,
    );
  });

  // Test para error al eliminar post de otro usuario
  it('should throw ForbiddenException when deleting another user post', async () => {
    postModelMock.findById.mockResolvedValue({
      _id: new Types.ObjectId(POST_ID),
      userId: new Types.ObjectId(OTHER_USER_ID),
    });

    await expect(service.remove(POST_ID, USER_ID)).rejects.toThrow(
      ForbiddenException,
    );
  });

  // Test para dar like a un post
  it('should like a post successfully', async () => {
    postModelMock.findById.mockResolvedValue({
      _id: new Types.ObjectId(POST_ID),
    });

    postLikeModelMock.findOne.mockResolvedValue(null);
    postLikeModelMock.create.mockResolvedValue({});

    postModelMock.findByIdAndUpdate.mockResolvedValue({
      likesCount: 3,
    });

    const result = await service.likePost(POST_ID, USER_ID);

    expect(result.liked).toBe(true);
    expect(result.likesCount).toBe(3);
  });

  // Test para error al dar like a post inexistente
  it('should throw NotFoundException when liking non-existing post', async () => {
    postModelMock.findById.mockResolvedValue(null);

    await expect(service.likePost(POST_ID, USER_ID)).rejects.toThrow(
      NotFoundException,
    );
  });

  // Test para error al dar like a post ya likeado
  it('should throw BadRequestException when liking already liked post', async () => {
    postModelMock.findById.mockResolvedValue({
      _id: new Types.ObjectId(POST_ID),
    });

    postLikeModelMock.findOne.mockResolvedValue({ _id: 'like' });

    await expect(service.likePost(POST_ID, USER_ID)).rejects.toThrow(
      BadRequestException,
    );
  });

  // Test para quitar like de un post
  it('should unlike a post successfully', async () => {
    postLikeModelMock.findOneAndDelete.mockResolvedValue({
      _id: 'like',
    });

    postModelMock.findByIdAndUpdate.mockResolvedValue({
      likesCount: 1,
    });

    const result = await service.unlikePost(POST_ID, USER_ID);

    expect(result.liked).toBe(false);
    expect(result.likesCount).toBe(1);
  });

  // Test para error al hacer unlike sin like previo
  it('should throw NotFoundException when unliking a post not liked', async () => {
    postLikeModelMock.findOneAndDelete.mockResolvedValue(null);

    await expect(service.unlikePost(POST_ID, USER_ID)).rejects.toThrow(
      NotFoundException,
    );
  });

  // Test para buscar posts con filtros
  it('should search posts with filters and normalize media', async () => {
    const posts = [
      {
        _id: new Types.ObjectId(POST_ID),
        imageUrl: 'search.jpg',
        clothItems: [],
      },
    ];

    postModelMock.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnThis(),
          lean: jest.fn().mockResolvedValue(posts),
        }),
      }),
    });

    const result = (await service.searchPosts(
      'query',
      'occasion',
      'style',
      'a,b',
    )) as unknown as Array<{ id: string; imageUrl: string }>;

    expect(result.length).toBe(1);
    expect(result[0].id).toBe(POST_ID);
    expect(result[0].imageUrl).toBe('public/search.jpg');
  });
});
