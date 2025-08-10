const supabase = require('../supabaseClient');
const PLANOS = { Essencial: 990, Platinum: 1990, Black: 2990 }; // em centavos (exemplo)
const onlyDigits = s => (String(s||'').match(/\d/g) || []).join('');
function addDays(d, n){ const x = new Date(d); x.setDate(x.getDate()+n); return x; }

let mpPkg = null;
function ensureMP(){
  if (mpPkg) return { ok:true, pkg: mpPkg, missing: [] };
  const missing = [];
  if (!process.env.MP_ACCESS_TOKEN) missing.push('MP_ACCESS_TOKEN');
  try {
    // eslint-disable-next-line global-require
    const mercadopago = require('mercadopago');
    mpPkg = mercadopago;
    if (process.env.MP_ACCESS_TOKEN) {
      mpPkg.configure({ access_token: process.env.MP_ACCESS_TOKEN });
    }
    return { ok: !!process.env.MP_ACCESS_TOKEN, pkg: mpPkg, missing };
  } catch (e) {
    missing.push('mercadopago_package');
    return { ok:false, pkg:null, missing };
  }
}

exports.status = (req,res) => {
  const st = ensureMP();
  const enabled = st.ok && !!process.env.MP_ACCESS_TOKEN;
  const missing = st.missing;
  return res.json({
    enabled,
    hasPackage: !missing.includes('mercadopago_package'),
    missing
  });
};

exports.createCheckout = async (req,res) => {
  const st = ensureMP();
  if (!st.ok) return res.status(503).json({ enabled:false, reason:'Mercado Pago não configurado', missing: st.missing });

  const { nome, cpf, email, plano, origem, success_url, failure_url, pending_url } = req.body || {};
  const cpfDigits = onlyDigits(cpf);
  if (!nome || !cpfDigits || cpfDigits.length !== 11) return res.status(400).json({ error:'Dados inválidos (nome/cpf)' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email||''))) return res.status(400).json({ error:'Email inválido' });
  if (!(plano in PLANOS)) return res.status(400).json({ error:'Plano inválido' });

  const amount = PLANOS[plano] / 100;
  const preference = {
    items: [{ title:`Assinatura ${plano} - Clube de Vantagens`, quantity:1, unit_price: amount, currency_id:'BRL' }],
    payer: { name: nome, email },
    external_reference: `${cpfDigits}-${Date.now()}`,
    back_urls: { success: success_url||'', failure: failure_url||'', pending: pending_url||'' },
    auto_return: 'approved',
    notification_url: `${process.env.PUBLIC_BASE_URL || ''}/mp/webhook`
  };

  try{
    const { body } = await st.pkg.preferences.create(preference);
    return res.json({ init_point: body.init_point, id: body.id, public_key: process.env.MP_PUBLIC_KEY || null });
  } catch(err){
    return res.status(502).json({ error:'Falha ao criar preferência', detail: err.message });
  }
};

exports.webhook = async (req,res) => {
  // Não derrubar o server mesmo sem MP
  const st = ensureMP();
  try{
    // suporte a múltiplas formas de entrega do MP; aceite 200 sempre
    const { query = {}, body = {} } = req;
    const topic = query.topic || query.type || body.type || '';
    const paymentId = query['data.id'] || (body?.data && body.data.id) || body.id;

    if (st.ok && topic.toLowerCase().includes('payment') && paymentId){
      try{
        const { body: pay } = await st.pkg.payment.findById(paymentId);
        if (pay && pay.status === 'approved'){
          const ext = String(pay.external_reference || '');
          const cpf = onlyDigits(ext.split('-')[0]) || onlyDigits(pay.payer?.identification?.number || '');
          const desc = (pay.description || pay.additional_info?.items?.[0]?.title || '').toString();
          let plano = 'Essencial';
          if (/Black/i.test(desc)) plano = 'Black';
          else if (/Platinum/i.test(desc)) plano = 'Platinum';

          if (cpf){
            await supabase.from('clientes').upsert({ cpf, nome: pay.payer?.first_name || 'Cliente', plano, status:'ativo' });
            await supabase.from('assinaturas').upsert({
              cpf, plano, status_pagamento:'em_dia', vencimento: addDays(new Date(), 30).toISOString()
            });
          }
        }
      }catch(e){}
    }
    return res.status(200).json({ ok:true });
  }catch(e){
    return res.status(200).json({ ok:true }); // sempre 200 para evitar reenvio infinito
  }
};

module.exports = { createCheckout: exports.createCheckout, webhook: exports.webhook, status: exports.status };
