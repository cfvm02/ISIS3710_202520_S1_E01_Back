import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { getModelToken } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

// Mocks
const userModelMock = {
  findOne: jest.fn(),
  create: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
};

const jwtServiceMock = {
  sign: jest.fn(),
};

const configServiceMock = {
  get: jest.fn().mockReturnValue('secret'),
};

jest.mock('bcrypt', () => ({
  hash: jest.fn<Promise<string>, [string, number]>(),
  compare: jest.fn<Promise<boolean>, [string, string]>(),
}));

const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getModelToken('User'), useValue: userModelMock },
        { provide: JwtService, useValue: jwtServiceMock },
        { provide: ConfigService, useValue: configServiceMock },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('register', () => {
    // Test para detectar email duplicado en registro
    it('should throw ConflictException if email already exists', async () => {
      userModelMock.findOne.mockResolvedValue({ email: 'test@mail.com' });

      await expect(
        service.register({
          username: 'user',
          email: 'test@mail.com',
          password: '1234',
          firstName: 'John',
          lastName: 'Doe',
        }),
      ).rejects.toThrow(ConflictException);
    });

    // Test para registro exitoso
    it('should create user and return tokens', async () => {
      userModelMock.findOne.mockResolvedValue(null);

      (mockedBcrypt.hash as jest.Mock).mockResolvedValue('hashedPass');

      const mockUser = {
        _id: '123',
        username: 'user',
        email: 'test@mail.com',
      };

      userModelMock.create.mockResolvedValue(mockUser);

      jwtServiceMock.sign.mockReturnValue('jwtToken');

      const result = await service.register({
        username: 'user',
        email: 'test@mail.com',
        password: '1234',
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(userModelMock.create).toHaveBeenCalled();
      expect(result.token).toBe('jwtToken');
      expect(result.refreshToken).toBe('jwtToken');
      expect(result.user.id).toBe('123');
    });
  });

  describe('login', () => {
    // Test para login con usuario inexistente
    it('should throw UnauthorizedException if user not found', async () => {
      userModelMock.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.login({ email: 'test@mail.com', password: '1234' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    // Test para login con contraseña incorrecta
    it('should throw UnauthorizedException if password invalid', async () => {
      const mockUser = {
        comparePassword: jest.fn().mockResolvedValue(false),
      };

      userModelMock.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });

      await expect(
        service.login({ email: 'test@mail.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    // Test para login exitoso
    it('should return tokens when credentials are valid', async () => {
      const mockUser = {
        _id: '123',
        username: 'user',
        email: 'test@mail.com',
        comparePassword: jest.fn().mockResolvedValue(true),
        save: jest.fn(),
      };

      userModelMock.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });

      jwtServiceMock.sign.mockReturnValue('jwtToken');

      const result = await service.login({
        email: 'test@mail.com',
        password: '1234',
      });

      expect(result.token).toBe('jwtToken');
      expect(result.user.id).toBe('123');
    });
  });

  describe('refresh', () => {
    // Test para refresh token con usuario inexistente
    it('should throw UnauthorizedException if user not found', async () => {
      userModelMock.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      await expect(service.refresh('123', 'refreshToken')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    // Test para refresh token inválido
    it('should throw UnauthorizedException if refresh token is invalid', async () => {
      const mockUser = { refreshToken: 'hashedRT' };

      userModelMock.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });

      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.refresh('123', 'invalidToken')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    // Test para refresh token exitoso
    it('should return new tokens when refresh token is valid', async () => {
      const mockUser = {
        _id: '123',
        username: 'user',
        email: 'test@mail.com',
        refreshToken: 'hashedRT',
      };

      userModelMock.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });

      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtServiceMock.sign.mockReturnValue('jwtToken');

      const result = await service.refresh('123', 'validToken');

      expect(result.token).toBe('jwtToken');
      expect(result.refreshToken).toBe('jwtToken');
    });
  });

  describe('getMe', () => {
    // Test para obtener perfil de usuario inexistente
    it('should throw NotFoundException if user does not exist', async () => {
      userModelMock.findById.mockResolvedValue(null);

      await expect(service.getMe('123')).rejects.toThrow(NotFoundException);
    });

    // Test para obtener perfil exitosamente
    it('should return user response dto', async () => {
      const mockUser = { _id: '123', username: 'test', email: 'mail@mail.com' };

      userModelMock.findById.mockResolvedValue(mockUser);

      const result = await service.getMe('123');

      expect(result.id).toBe('123');
      expect(result.email).toBe('mail@mail.com');
    });
  });

  describe('updateProfile', () => {
    // Test para evitar actualizar username duplicado
    it('should throw ConflictException if username already exists', async () => {
      userModelMock.findOne.mockResolvedValue({ username: 'taken' });

      await expect(
        service.updateProfile('123', { username: 'taken' }),
      ).rejects.toThrow(ConflictException);
    });

    // Test para actualización de perfil con usuario inexistente
    it('should throw NotFoundException if user not found', async () => {
      userModelMock.findOne.mockResolvedValue(null);
      userModelMock.findByIdAndUpdate.mockResolvedValue(null);

      await expect(
        service.updateProfile('123', { bio: 'new bio' }),
      ).rejects.toThrow(NotFoundException);
    });

    // Test para actualización de perfil exitosa
    it('should update and return updated user', async () => {
      userModelMock.findOne.mockResolvedValue(null);

      const mockUser = {
        _id: '123',
        username: 'user',
        email: 'mail@mail.com',
      };

      userModelMock.findByIdAndUpdate.mockResolvedValue(mockUser);

      const result = await service.updateProfile('123', { bio: 'new bio' });

      expect(result.id).toBe('123');
    });
  });
});
