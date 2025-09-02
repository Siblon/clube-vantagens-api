const { createPreference, getPayment } = require('../lib/mp');
const logAdminAction = require('../utils/logAdminAction');
const supabase = require('../services/supabase');

exports.checkout = async (req, res, next) => {
  try {
    const { cpf, valor, titulo } = req.body;
    if (!cpf || !valor) {
      return res.status(400).json({ ok: false, error: 'cpf_e_valor_obrigatorios' });
    }

    const pref = await createPreference({
      title: titulo || 'Assinatura Clube de Vantagens',
      description: `Cobrança para CPF ${cpf}`,
      amount: Number(valor),
      external_reference: cpf
    });

    await supabase.from('transacoes').insert({
      cpf,
      mp_payment_id: null,
      mp_status: 'init',
      valor: Number(valor),
      metodo: 'pix',
      raw: pref
    });

    await logAdminAction({
      route: '/admin/mp/checkout',
      action: 'create',
      adminId: req.adminId,
      adminNome: req.adminNome,
      pinHash: req.adminPinHash,
      clientCpf: cpf,
      payload: { valor }
    });

    return res.json({ ok: true, init_point: pref.init_point, sandbox_init_point: pref.sandbox_init_point, preference_id: pref.id });
  } catch (err) {
    return next(err);
  }
};

// webhook público chamado pelo MP
exports.webhook = async (req, res, next) => {
  try {
    const { type, data } = req.body || {};
    if (type !== 'payment' || !data || !data.id) {
      return res.json({ ok: true, ignored: true });
    }

    const payment = await getPayment(data.id);

    const cpf = payment?.external_reference || null;
    const status = payment?.status || 'unknown';
    const metodo = payment?.payment_method_id || null;
    const valor = payment?.transaction_amount || null;

    await supabase.from('transacoes').insert({
      cpf,
      mp_payment_id: String(payment.id),
      mp_status: status,
      valor,
      metodo,
      raw: payment
    });

    if (cpf && status === 'approved') {
      await supabase
        .from('clientes')
        .update({ pagamento_em_dia: true, status: 'ativo', metodo_pagamento: metodo || 'pix' })
        .eq('cpf', cpf);
    }

    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
};
