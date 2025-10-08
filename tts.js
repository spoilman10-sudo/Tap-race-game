// tts.js — prefer male Indonesian voice if available; expose window.gameSpeak
(function(){
  let TTS_VOICE = null;
  function initVoices(){
    const voices = window.speechSynthesis.getVoices ? window.speechSynthesis.getVoices() : [];
    if(!voices || voices.length===0) return;
    // try to find Indonesian voice and prefer male-like names
    const indonesian = voices.find(v => /id|indonesia/i.test(v.lang));
    const malePref = voices.find(v => /id|indonesia/i.test(v.lang) && /male|Pak|Mas|Paul|Adam|Tomas|Arman/i.test(v.name));
    TTS_VOICE = malePref || indonesian || voices[0];
  }
  window.speechSynthesis.onvoiceschanged = initVoices;
  initVoices();

  function speak(text, opts = {}){
    try{
      if(!text) return;
      // require user gesture unlock audio on mobile; caller must prompt user
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'id-ID';
      u.rate = opts.rate || 1.02;
      u.pitch = opts.pitch || 1.0;
      if(TTS_VOICE) u.voice = TTS_VOICE;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    }catch(e){ console.warn('TTS error', e); }
  }

  window.gameSpeak = speak;
})();
