process.env.NODE_ENV = 'test';

jest.mock('../supabaseClient', () => ({
  supabase: {},
  assertSupabase: () => ({})
}));

jest.mock('../middlewares/requireAdminPin', () => (req, res, next) => {
  const pin = req.header('x-admin-pin');
  if (!pin) return res.status(401).json({ ok:false, error:'missing_admin_pin' });
  if (pin !== '2468') return res.status(401).json({ ok:false, error:'invalid_pin' });
  req.adminId = 1;
  next();
});

jest.mock('../utils/generateClientIds', () =>
  jest.fn().mockResolvedValue({ scanned: 2, updated: 1 })
);

const request = require('supertest');
const app = require('../server');

const generateClientIds = require('../utils/generateClientIds');

describe('POST /admin/clientes/generate-ids', () => {
  test('requires valid PIN', async () => {
    const res = await request(app).post('/admin/clientes/generate-ids');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ ok: false, error: 'missing_admin_pin' });
  });

  test('returns stats when PIN is valid', async () => {
    const res = await request(app)
      .post('/admin/clientes/generate-ids')
      .set('x-admin-pin', '2468');
    expect(generateClientIds).toHaveBeenCalled();
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, scanned: 2, updated: 1 });
  });
});
