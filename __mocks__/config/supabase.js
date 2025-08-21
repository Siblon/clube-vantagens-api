const seed = {
  clientes: [{ id: 1, email: 'a@a.com' }],
  planos: [
    { id: 1, nome: 'basico' },
    { id: 2, nome: 'premium' },
  ],
  assinaturas: [],
};

const __db = {
  clientes: [],
  planos: [],
  assinaturas: [],
};

const clone = (obj) => JSON.parse(JSON.stringify(obj));

const select = jest.fn();
const insert = jest.fn();
const update = jest.fn();
const del = jest.fn();
const eq = jest.fn();

const from = jest.fn((table) => {
  const filters = {};

  const run = () => {
    let rows = __db[table] ? clone(__db[table]) : [];
    Object.entries(filters).forEach(([col, val]) => {
      rows = rows.filter((r) => r[col] === val);
    });
    return { data: rows, error: null };
  };

  const query = {
    select: select.mockImplementation(() => {
      const result = run();
      const p = Promise.resolve(result);
      p.eq = eq.mockImplementation((col, value) => {
        filters[col] = value;
        return Promise.resolve(run());
      });
      return p;
    }),
    insert: insert.mockImplementation((arr) => {
      const payload = Array.isArray(arr) ? arr[0] : arr;
      const tableData = __db[table] || [];
      const id = tableData.length ? Math.max(...tableData.map((r) => r.id || 0)) + 1 : 1;
      const row = { id, ...payload };
      tableData.push(row);
      return Promise.resolve({ data: row, error: null });
    }),
    update: update.mockImplementation((payload) => ({
      eq: eq.mockImplementation((col, value) => {
        const tableData = __db[table] || [];
        const item = tableData.find((r) => r[col] === value);
        if (item) Object.assign(item, payload);
        return Promise.resolve({ data: item ? clone(item) : null, error: null });
      }),
    })),
    delete: del.mockImplementation(() => ({
      eq: eq.mockImplementation((col, value) => {
        const tableData = __db[table] || [];
        const index = tableData.findIndex((r) => r[col] === value);
        const removed = index >= 0 ? tableData.splice(index, 1)[0] : null;
        return Promise.resolve({ data: removed ? { id: removed.id } : null, error: null });
      }),
    })),
    eq: eq.mockImplementation((col, value) => {
      filters[col] = value;
      return query;
    }),
  };

  return query;
});

function __reset() {
  __db.clientes = clone(seed.clientes);
  __db.planos = clone(seed.planos);
  __db.assinaturas = clone(seed.assinaturas);
  from.mockClear();
  select.mockClear();
  insert.mockClear();
  update.mockClear();
  del.mockClear();
  eq.mockClear();
}

__reset();

const supabase = { from };

module.exports = {
  __db,
  __reset,
  from,
  insert,
  update,
  select,
  del,
  eq,
  supabase,
};

