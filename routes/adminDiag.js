const express = require('express');
const router = express.Router();
const { supabase } = require('../utils/supabaseClient');

router.get('/diag/env', (req, res) => {
  res.json({
    ok: true,
    env: {
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      SUPABASE_ANON: !!process.env.SUPABASE_ANON,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      NODE_ENV: process.env.NODE_ENV || null,
    }
  });
});

router.get('/diag/db', async (req, res) => {
  try {
    const { data, error } = await supabase.from('admins').select('id, nome').limit(1);
    if (error) {
      console.error('[diag/db] supabase error', error);
      return res.status(503).json({ ok:false, error:'db_error', details: error.message || error });
    }
    res.json({ ok:true, sample: data });
  } catch (err) {
    console.error('[diag/db] unexpected', err);
    res.status(500).json({ ok:false, error:'unexpected' });
  }
});

module.exports = router;

