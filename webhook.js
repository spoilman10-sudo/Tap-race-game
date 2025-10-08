// api/webhook.js
// Accept GET query or POST JSON and queue event into global queue for polling by client
let q = global.__EVENTS_QUEUE__ || (global.__EVENTS_QUEUE__ = []);

export default async function handler(req, res) {
  try {
    let payload = null;
    if (req.method === 'GET') {
      const { event, user, gift, username } = req.query;
      if (user || username) {
        payload = {
          event: event || 'tap',
          username: user || username,
          gift: gift || null,
          ts: Date.now()
        };
      }
    } else if (req.method === 'POST') {
      const body = await req.json().catch(()=>null);
      if (body) {
        payload = {
          event: body.event || body.type || 'unknown',
          username: body.username || body.user || body.userName || body.from || null,
          gift: body.gift || body.giftName || null,
          raw: body,
          ts: Date.now()
        };
      }
    }

    if (payload && payload.username) {
      // normalize
      payload.username = String(payload.username);
      if (payload.gift) payload.gift = String(payload.gift);
      q.push(payload);
      console.log('Queued event', payload);
    } else {
      console.log('Ignored webhook (no username):', req.method, req.url);
    }

    res.setHeader('Content-Type','application/json');
    return res.status(200).send(JSON.stringify({ ok:true }));
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok:false, error: String(err) });
  }
}
