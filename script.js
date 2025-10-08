// script.js — Tournament rules implementation (polls /api/lastEvent)
(function(){
  const track = document.getElementById('track');
  const roundNumEl = document.getElementById('roundNum');
  const timerEl = document.getElementById('timer');
  const playerCountEl = document.getElementById('playerCount');
  const leaderboardEl = document.getElementById('leaderboard');
  const confettiCanvas = document.getElementById('confetti');

  const bgMusic = document.getElementById('bgMusic');
  const cheer = document.getElementById('cheer');
  const engine = document.getElementById('engine');

  const MAX_PLAYERS = 7;
  const TAP_NEEDED = 10;
  const ROUND_MS = 5 * 60 * 1000;

  let players = []; // { username, taps, joinedAt, vip, progress, finished, ui }
  let tapCounts = {}; // temporary taps before join
  let roundActive = false;
  let roundStart = 0;
  let roundTimer = null;
  let roundNumber = 0;

  // confetti setup
  confettiCanvas.width = confettiCanvas.clientWidth || window.innerWidth;
  confettiCanvas.height = confettiCanvas.clientHeight || window.innerHeight;
  const confCtx = confettiCanvas.getContext ? confettiCanvas.getContext('2d') : null;
  let confettiParts = [];

  // helper: create UI row inside track
  function createRow(username, vip){
    const row = document.createElement('div');
    row.className = 'row' + (vip ? ' vip' : '');
    // position rows vertically spaced along left side; compute top based on current players count (stack)
    const index = players.length;
    const top = 40 + index * 90; // spacing
    row.style.top = top + 'px';

    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.textContent = username.slice(0,2).toUpperCase();

    const info = document.createElement('div');
    info.className = 'info';
    const name = document.createElement('div');
    name.className = 'name';
    name.innerText = username;
    const tag = document.createElement('div');
    tag.className = 'tag';
    tag.innerText = vip ? 'VIP (Mawar)' : 'Player';

    info.appendChild(name);
    info.appendChild(tag);

    const bar = document.createElement('div');
    bar.className = 'bar';
    const prog = document.createElement('div');
    prog.className = 'progress';
    bar.appendChild(prog);

    row.appendChild(avatar);
    row.appendChild(info);
    row.appendChild(bar);

    track.appendChild(row);
    return { row, prog, name, tag };
  }

  function findPlayer(username){
    return players.find(p => p.username.toLowerCase() === username.toLowerCase());
  }

  function updatePlayerCount(){
    playerCountEl.innerText = players.length;
  }

  function speak(text){
    try { window.gameSpeak && window.gameSpeak(text); } catch(e){ console.warn('speak err', e); }
  }

  // Add player with VIP logic & replacement
  function addPlayer(username, isVip){
    if(findPlayer(username)) return;
    if(players.length >= MAX_PLAYERS && !isVip){
      speak(`${username}, arena sudah penuh. Coba lagi nanti.`);
      return;
    }
    if(players.length >= MAX_PLAYERS && isVip){
      // replace oldest non-vip
      const idx = players.findIndex(p => !p.vip);
      if(idx !== -1){
        const removed = players.splice(idx,1)[0];
        // remove UI
        if(removed.ui && removed.ui.row) removed.ui.row.remove();
        speak(`${removed.username} digeser dari arena oleh VIP ${username}.`);
      } else {
        speak(`Arena penuh oleh VIP. ${username} masuk ke antrian (tidak diproses).`);
        return;
      }
    }

    const ui = createRow(username, isVip);
    const p = { username, taps:0, joinedAt:Date.now(), vip:!!isVip, progress:0, finished:false, ui };
    players.push(p);
    updatePlayerCount();
    speak(`${username} bergabung${isVip ? ' sebagai VIP!' : '!'}`);
    cheer.play().catch(()=>{});
    // if enough players, start countdown->round
    if(!roundActive && players.length >= MAX_PLAYERS){
      startCountdown();
    }
  }

  // handle tap counting: join after TAP_NEEDED taps
  function handleTap(username){
    if(findPlayer(username)){
      // if already in players, give progress boost
      const p = findPlayer(username);
      if(roundActive && !p.finished){
        p.progress += p.vip ? 12 : 6;
        p.ui.prog.style.width = Math.min(100, (p.progress/1000)*100) + '%';
        engine.play().catch(()=>{});
      }
      return;
    }
    tapCounts[username] = (tapCounts[username]||0) + 1;
    const count = tapCounts[username];
    speak(`${username} tap ${count}/${TAP_NEEDED}`);
    if(count >= TAP_NEEDED){
      tapCounts[username] = 0;
      addPlayer(username, false);
    }
  }

  // start countdown and then start round
  function startCountdown(){
    roundNumber++;
    roundNumEl.innerText = roundNumber;
    let c = 5;
    speak(`Arena penuh. Ronde ${roundNumber} dimulai dalam 5 detik. Siap-siap!`);
    const interval = setInterval(()=>{
      if(c>0){
        document.getElementById('timer').innerText = `Mulai dalam ${c}s`;
        c--;
      } else {
        clearInterval(interval);
        startRound();
      }
    },1000);
  }

  function startRound(){
    roundActive = true;
    roundStart = Date.now();
    speak('Balapan dimulai! Gas pol!');
    try { bgMusic.play().catch(()=>{}); } catch(e){}
    // tick
    roundTimer = setInterval(()=> {
      // progress step
      players.forEach(p=>{
        if(p.finished) return;
        const delta = p.vip ? (4 + Math.random()*8) : (1 + Math.random()*4);
        p.progress += delta;
        const pct = Math.min(100, (p.progress/1000)*100);
        p.ui.prog.style.width = pct + '%';
        if(p.progress >= 1000 && !p.finished){
          p.finished = true;
          speak(`${p.username} melewati garis finish!`);
        }
      });
      updateLeaderboard();
      // timer display
      const elapsed = Date.now() - roundStart;
      const rem = Math.max(0, Math.floor((ROUND_MS - elapsed)/1000));
      const m = Math.floor(rem/60), s = rem%60;
      timerEl.innerText = `${m}:${String(s).padStart(2,'0')}`;
      if(elapsed >= ROUND_MS){
        endRound();
      }
    }, 400);
  }

  function updateLeaderboard(){
    const top = players.slice().sort((a,b)=>b.progress - a.progress).slice(0,3);
    leaderboardEl.innerHTML = '';
    for(let i=0;i<3;i++){
      const li = document.createElement('li');
      const item = top[i];
      li.innerText = item ? `${i+1}. ${item.username} (${Math.floor(item.progress)})` : '—';
      leaderboardEl.appendChild(li);
    }
  }

  function endRound(){
    if(!roundActive) return;
    roundActive = false;
    clearInterval(roundTimer);
    bgMusic.pause();
    cheer.play().catch(()=>{});
    const ranking = players.slice().sort((a,b)=>b.progress - a.progress);
    if(ranking.length){
      const top3 = ranking.slice(0,3).map((p,i)=>`${i+1}. ${p.username}`).join(', ');
      speak(`Ronde selesai! Top tiga: ${top3}`);
      // show confetti
      triggerConfetti();
      // cleanup UI after short delay
      setTimeout(()=> {
        players.forEach(p => { p.ui && p.ui.row && p.ui.row.remove(); });
        players = [];
        updatePlayerCount();
        updateLeaderboard();
        timerEl.innerText = '—';
      },8000);
    } else {
      speak('Ronde selesai. Tidak ada pemenang.');
    }
  }

  // confetti simple animation
  function triggerConfetti(){
    if(!confCtx) return;
    confettiParts = [];
    for(let i=0;i<200;i++){
      confettiParts.push({ x: Math.random()*confettiCanvas.width, y: -Math.random()*confettiCanvas.height, r: 4+Math.random()*6, c: `hsl(${Math.random()*360},100%,60%)`, vy:2+Math.random()*4 });
    }
    (function loop(){
      confCtx.clearRect(0,0,confettiCanvas.width, confettiCanvas.height);
      confettiParts.forEach(p=>{
        confCtx.fillStyle = p.c;
        confCtx.fillRect(p.x, p.y, p.r, p.r*0.6);
        p.y += p.vy;
      });
      confettiParts = confettiParts.filter(p=>p.y < confettiCanvas.height+50);
      if(confettiParts.length) requestAnimationFrame(loop);
    })();
  }

  // Poll server for events
  async function poll(){
    try {
      const res = await fetch('/api/lastEvent');
      if(!res.ok) return;
      const ev = await res.json();
      if(ev && ev.username){
        const u = ev.username;
        const type = (ev.event || '').toLowerCase();
        const giftName = ev.gift || '';
        if(type === 'tap' || type === 'like' || type === 'interaction') {
          handleTap(u);
        } else if(type === 'gift' || giftName){
          const isMawar = /mawar|rose/i.test(String(giftName||''));
          if(isMawar) addPlayer(u, true);
          else {
            // non-mawar gift: if player exists, give boost
            const p = findPlayer(u);
            if(p){
              p.progress += 80;
              speak(`${u} memberikan gift, mendapat boost!`);
            }
          }
        } else {
          // fallback: treat as tap
          handleTap(u);
        }
      }
    } catch(e){ console.warn('poll err', e); }
  }

  // debug buttons
  document.getElementById('simTap').addEventListener('click', ()=> {
    const name = 'V' + Math.floor(Math.random()*9000);
    handleTap(name);
  });
  document.getElementById('simGift').addEventListener('click', ()=> {
    const name = 'G' + Math.floor(Math.random()*9000);
    addPlayer(name, true);
  });
  document.getElementById('resetBtn').addEventListener('click', ()=>{
    players.forEach(p=> p.ui.row.remove());
    players = []; tapCounts = {}; updatePlayerCount(); updateLeaderboard();
    speak('Game direset.');
  });

  // initial UI
  updatePlayerCount();
  updateLeaderboard();

  // start polling every 1.8s
  setInterval(poll, 1800);

  // user gesture to enable audio on mobile
  document.body.addEventListener('click', function once(){ 
    try { bgMusic.play().catch(()=>{}); } catch(e){}
    document.body.removeEventListener('click', once);
  });

})();
