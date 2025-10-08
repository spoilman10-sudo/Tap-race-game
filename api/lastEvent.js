// api/lastEvent.js
// Pop & return one event (FIFO) for clients polling
let q = global.__EVENTS_QUEUE__ || (global.__EVENTS_QUEUE__ = []);

export default function handler(req, res) {
  try {
    const ev = q.shift() || null;
    res.setHeader('Content-Type','application/json');
    return res.status(200).json(ev || {});
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e) });
  }
}
