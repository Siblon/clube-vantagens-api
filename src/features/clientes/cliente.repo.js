// src/features/clientes/cliente.repo.js
const supabase = require('../../../supabaseClient.js');

function table() {
  return supabase.from('clientes');
}

/**
 * Busca cliente pelo ID.
 * Retorna o registro completo ou null se não encontrado.
 */
async function findById(id) {
  const { data, error } = await table()
    .select('id, nome, email, telefone, documento, cpf, plano, status, created_at, metodo_pagamento')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

/**
 * Busca cliente por e-mail.
 * Retorna o registro (inclui id) ou null se não encontrado.
 */
async function findByEmail(email) {
  if (!email) return null;
  const { data, error } = await table()
    .select('id, nome, email, telefone, documento, cpf')
    .eq('email', email)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

/**
 * Busca cliente por documento (CPF/CNPJ).
 * Primeiro tenta a coluna `documento`; se não achar, faz fallback para a coluna legada `cpf`.
 * Retorna o registro (inclui id) ou null se não encontrado.
 */
async function findByDocumento(doc) {
  if (!doc) return null;

  // 1) documento (modelo novo)
  const { data, error } = await table()
    .select('id, nome, email, telefone, documento, cpf')
    .eq('documento', doc)
    .maybeSingle();

  if (!error && data) return data;

  // 2) cpf (legado)
  const resp2 = await table()
    .select('id, nome, email, telefone, documento, cpf')
    .eq('cpf', doc)
    .maybeSingle();

  if (resp2.error) throw resp2.error;
  return resp2.data || null;
}

/**
 * Cria um cliente e retorna o registro criado.
 */
async function create(cliente) {
  const { data, error } = await table()
    .insert(cliente)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

module.exports = {
  findById,
  findByEmail,
  findByDocumento,
  create,
};
