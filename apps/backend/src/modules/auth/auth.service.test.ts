import { describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service';

describe('AuthService anonymousLogin', () => {
  it('prunes stale guest users before creating a new anonymous account', async () => {
    const deleteMany = vi.fn().mockResolvedValue({ count: 3 });
    const create = vi.fn().mockResolvedValue({
      id: 'guest-1',
      phone: null,
      role: 'STUDENT',
    });
    const signAsync = vi.fn().mockResolvedValue('signed-token');

    const service = new AuthService(
      {
        user: { deleteMany, create },
      } as never,
      {} as never,
      { signAsync } as never,
      {} as never,
    );

    const result = await service.anonymousLogin();

    expect(deleteMany).toHaveBeenCalledTimes(1);
    expect(deleteMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        phone: null,
        role: 'STUDENT',
        printJobs: { none: {} },
        payments: { none: {} },
        notifications: { none: {} },
        auditLogs: { none: {} },
      }),
    });
    expect(create).toHaveBeenCalledWith({ data: { role: 'STUDENT' } });
    expect(signAsync).toHaveBeenCalledWith({ sub: 'guest-1', role: 'STUDENT' });
    expect(result).toEqual({
      token: 'signed-token',
      user: { id: 'guest-1', phone: null, role: 'STUDENT' },
    });
  });

  it('still issues a guest login when cleanup fails', async () => {
    const deleteMany = vi.fn().mockRejectedValue(new Error('db unavailable'));
    const create = vi.fn().mockResolvedValue({
      id: 'guest-2',
      phone: null,
      role: 'STUDENT',
    });
    const signAsync = vi.fn().mockResolvedValue('signed-token');

    const service = new AuthService(
      {
        user: { deleteMany, create },
      } as never,
      {} as never,
      { signAsync } as never,
      {} as never,
    );

    const result = await service.anonymousLogin();

    expect(deleteMany).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledTimes(1);
    expect(result.user.id).toBe('guest-2');
  });
});
