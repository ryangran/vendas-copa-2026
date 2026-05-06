const { getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  const reply = (body, status = 200) => ({
    statusCode: status,
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

  let store;
  try {
    store = getStore({
      name: 'copa',
      siteID: 'c826e503-7f85-4d6f-b429-2d83afd187df',
      token: process.env.NETLIFY_API_TOKEN,
      consistency: 'strong',
    });
  } catch (e) {
    return reply({ error: 'Blobs indisponível: ' + e.message }, 503);
  }

  try {
    if (event.httpMethod === 'GET') {
      const key = (event.queryStringParameters || {}).key || 'orders';
      const value = await store.get(key, { type: 'text' });
      return reply(value !== null ? value : 'null');
    }

    if (event.httpMethod === 'POST') {
      const { key, data } = JSON.parse(event.body || '{}');
      if (!key) return reply({ error: 'key obrigatório' }, 400);
      await store.set(key, JSON.stringify(data));
      return reply({ ok: true });
    }

    return reply({ error: 'Método não permitido' }, 405);
  } catch (e) {
    return reply({ error: e.message }, 500);
  }
};
