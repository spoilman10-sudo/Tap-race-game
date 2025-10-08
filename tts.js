// tts.js — helper speak() that prefers male Indonesian voice if available
let TTS_VOICE = null;
function initVoices(){
  const voices = window.speechSynthesis.getVoices ? window.speechSynthesis.getVoices() : [];
  if(!voices || voices.length===0) return;
  // Prefer a male-sounding Indonesian voice if possible (best-effort)
  const malePref = voices.find(v => /id|indonesia/i.test(v.lang) && /male|pak|male/i.test(v.name));
  const generalId = voices.find(v => /id|indonesia/i.test(v.lang));
  TTS_VOICE = malePref || generalId || voices[0];
}
window.speechSynthesis.onvoiceschanged = initVoices;
initVoices();

export function speak(text, opts = {}){
  try {
    if(!text) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'id-ID';
    u.rate = opts.rate || 1.02;
    u.pitch = opts.pitch || 1.0;
    if(TTS_VOICE) u.voice = TTS_VOICE;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch(e){ console.warn('TTS fail', e); }
}

// convenience global
window.gameSpeak = speak;
