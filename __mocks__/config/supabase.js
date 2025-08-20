module.exports = {
  supabase: {
    from: () => ({
      select: () => ({ data: [], error: null }),
      insert: () => ({ data: [{ id: 1 }], error: null }),
      update: () => ({ data: [{ id: 1 }], error: null }),
      delete: () => ({ data: [{ id: 1 }], error: null }),
      eq: () => ({ data: [{ id: 1 }], error: null })
    })
  }
};
