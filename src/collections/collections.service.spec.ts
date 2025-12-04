import { Test, TestingModule } from '@nestjs/testing';
import { CollectionsService } from './collections.service';
import { getModelToken } from '@nestjs/mongoose';
import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { Types } from 'mongoose';

// IDs válidos para pruebas
const VALID_ID = '507f191e810c19729de860ea';
const OTHER_ID = '507f191e810c19729de860eb';
const VALID_POST_ID = '507f191e810c19729de860ec';

// Helper para simular consultas encadenables de Mongoose
function createMockQuery(resolvedValue: any) {
  return {
    sort: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(resolvedValue),
  };
}

// Mock Models
const collectionModelMock = {
  create: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
};

const collectionItemModelMock = {
  countDocuments: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  deleteMany: jest.fn(),
  findOneAndDelete: jest.fn(),
};

const postModelMock = {
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
};

// Evitar output de console.log en tests
jest.spyOn(global.console, 'log').mockImplementation(() => {});

describe('CollectionsService FULL TESTS', () => {
  let service: CollectionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollectionsService,
        { provide: getModelToken('Collection'), useValue: collectionModelMock },
        {
          provide: getModelToken('CollectionItem'),
          useValue: collectionItemModelMock,
        },
        { provide: getModelToken('Post'), useValue: postModelMock },
      ],
    }).compile();

    service = module.get<CollectionsService>(CollectionsService);
    jest.clearAllMocks();
  });

  // Test para crear una colección
  it('should create a new collection', async () => {
    const dto = { title: 'My Collection' };
    const mockCollection = { _id: VALID_ID, title: 'My Collection' };

    collectionModelMock.create.mockResolvedValue(mockCollection);

    const result = (await service.create(VALID_ID, dto)) as {
      _id: string;
      title: string;
    };

    expect(collectionModelMock.create).toHaveBeenCalled();
    expect(result).toEqual(mockCollection);
  });

  // Test para obtener todas las colecciones con itemsCount
  it('should return all collections with itemsCount', async () => {
    const mockCollections = [
      { _id: VALID_ID, title: 'Col 1' },
      { _id: OTHER_ID, title: 'Col 2' },
    ];

    collectionModelMock.find.mockReturnValue(createMockQuery(mockCollections));

    collectionItemModelMock.countDocuments.mockResolvedValue(5);

    const result = (await service.findAll(VALID_ID)) as Array<{
      itemsCount: number;
    }>;

    expect(result.length).toBe(2);
    expect(result[0].itemsCount).toBe(5);
    expect(result[1].itemsCount).toBe(5);
  });

  // Test para obtener una colección pública
  it('should return a public collection with items', async () => {
    const mockCollection = {
      _id: VALID_ID,
      title: 'My Collection',
      isPublic: true,
      userId: new Types.ObjectId(VALID_ID),
    };

    collectionModelMock.findById.mockReturnValue(
      createMockQuery(mockCollection),
    );

    const items = [
      { postId: { id: VALID_POST_ID } },
      { postId: { id: OTHER_ID } },
    ];

    collectionItemModelMock.find.mockReturnValue(createMockQuery(items));

    const result = (await service.findOne(VALID_ID, OTHER_ID)) as {
      items: any[];
      itemsCount: number;
    };

    expect(result.items.length).toBe(2);
    expect(result.itemsCount).toBe(2);
  });

  // Test para colección privada sin acceso
  it('should throw ForbiddenException on private collection', async () => {
    const mockCollection = {
      _id: VALID_ID,
      title: 'Private Col',
      isPublic: false,
      userId: new Types.ObjectId(VALID_ID),
    };

    collectionModelMock.findById.mockReturnValue(
      createMockQuery(mockCollection),
    );

    await expect(service.findOne(VALID_ID, OTHER_ID)).rejects.toThrow(
      ForbiddenException,
    );
  });

  // Test para colección no encontrada
  it('should throw NotFoundException if collection does not exist in findOne', async () => {
    collectionModelMock.findById.mockReturnValue(createMockQuery(null));

    await expect(service.findOne(VALID_ID)).rejects.toThrow(NotFoundException);
  });

  // Test para actualizar colección propia
  it('should update a collection', async () => {
    const mockCollection = {
      _id: VALID_ID,
      userId: new Types.ObjectId(VALID_ID),
    };

    const updated = { _id: VALID_ID, title: 'Updated' };

    collectionModelMock.findById.mockResolvedValue(mockCollection);
    collectionModelMock.findByIdAndUpdate.mockReturnValue(
      createMockQuery(updated),
    );

    const result = (await service.update(VALID_ID, VALID_ID, {
      title: 'Updated',
    })) as { _id: string; title: string };

    expect(result).toEqual(updated);
  });

  // Test para evitar actualización por usuario no dueño
  it('should throw ForbiddenException when updating another user collection', async () => {
    const mockCollection = {
      _id: VALID_ID,
      userId: new Types.ObjectId(OTHER_ID),
    };

    collectionModelMock.findById.mockResolvedValue(mockCollection);

    await expect(
      service.update(VALID_ID, VALID_ID, { title: 'x' }),
    ).rejects.toThrow(ForbiddenException);
  });

  // Test para eliminar colección propia
  it('should delete a collection', async () => {
    const mockCollection = {
      _id: VALID_ID,
      userId: new Types.ObjectId(VALID_ID),
    };

    collectionModelMock.findById.mockResolvedValue(mockCollection);

    collectionModelMock.findByIdAndDelete.mockResolvedValue({});
    collectionItemModelMock.deleteMany.mockResolvedValue({});

    const result = await service.remove(VALID_ID, VALID_ID);

    expect(result.deleted).toBe(true);
  });

  // Test para lanzar NotFoundException al eliminar colección inexistente
  it('should throw NotFoundException when deleting non-existing collection', async () => {
    collectionModelMock.findById.mockResolvedValue(null);

    await expect(service.remove(VALID_ID, VALID_ID)).rejects.toThrow(
      NotFoundException,
    );
  });

  // Test para agregar post a colección
  it('should add a post to collection', async () => {
    const mockCollection = {
      _id: VALID_ID,
      userId: new Types.ObjectId(VALID_ID),
    };

    const mockPost = { _id: VALID_POST_ID };

    collectionModelMock.findById.mockResolvedValue(mockCollection);
    postModelMock.findById.mockResolvedValue(mockPost);
    collectionItemModelMock.findOne.mockResolvedValue(null);

    collectionItemModelMock.create.mockResolvedValue({});
    postModelMock.findByIdAndUpdate.mockResolvedValue({});
    collectionItemModelMock.countDocuments.mockResolvedValue(5);

    const result = (await service.addPost(
      VALID_ID,
      VALID_ID,
      VALID_POST_ID,
    )) as { saved: boolean; itemsCount: number };

    expect(result.itemsCount).toBe(5);
    expect(result.saved).toBe(true);
  });

  // Test para evitar agregar post duplicado
  it('should throw ConflictException when adding duplicate post', async () => {
    const mockCollection = {
      _id: VALID_ID,
      userId: new Types.ObjectId(VALID_ID),
    };

    collectionModelMock.findById.mockResolvedValue(mockCollection);
    postModelMock.findById.mockResolvedValue({});

    collectionItemModelMock.findOne.mockResolvedValue({ existing: true });

    await expect(
      service.addPost(VALID_ID, VALID_ID, VALID_POST_ID),
    ).rejects.toThrow(ConflictException);
  });

  // Test para evitar agregar post a colección ajena
  it('should throw ForbiddenException when adding post to another user collection', async () => {
    const mockCollection = {
      _id: VALID_ID,
      userId: new Types.ObjectId(OTHER_ID),
    };

    collectionModelMock.findById.mockResolvedValue(mockCollection);

    await expect(
      service.addPost(VALID_ID, VALID_ID, VALID_POST_ID),
    ).rejects.toThrow(ForbiddenException);
  });

  // Test para remover post de colección
  it('should remove a post from collection', async () => {
    const mockCollection = {
      _id: VALID_ID,
      userId: new Types.ObjectId(VALID_ID),
    };

    collectionModelMock.findById.mockResolvedValue(mockCollection);

    collectionItemModelMock.findOneAndDelete.mockResolvedValue({});
    postModelMock.findByIdAndUpdate.mockResolvedValue({});
    collectionItemModelMock.countDocuments.mockResolvedValue(3);

    const result = (await service.removePost(
      VALID_ID,
      VALID_ID,
      VALID_POST_ID,
    )) as { removed: boolean; itemsCount: number };

    expect(result.itemsCount).toBe(3);
    expect(result.removed).toBe(true);
  });

  // Test para eliminar post inexistente
  it('should throw NotFoundException when removing non-existing post', async () => {
    const mockCollection = {
      _id: VALID_ID,
      userId: new Types.ObjectId(VALID_ID),
    };

    collectionModelMock.findById.mockResolvedValue(mockCollection);

    collectionItemModelMock.findOneAndDelete.mockResolvedValue(null);

    await expect(
      service.removePost(VALID_ID, VALID_ID, VALID_POST_ID),
    ).rejects.toThrow(NotFoundException);
  });

  // Test para evitar eliminar post de colección ajena
  it('should throw ForbiddenException when removing post from another user collection', async () => {
    const mockCollection = {
      _id: VALID_ID,
      userId: new Types.ObjectId(OTHER_ID),
    };

    collectionModelMock.findById.mockResolvedValue(mockCollection);

    await expect(
      service.removePost(VALID_ID, VALID_ID, VALID_POST_ID),
    ).rejects.toThrow(ForbiddenException);
  });
});
