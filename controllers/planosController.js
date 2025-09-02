const supabase = require('../services/supabase');

// Lista pública: nomes de planos ativos
exports.publicList = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('planos')
      .select('nome')
      .eq('ativo', true)
      .order('prioridade', { ascending: false })
      .order('nome', { ascending: true });
    if (error) throw error;
    return res.json({ ok: true, planos: (data || []).map(p => p.nome) });
  } catch (err) { next(err); }
};

// Lista admin com paginação e filtro q (ilike no nome)
exports.adminList = async (req, res, next) => {
  try {
    const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 20));
    const offset = Math.max(0, Number(req.query.offset) || 0);
    const q = (req.query.q || '').trim();

    let query = supabase
      .from('planos')
      .select('id, nome, desconto_percent, preco_centavos, ativo, prioridade, updated_at', { count: 'exact' })
      .order('prioridade', { ascending: false })
      .order('nome', { ascending: true })
      .range(offset, offset + limit - 1);

    if (q) query = query.ilike('nome', `%${q}%`);

    const { data, error, count } = await query;
    if (error) throw error;
    return res.json({ ok: true, rows: data || [], total: count || 0 });
  } catch (err) { next(err); }
};

// Criação
exports.create = async (req, res, next) => {
  try {
    const { nome, desconto_percent, ativo = true, prioridade = 0, preco_centavos = 0 } = req.body || {};
    if (!nome || typeof nome !== 'string') return res.status(400).json({ ok:false, error:'nome obrigatório' });
    const pct = Number(desconto_percent);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) return res.status(400).json({ ok:false, error:'desconto_percent inválido' });

    const { data, error } = await supabase
      .from('planos')
      .insert({ nome: nome.trim(), desconto_percent: pct, ativo: !!ativo, prioridade: Number(prioridade)||0, preco_centavos: Number(preco_centavos)||0 })
      .select()
      .single();

    if (error) throw error;
    return res.json({ ok:true, data });
  } catch (err) { next(err); }
};

// Update por :id
exports.update = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ ok:false, error:'id inválido' });

    const patch = {};
    if ('nome' in req.body) patch.nome = String(req.body.nome || '').trim();
    if ('desconto_percent' in req.body) {
      const pct = Number(req.body.desconto_percent);
      if (!Number.isFinite(pct) || pct < 0 || pct > 100) return res.status(400).json({ ok:false, error:'desconto_percent inválido' });
      patch.desconto_percent = pct;
    }
    if ('ativo' in req.body) patch.ativo = !!req.body.ativo;
    if ('prioridade' in req.body) patch.prioridade = Number(req.body.prioridade)||0;
    if ('preco_centavos' in req.body) patch.preco_centavos = Number(req.body.preco_centavos)||0;

    if (Object.keys(patch).length === 0) return res.status(400).json({ ok:false, error:'nada para atualizar' });

    const { data, error } = await supabase
      .from('planos')
      .update(patch)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return res.json({ ok:true, data });
  } catch (err) { next(err); }
};

// Delete por :id (apaga apenas se não houver clientes usando)
exports.remove = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ ok: false, error: 'id inválido' });
    }

    // 1) Busca o plano
    const { data: plano, error: e1 } = await supabase
      .from('planos')
      .select('id, nome')
      .eq('id', id)
      .single();
    if (e1) return next(e1);
    if (!plano) return res.status(404).json({ ok: false, error: 'plano não encontrado' });

    // 2) Verifica se há clientes usando esse plano (nome em clientes.plano)
    const { count, error: e2 } = await supabase
      .from('clientes')
      .select('*', { count: 'exact', head: true })
      .eq('plano', plano.nome);
    if (e2) return next(e2);

    if ((count ?? 0) > 0) {
      return res.status(409).json({
        ok: false,
        error: 'PLANO_EM_USO',
        detalhes: { clientes: count, nome: plano.nome },
        dica: 'Use /admin/planos/rename para migrar clientes para outro plano (update_clientes=true) ou apenas inative (PATCH ativo=false).'
      });
    }

    // 3) Pode apagar
    const { error: e3 } = await supabase.from('planos').delete().eq('id', id);
    if (e3) return next(e3);

    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
};

// Rename (opcionalmente propaga para clientes)
exports.rename = async (req, res, next) => {
  try {
    const from = String(req.body?.from || '').trim();
    const to   = String(req.body?.to   || '').trim();
    const updClients = !!req.body?.update_clientes;
    if (!from || !to) return res.status(400).json({ ok:false, error:'from/to obrigatórios' });

    // Renomeia plano
    const { error: e1 } = await supabase.from('planos').update({ nome: to }).eq('nome', from);
    if (e1) throw e1;

    // Propaga em clientes, se pedido
    if (updClients) {
      const { error: e2 } = await supabase.from('clientes').update({ plano: to }).eq('plano', from);
      if (e2) throw e2;
    }
    return res.json({ ok:true });
  } catch (err) { next(err); }
};
