let createClient;
try {
  ({ createClient } = require('@supabase/supabase-js'));
} catch (e) {
  console.warn('supabase-js not installed, using fetch fallback');
  createClient = (url, anon) => {
    const headers = {
      apikey: anon,
      Authorization: `Bearer ${anon}`,
      'Content-Type': 'application/json'
    };
    return {
      from(table) {
        return {
          select(columns = '*') {
            const params = new URLSearchParams({ select: columns });
            const baseUrl = `${url}/rest/v1/${table}?${params}`;
            const fetchData = async (finalUrl = baseUrl) => {
              const resp = await fetch(finalUrl, { headers });
              if (!resp.ok) {
                return { data: null, error: { message: await resp.text() } };
              }
              const data = await resp.json();
              return { data, error: null };
            };
            const builder = {
              eq(column, value) {
                params.append(column, `eq.${value}`);
                const eqUrl = `${url}/rest/v1/${table}?${params}`;
                return {
                  maybeSingle: async () => {
                    const { data, error } = await fetchData(eqUrl);
                    return { data: data[0] || null, error };
                  }
                };
              },
              limit(count) {
                params.append('limit', count);
                const limitUrl = `${url}/rest/v1/${table}?${params}`;
                return {
                  then(resolve, reject) {
                    fetchData(limitUrl).then(resolve, reject);
                  }
                };
              },
              then(resolve, reject) {
                fetchData().then(resolve, reject);
              }
            };
            return builder;
          },
          insert: async (payload) => {
            const resp = await fetch(`${url}/rest/v1/${table}`, {
              method: 'POST',
              headers,
              body: JSON.stringify(payload)
            });
            if (!resp.ok) {
              return { data: null, error: { message: await resp.text() } };
            }
            const data = await resp.json();
            return { data, error: null };
          }
        };
      }
    };
  };
}

try {
  require('dotenv').config();
} catch (e) {
  const fs = require('fs');
  const path = require('path');
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) process.env[match[1]] = match[2];
    }
  }
}

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON) {
  throw new Error('Vars SUPABASE_URL/SUPABASE_ANON ausentes do .env');
}
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON);
module.exports = supabase;
