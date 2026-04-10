import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { AuthService } from '../src/auth/auth.service';
import { UserRole } from '../src/users/entities/user.entity';
import { ConflictException, UnauthorizedException } from '@nestjs/common';

describe('AuthService', () => {
  let usersService: any;
  let jwtService: any;
  let service: AuthService;

  beforeEach(() => {
    usersService = {
      findByUsername: jest.fn(),
      validatePassword: jest.fn(),
      create: jest.fn(),
    };
    jwtService = {
      sign: jest.fn(),
    };
    service = new AuthService(usersService, jwtService);
  });

  it('validateUser throws on missing user', async () => {
    usersService.findByUsername.mockResolvedValue(null);

    await expect(service.validateUser('u', 'p')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('validateUser throws on invalid password', async () => {
    usersService.findByUsername.mockResolvedValue({ id: '1' });
    usersService.validatePassword.mockResolvedValue(false);

    await expect(service.validateUser('u', 'p')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('validateUser returns user on valid password', async () => {
    const user = { id: '1' } as any;
    usersService.findByUsername.mockResolvedValue(user);
    usersService.validatePassword.mockResolvedValue(true);

    await expect(service.validateUser('u', 'p')).resolves.toBe(user);
  });

  it('login signs jwt with correct payload', async () => {
    const user = { id: '1', username: 'useruser', role: UserRole.User } as any;
    jwtService.sign.mockReturnValue('token');

    const result = await service.login(user);

    expect(jwtService.sign).toHaveBeenCalledWith({ username: 'useruser', role: UserRole.User, sub: '1' });
    expect(result.access_token).toBe('token');
    expect(result.user).toEqual({
      id: '1',
      username: 'useruser',
      firstName: undefined,
      lastName: undefined,
      role: UserRole.User,
    });
  });

  it('register throws when username exists', async () => {
    usersService.findByUsername.mockResolvedValue({ id: '1' });

    await expect(service.register('useruser', '123456')).rejects.toBeInstanceOf(ConflictException);
  });

  it('register creates user when username is free', async () => {
    usersService.findByUsername.mockResolvedValue(null);

    await service.register('useruser', '123456', 'user', 'user');

    expect(usersService.create).toHaveBeenCalledWith('useruser', '123456', 'user', 'user');
  });
});
