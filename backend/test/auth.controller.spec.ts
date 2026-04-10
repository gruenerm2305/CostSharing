import { describe, it, expect, jest } from '@jest/globals';
import { AuthController } from '../src/auth/auth.controller';

describe('AuthController', () => {
  it('register returns success true', async () => {
    const authService = {
      register: jest.fn(() => Promise.resolve()),
    } as any;

    const controller = new AuthController(authService);

    const result = await controller.register({
      username: 'useruser',
      password: '123456',
      firstName: 'user',
      lastName: 'user',
    });

    expect(authService.register).toHaveBeenCalledWith('useruser', '123456', 'user', 'user');
    expect(result).toEqual({ success: true });
  });

  it('login returns auth service payload', async () => {
    const authService = {
      login: jest.fn().mockReturnValue({ access_token: 'token' }),
    } as any;

    const controller = new AuthController(authService);

    const result = await controller.login({ user: { id: '1' } }, { username: 'useruser', password: '123456' });

    expect(authService.login).toHaveBeenCalledWith({ id: '1' });
    expect(result).toEqual({ access_token: 'token' });
  });
});
