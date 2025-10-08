// api/webhook.js
let eventsQueue = [];

/*
  Accepts:
  - GET with query: ?event=tap&user=Name&gift=...
  - POST with JSON body: { event: 'tap'|'gift', username: 'Name', gift: 'Mawar', amount: 1 }
*/
export default async function handler(req, res) {
  try {
    let payload = null;
    if (req.method === 'GET') {
      const { event, user, gift, amount } = req.query;
      if (event || user) payload = { event: event || 'unknown', username: user || req.query.username || null, gift: gift || null, amount: amount || 1, ts: Date.now() };
    } else if (req.method === 'POST') {
      const body = await req.json().catch(()=>null);
      if (body) payload = { event: body.event || body.type || 'unknown', username: body.username || body.user || body.userName || null, gift: body.gift || body.giftName || null, amount: body.amount || body.count || 1, ts: Date.now(), raw: body };
    }
    if (payload && payload.username) {
      // normalize gift name for matching
      if (payload.gift) payload.gift = String(payload.gift);
      eventsQueue.push(payload);
      console.log('Webhook queued:', payload);
    } else {
      console.log('Webhook received (ignored):', req.method, req.url);
    }
    res.setHeader('content-type','application/json');
    return res.status(200).send(JSON.stringify({ ok: true }));
  } catch (e) {
    console.error(e);
    res.status(500).send(JSON.stringify({ ok:false, error: String(e) }));
  }
}

// helper endpoint: /api/lastEvent
// Create a second file `api/lastEvent.js` which reads from the same module variable.
// (See instructions below — Vercel serverless reuses module scope in many cases.)
