const eq = jest.fn();

const insert = jest.fn((payloadArr) => {
  const arr = Array.isArray(payloadArr) ? payloadArr : [payloadArr];
  const data = arr.map((payload, index) => ({ id: index + 1, ...payload }));
  return { data, error: null };
});

const update = jest.fn((payload) => ({
  eq: (col, id) => {
    eq(col, id);
    return { data: [{ id, ...payload }], error: null };
  },
}));

const del = jest.fn(() => ({
  eq: (col, id) => {
    eq(col, id);
    return { data: [{ id }], error: null };
  },
}));

const supabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({ data: [], error: null })),
    insert: (arr) => insert(arr),
    update: (payload) => update(payload),
    delete: () => del(),
    eq: (col, val) => {
      eq(col, val);
      return { data: [], error: null };
    },
  })),
};

function __reset() {
  supabase.from.mockReset();
  insert.mockReset();
  update.mockReset();
  del.mockReset();
  eq.mockReset();
}

module.exports = { supabase, insert, update, eq, __reset };
