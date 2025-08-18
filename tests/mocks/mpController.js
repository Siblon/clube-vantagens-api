const express = require('express');
const r = express.Router();

r.post('/checkout', (req, res) => {
  return res.status(200).json({ init_point: 'https://mp.local/fake' });
});

r.post('/webhook', (req, res) => res.sendStatus(204));

module.exports = r;
