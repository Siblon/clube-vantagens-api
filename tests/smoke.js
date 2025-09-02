process.env.NODE_ENV = 'test';
process.env.ADMIN_PIN = '2468';

const supabase = require('../services/supabase');
// mock supabase chain
supabase.from = () => ({
  insert: () => ({
    select: () => ({
      single: async () => ({ data: { id: 1 }, error: null })
    })
  })
});

const request = require('supertest');
const app = require('../server');

async function main(){
  const health = await request(app).get('/health');
  if(health.status !== 200 || !health.body?.ok){
    throw new Error('health failed');
  }
  const noPin = await request(app).post('/admin/clientes').send({ nome:'Test', email:'t@t.com' });
  if(noPin.status !== 401){
    throw new Error('pin check failed');
  }
  const withPin = await request(app)
    .post('/admin/clientes')
    .set('x-admin-pin','2468')
    .send({ nome:'Test', email:'t@t.com' });
  if(withPin.status !== 201 || !withPin.body?.ok){
    throw new Error('admin create failed');
  }
  console.log('smoke ok');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
