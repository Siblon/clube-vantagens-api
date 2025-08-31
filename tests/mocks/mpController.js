module.exports = {
  checkout: (_req, res) => res.json({
    ok: true,
    init_point: 'https://mp.local/fake',
    preference_id: 'pref_test_123',
  }),
  webhook: (_req, res) => res.json({ ok: true })
};
