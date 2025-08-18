const express = require('express');
const r = express.Router();

// Simula criação de checkout
r.post('/checkout', (req, res) => {
  return res.status(200).json({
    init_point: 'https://mp.local/fake',
    preference_id: 'pref_test_123',
  });
});

// Simula webhook OK
r.post('/webhook', (req, res) => res.sendStatus(204));

// Endpoint de status opcional (se o real tiver)
r.get('/status', (req, res) => res.json({ ok: true, mocked: true }));

module.exports = r;
