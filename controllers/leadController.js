let supabase;
try {
  ({ supabase } = require('config/supabase'));
} catch (_e) {
  ({ supabase } = require('../config/supabase'));
}
const { assertSupabase } = supabase;
const PLANOS = new Set(['Mensal', 'Semestral', 'Anual']);
const onlyDigits = s => (String(s||'').match(/\d/g) || []).join('');
function isEmail(s){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s||'')); }

// simple in-memory rate limit: 5 requests per 5min per IP
const rateData = {};

exports.publicCreate = async (req, res, next) => {
  try {
    if (!assertSupabase(res)) return;
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const arr = rateData[ip] || [];
    const recent = arr.filter(t => now - t < 5 * 60 * 1000);
    recent.push(now);
    rateData[ip] = recent;
    if (recent.length > 5) {
      const err = new Error('rate limit');
      err.status = 429;
      return next(err);
    }

    const { nome, cpf, email, telefone, plano, origem, token } = req.body || {};
    const nomeClean = (nome || '').toString().trim();
    const cpfClean = onlyDigits(cpf);
    const emailClean = email ? String(email).trim() : null;
    const telClean = telefone ? onlyDigits(telefone) : null;

    const errors = [];
    if (!nomeClean) errors.push('nome obrigatório');
    if (cpfClean.length !== 11) errors.push('cpf inválido');
    if (!PLANOS.has(plano)) errors.push('plano inválido');
    if (emailClean && !isEmail(emailClean)) errors.push('email inválido');
    if (errors.length) {
      const err = new Error(errors.join(', '));
      err.status = 400;
      return next(err);
    }

    if (process.env.RECAPTCHA_SECRET && token) {
      try {
        const params = new URLSearchParams();
        params.set('secret', process.env.RECAPTCHA_SECRET);
        params.set('response', token);
        params.set('remoteip', ip);
        const resp = await fetch('https://www.google.com/recaptcha/api/siteverify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString(),
        });
        const json = await resp.json();
        if (!json.success) {
          const err = new Error('recaptcha inválido');
          err.status = 400;
          return next(err);
        }
      } catch (e) {
        const err = new Error('falha recaptcha');
        err.status = 400;
        return next(err);
      }
    }

    const { data, error } = await supabase
      .from('leads')
      .insert([{ nome: nomeClean, cpf: cpfClean, email: emailClean, telefone: telClean, plano, origem: origem || null, status: 'novo' }])
      .select('id')
      .single();

    if (error) return next(error);
    return res.json({ ok: true, id: data.id });
  } catch (err) {
    return next(err);
  }
};

exports.adminList = async (req, res, next) => {
  try {
    if (!assertSupabase(res)) return;
    const { status, plano, q, limit = 100, offset = 0 } = req.query;
    const lim = Math.min(parseInt(limit, 10) || 100, 1000);
    const off = parseInt(offset, 10) || 0;
    let query = supabase.from('leads').select('*', { count: 'exact' });
    if (status) query = query.eq('status', status);
    if (plano) query = query.eq('plano', plano);
    if (q) {
      const like = `%${q.trim()}%`;
      query = query.or(`nome.ilike.${like},email.ilike.${like},telefone.ilike.${like},cpf.ilike.${like}`);
    }
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(off, off + lim - 1);
    if (error) return next(error);
    return res.json({ rows: data, total: count || 0 });
  } catch (err) {
    return next(err);
  }
};

exports.adminExportCsv = async (req, res, next) => {
  try {
    if (!assertSupabase(res)) return;
    const { status, plano, q, limit = 1000, offset = 0 } = req.query;
    const lim = Math.min(parseInt(limit, 10) || 1000, 10000);
    const off = parseInt(offset, 10) || 0;
    let query = supabase
      .from('leads')
      .select('id,created_at,nome,cpf,email,telefone,plano,origem,status');
    if (status) query = query.eq('status', status);
    if (plano) query = query.eq('plano', plano);
    if (q) {
      const like = `%${q.trim()}%`;
      query = query.or(`nome.ilike.${like},email.ilike.${like},telefone.ilike.${like},cpf.ilike.${like}`);
    }
    const { data, error } = await query
      .order('created_at', { ascending: false })
      .range(off, off + lim - 1);
    if (error) return next(error);
    const header = 'id,created_at,nome,cpf,email,telefone,plano,origem,status';
    const lines = (data || []).map(r => {
      return [r.id, r.created_at, r.nome, r.cpf, r.email || '', r.telefone || '', r.plano, r.origem || '', r.status]
        .map(v => '"' + String(v || '').replace(/"/g, '""') + '"')
        .join(',');
    });
    const csv = [header, ...lines].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="leads.csv"');
    return res.send(csv);
  } catch (err) {
    return next(err);
  }
};

exports.adminApprove = async (req, res, next) => {
  try {
    if (!assertSupabase(res)) return;
    const { id, plano } = req.body || {};
    if (!id) {
      const err = new Error('id obrigatório');
      err.status = 400;
      return next(err);
    }
    const { data: lead, error: leadErr } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .single();
    if (leadErr || !lead) {
      const err = new Error('lead não encontrado');
      err.status = 404;
      return next(err);
    }
    const finalPlano = plano || lead.plano;
    if (!PLANOS.has(finalPlano)) {
      const err = new Error('plano inválido');
      err.status = 400;
      return next(err);
    }
    const upsert = { cpf: lead.cpf, nome: lead.nome, plano: finalPlano, status: 'ativo' };
    const { error: upsertErr } = await supabase.from('clientes').upsert(upsert, { onConflict: 'cpf' });
    if (upsertErr) return next(upsertErr);
    const { error: updErr } = await supabase.from('leads').update({ status: 'aprovado', plano: finalPlano }).eq('id', id);
    if (updErr) return next(updErr);
    return res.json({ ok: true, cliente: { cpf: lead.cpf, nome: lead.nome, plano: finalPlano } });
  } catch (err) {
    return next(err);
  }
};

exports.adminDiscard = async (req, res, next) => {
  try {
    if (!assertSupabase(res)) return;
    const { id, notes } = req.body || {};
    if (!id) {
      const err = new Error('id obrigatório');
      err.status = 400;
      return next(err);
    }
    const { error } = await supabase
      .from('leads')
      .update({ status: 'descartado', notes: notes || null })
      .eq('id', id);
    if (error) return next(error);
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
};
