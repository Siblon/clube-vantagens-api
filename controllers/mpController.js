const mercadopago = require('mercadopago');
const crypto = require('crypto');
mercadopago.configure({ access_token: process.env.MP_ACCESS_TOKEN });
const supabase = require('../supabaseClient');
const PLANOS = { Essencial: 990, Platinum: 1990, Black: 2990 }; // valores em centavos

const onlyDigits = s => (String(s || '').match(/\d/g) || []).join('');
function addDays(d, n){ const x = new Date(d); x.setDate(x.getDate()+n); return x; }
function isEmail(s){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s||'')); }

exports.createCheckout = async (req, res) => {
  try {
    const { nome, cpf, email, plano, origem } = req.body || {};
    const nomeClean = (nome || '').toString().trim();
    const cpfClean = onlyDigits(cpf);
    const emailClean = (email || '').toString().trim();
    const errors = [];
    if (!nomeClean) errors.push('nome obrigatório');
    if (cpfClean.length !== 11) errors.push('cpf inválido');
    if (!PLANOS[plano]) errors.push('plano inválido');
    if (!isEmail(emailClean)) errors.push('email inválido');
    if (errors.length) return res.status(400).json({ error: errors.join(', ') });

    const amount = PLANOS[plano] / 100;
    const preference = {
      items: [{ title: `Assinatura ${plano} - Clube de Vantagens`, quantity: 1, unit_price: amount, currency_id: 'BRL' }],
      payer: { name: nomeClean, email: emailClean },
      external_reference: `${cpfClean}-${Date.now()}`,
      back_urls: { success: req.body.success_url || '', failure: req.body.failure_url || '', pending: req.body.pending_url || '' },
      auto_return: 'approved',
      notification_url: `${process.env.PUBLIC_BASE_URL || ''}/mp/webhook`
    };
    const { body } = await mercadopago.preferences.create(preference);

    // upsert lead se tabela existir
    try {
      await supabase.from('leads').upsert({ nome: nomeClean, cpf: cpfClean, email: emailClean, plano, origem: origem || null, status: 'aguardando_pagamento' }, { onConflict: 'cpf' });
    } catch (e) {
      console.warn('Falha ao upsert lead:', e.message);
    }

    return res.json({ init_point: body.init_point, id: body.id, public_key: process.env.MP_PUBLIC_KEY });
  } catch (err) {
    console.error('Erro createCheckout:', err);
    return res.status(500).json({ error: 'erro interno' });
  }
};

exports.webhook = async (req, res) => {
  try {
    const signature = req.headers['x-signature'];
    const requestId = req.headers['x-request-id'];
    const raw = req.body; // Buffer por causa do express.raw
    if (process.env.MP_WEBHOOK_SECRET) {
      const expected = crypto.createHmac('sha256', process.env.MP_WEBHOOK_SECRET).update(raw).digest('hex');
      if (signature !== expected) {
        console.warn('Assinatura inválida', { signature, expected, requestId });
        return res.status(400).send('invalid signature');
      }
    } else {
      console.log('Webhook recebido sem validação', { signature, requestId });
    }

    let json = {};
    try { json = JSON.parse(raw.toString('utf8')); } catch (e) {}
    const paymentId = req.query.id || req.query['data.id'] || (json.data && json.data.id);
    if (!paymentId) return res.sendStatus(200);

    const { body: payment } = await mercadopago.payment.findById(paymentId);
    if (payment && payment.status === 'approved') {
      const external_reference = payment.external_reference || '';
      const cpf = onlyDigits(external_reference.split('-')[0]);
      let plano = 'Essencial';
      const desc = payment.description || '';
      const itemTitle = (payment.additional_info && payment.additional_info.items && payment.additional_info.items[0] && payment.additional_info.items[0].title) || '';
      const join = `${desc} ${itemTitle}`;
      if (/platinum/i.test(join)) plano = 'Platinum';
      else if (/black/i.test(join)) plano = 'Black';
      await supabase.from('clientes').upsert({ cpf, nome: 'Cliente', plano, status: 'ativo' });
      await supabase.from('assinaturas').upsert({ cpf, plano, status_pagamento: 'em_dia', vencimento: addDays(new Date(), 30).toISOString() });
    }
  } catch (err) {
    console.error('Erro webhook MP:', err);
  }
  return res.sendStatus(200);
};
