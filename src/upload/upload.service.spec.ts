import { Test, TestingModule } from '@nestjs/testing';
import { UploadService } from './upload.service';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

// -----------------------------
// MOCKS
// -----------------------------
jest.mock('fs');
jest.mock('path');

const configServiceMock = {
  get: jest.fn(),
};

describe('UploadService', () => {
  let service: UploadService;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Valores por defecto de configuración
    configServiceMock.get.mockImplementation((key: string) => {
      switch (key) {
        case 'UPLOAD_PATH':
          return './uploads';
        case 'MAX_FILE_SIZE':
          return 5 * 1024 * 1024; // 5MB
        case 'PORT':
          return 3000;
        case 'ALLOWED_IMAGE_TYPES':
          return 'image/jpeg,image/png';
        default:
          return null;
      }
    });

    // fs mock behavior
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);
    (fs.writeFileSync as jest.Mock).mockReturnValue(undefined);
    (fs.unlinkSync as jest.Mock).mockReturnValue(undefined);

    // path.join mock
    (path.join as unknown as jest.Mock).mockImplementation((...args) =>
      args.join('/'),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadService,
        { provide: ConfigService, useValue: configServiceMock },
      ],
    }).compile();

    service = module.get<UploadService>(UploadService);
  });

  // ---------------------------------------------------------
  // uploadImage()
  // ---------------------------------------------------------
  describe('uploadImage', () => {
    it('should throw BadRequestException if no file is provided', async () => {
      await expect(service.uploadImage(null as any, 'post')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for invalid mime type', async () => {
      const file = {
        mimetype: 'application/pdf',
        buffer: Buffer.from('test'),
        size: 1000,
        originalname: 'test.pdf',
      } as Express.Multer.File;

      await expect(service.uploadImage(file, 'post')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if file is too large', async () => {
      const file = {
        mimetype: 'image/jpeg',
        buffer: Buffer.from('test'),
        size: 6 * 1024 * 1024, // 6MB
        originalname: 'bigfile.jpg',
      } as Express.Multer.File;

      await expect(service.uploadImage(file, 'post')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should upload image successfully', async () => {
      const file = {
        mimetype: 'image/jpeg',
        buffer: Buffer.from('test data'),
        size: 1024,
        originalname: 'photo.jpg',
      } as Express.Multer.File;

      const result = await service.uploadImage(file, 'post');

      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('filename');
      expect(result.relativeUrl).toContain('/uploads/posts/');
    });

    it('should save image to avatar folder when type=avatar', async () => {
      const file = {
        mimetype: 'image/jpeg',
        buffer: Buffer.from('abc'),
        size: 1000,
        originalname: 'avatar.png',
      } as Express.Multer.File;

      const result = await service.uploadImage(file, 'avatar');

      expect(result.relativeUrl).toContain('/uploads/avatars/');
    });

    it('should save image to cloths folder when type=cloth', async () => {
      const file = {
        mimetype: 'image/jpeg',
        buffer: Buffer.from('abc'),
        size: 1000,
        originalname: 'cloth.png',
      } as Express.Multer.File;

      const result = await service.uploadImage(file, 'cloth');

      expect(result.relativeUrl).toContain('/uploads/cloths/');
    });
  });

  // ---------------------------------------------------------
  // deleteImage()
  // ---------------------------------------------------------
  describe('deleteImage', () => {
    it('should delete file successfully if it exists in one of the folders', async () => {
      (fs.existsSync as jest.Mock).mockReturnValueOnce(false); // posts
      (fs.existsSync as jest.Mock).mockReturnValueOnce(true); // avatars

      const result = await service.deleteImage('imagen.jpg');

      expect(fs.unlinkSync).toHaveBeenCalled();
      expect(result.deleted).toBe(true);
    });

    it('should throw NotFoundException if file does not exist', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      await expect(service.deleteImage('notfound.jpg')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
