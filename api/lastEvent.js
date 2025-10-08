// api/lastEvent.js
// This file reads & pops one event from queue stored in the same server module instance.
// note: must be in same deployment and same module scope for queue to persist.

import { createRequire } from "module";
const require = createRequire(import.meta.url);

// Attempt to access the eventsQueue stored in webhook module instance.
// Because each file is its own module, the easiest cross-file approach is to
// load webhook module and read its module-level variable. However Vercel may
// instantiate each module separately - in practice for quick live use this works.
let eventsQueueRef = global.__EVENTS_QUEUE__;

if(!eventsQueueRef) {
  // fallback: dynamic import of webhook and share global
  try {
    const w = await import('./webhook.js');
    // webhook.js stores into module-level variable; but we'll set shared global:
  } catch(e){ /* ignore */ }
  if(!global.__EVENTS_QUEUE__) global.__EVENTS_QUEUE__ = [];
  eventsQueueRef = global.__EVENTS_QUEUE__;
}

export default function handler(req, res) {
  try {
    const ev = eventsQueueRef.shift() || null;
    res.setHeader('content-type','application/json');
    return res.status(200).json(ev || {});
  } catch(e){
    return res.status(500).json({error:String(e)});
  }
      }
