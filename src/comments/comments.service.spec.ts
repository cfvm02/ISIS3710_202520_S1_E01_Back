import { Test, TestingModule } from '@nestjs/testing';
import { CommentsService } from './comments.service';
import { getModelToken } from '@nestjs/mongoose';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Types } from 'mongoose';

// IDs válidos
const VALID_ID = '507f1f77bcf86cd799439011';
const OTHER_ID = '507f1f77bcf86cd799439012';

// Helper mock para queries de Mongoose
function mockQuery(returnValue: any) {
  return {
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(returnValue),
  };
}

// Mock Models
const commentModelMock = {
  findById: jest.fn(),
  create: jest.fn(),
  find: jest.fn(),
  countDocuments: jest.fn(),
  deleteMany: jest.fn(),
};

const postModelMock = {
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
};

// Silenciar logs
jest.spyOn(global.console, 'log').mockImplementation(() => {});

describe('CommentsService FULL TESTS', () => {
  let service: CommentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentsService,
        { provide: getModelToken('Comment'), useValue: commentModelMock },
        { provide: getModelToken('Post'), useValue: postModelMock },
      ],
    }).compile();

    service = module.get<CommentsService>(CommentsService);
    jest.clearAllMocks();
  });

  // Test para crear comentario correctamente
  it('should create a comment successfully', async () => {
    const dto = { text: 'Hello world' };

    postModelMock.findById.mockResolvedValue({ _id: VALID_ID });

    commentModelMock.findById.mockReturnValue(
      mockQuery({ _id: VALID_ID, content: 'Hello world' }),
    );

    commentModelMock.create.mockResolvedValue({ _id: VALID_ID });
    postModelMock.findByIdAndUpdate.mockResolvedValue({});

    const result = (await service.create(VALID_ID, VALID_ID, dto)) as Record<
      string,
      any
    >;

    expect(result._id).toBe(VALID_ID);
    expect(result.content).toBe('Hello world');
  });

  // Test para error cuando el post no existe
  it('should throw NotFoundException if post does not exist in create()', async () => {
    postModelMock.findById.mockResolvedValue(null);

    await expect(
      service.create(VALID_ID, VALID_ID, { text: 'x' }),
    ).rejects.toThrow(NotFoundException);
  });

  // Test para error cuando el comentario padre no existe
  it('should throw NotFoundException if parent comment does not exist', async () => {
    postModelMock.findById.mockResolvedValue({});
    commentModelMock.findById.mockResolvedValue(null);

    await expect(
      service.create(VALID_ID, VALID_ID, {
        text: 'x',
        parentCommentId: OTHER_ID,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  // Test para error por nesting no permitido
  it('should throw BadRequestException for nested replies level > 1', async () => {
    postModelMock.findById.mockResolvedValue({});
    commentModelMock.findById.mockResolvedValue({
      parentCommentId: VALID_ID,
    });

    await expect(
      service.create(VALID_ID, VALID_ID, {
        text: 'x',
        parentCommentId: VALID_ID,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  // Test para error si el comentario padre pertenece a otro post
  it('should throw BadRequestException if parent comment belongs to another post', async () => {
    postModelMock.findById.mockResolvedValue({});
    commentModelMock.findById.mockResolvedValue({
      parentCommentId: null,
      postId: new Types.ObjectId(OTHER_ID),
    });

    await expect(
      service.create(VALID_ID, VALID_ID, {
        text: 'x',
        parentCommentId: VALID_ID,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  // Test para obtener todos los comentarios con replies
  it('should return paginated comments with replies', async () => {
    const baseComments = [
      { _id: new Types.ObjectId(VALID_ID), content: 'C1' },
      { _id: new Types.ObjectId(OTHER_ID), content: 'C2' },
    ];

    commentModelMock.find.mockReturnValue(mockQuery(baseComments));
    commentModelMock.countDocuments.mockResolvedValue(2);

    // Simular replies
    commentModelMock.find.mockReturnValueOnce(mockQuery(baseComments));
    commentModelMock.find.mockReturnValueOnce(
      mockQuery([{ _id: OTHER_ID, content: 'R1' }]),
    );
    commentModelMock.find.mockReturnValueOnce(
      mockQuery([{ _id: VALID_ID, content: 'R2' }]),
    );

    const result = await service.findAll(VALID_ID, 1, 10);

    expect(result.data.length).toBe(2);
    expect(result.total).toBe(2);
    expect(result.page).toBe(1);
    expect(result.totalPages).toBe(1);

    const data = result.data as Array<{ replies: any[] }>;
    expect(data[0].replies.length).toBe(1);
  });

  // Test para eliminar un comentario correctamente
  it('should delete a comment and its replies', async () => {
    commentModelMock.findById.mockResolvedValue({
      _id: VALID_ID,
      userId: new Types.ObjectId(VALID_ID),
    });

    commentModelMock.find.mockResolvedValue([
      { _id: OTHER_ID, parentCommentId: VALID_ID },
    ]);

    commentModelMock.deleteMany.mockResolvedValue({});
    postModelMock.findByIdAndUpdate.mockResolvedValue({});

    const result = await service.remove(VALID_ID, VALID_ID, VALID_ID);

    expect(result.deleted).toBe(true);
  });

  // Test para error cuando el comentario no existe
  it('should throw NotFoundException if comment does not exist', async () => {
    commentModelMock.findById.mockResolvedValue(null);

    await expect(service.remove(VALID_ID, VALID_ID, VALID_ID)).rejects.toThrow(
      NotFoundException,
    );
  });

  // Test para error cuando se intenta borrar comentario de otro usuario
  it('should throw ForbiddenException if deleting another user’s comment', async () => {
    commentModelMock.findById.mockResolvedValue({
      userId: new Types.ObjectId(OTHER_ID),
    });

    await expect(service.remove(VALID_ID, VALID_ID, VALID_ID)).rejects.toThrow(
      ForbiddenException,
    );
  });
});
