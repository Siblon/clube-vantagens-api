const request = require('supertest');

const mockSelect = jest.fn().mockResolvedValue({ data: [], error: null });
const mockFrom = jest.fn(() => ({ select: mockSelect }));

jest.mock('../services/supabase', () => ({ from: mockFrom }));

describe('security and rate limit', () => {
  beforeEach(() => {
    jest.resetModules();
    mockFrom.mockReset();
    mockSelect.mockReset();
    mockFrom.mockReturnValue({ select: mockSelect });
    delete process.env.RATE_LIMIT_MAX;
  });

  test('requests without x-admin-pin are rejected', async () => {
    const app = require('../server');
    const res = await request(app).get('/admin/transacoes');
    expect(res.status).toBe(401);
  });

  test('invalid PIN logs and returns 401', async () => {
    mockFrom.mockImplementationOnce(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    }));
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const app = require('../server');
    const res = await request(app)
      .get('/admin/transacoes')
      .set('x-admin-pin', '0000');
    expect(res.status).toBe(401);
    expect(warn).toHaveBeenCalledWith(
      '[PIN_INVALID]',
      expect.objectContaining({ path: '/admin/transacoes' })
    );
    warn.mockRestore();
  });

  test('rate limit triggers 429', async () => {
    process.env.RATE_LIMIT_MAX = '2';
    const app = require('../server');
    await request(app).get('/health');
    await request(app).get('/health');
    const res = await request(app).get('/health');
    expect(res.status).toBe(429);
  });
});
