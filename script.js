// script.js - Tournament Edition 2.0
import { speak as gSpeak } from './tts.js'; // if your bundler/host doesn't support import, use window.gameSpeak instead

// fallback if tts.js not imported as module
const speak = window.gameSpeak || function(t){ try{ const u=new SpeechSynthesisUtterance(t); u.lang='id-ID'; window.speechSynthesis.speak(u);}catch(e){} };

const trackEl = document.getElementById('track');
const commentatorEl = document.getElementById('commentator');
const roundLabel = document.getElementById('roundLabel');
const timerEl = document.getElementById('timer');
const playerCountEl = document.getElementById('playerCount');
const leaderboardEl = document.getElementById('leaderboard');

const bgMusic = document.getElementById('bgMusic');
const cheer = document.getElementById('cheer');
const engine = document.getElementById('engine');

let roundNumber = 0;
let players = []; // { username, taps, joinedAt, vip (bool), progress, finished }
const MAX_PLAYERS = 7;
const TAP_NEEDED = 10;
const ROUND_MS = 5 * 60 * 1000;

let roundActive = false;
let roundStartAt = 0;
let roundTimerId = null;
let pollInterval = null;

// helper create UI row
function createRow(username, vip=false){
  const row = document.createElement('div');
  row.className = 'row' + (vip ? ' vip' : '');
  const name = document.createElement('div'); name.className='name'; name.innerText = username;
  const bar = document.createElement('div'); bar.className='bar';
  const prog = document.createElement('div'); prog.className='progress';
  prog.style.width='0%';
  bar.appendChild(prog);
  row.appendChild(name); row.appendChild(bar);
  trackEl.appendChild(row);
  return { row, prog, name, bar };
}

// find player
function findPlayer(username){
  return players.find(p => p.username.toLowerCase() === username.toLowerCase());
}

// add player if taps enough
function tryAddFromTap(username){
  let p = findPlayer(username);
  if(p) return false;
  // count taps in temporary storage
  let taps = window.__tapCounts__ || (window.__tapCounts__ = {});
  taps[username] = (taps[username]||0) + 1;
  // update UI hint (optional)
  commentatorEl.innerText = `${username} tap ${taps[username]}/${TAP_NEEDED}`;
  if(taps[username] >= TAP_NEEDED){
    // join as normal
    taps[username] = 0;
    addPlayer(username, false);
    return true;
  }
  return false;
}

function addPlayer(username, vip=false){
  if(findPlayer(username)) return;
  if(players.length >= MAX_PLAYERS && !vip){
    // cannot add non-vip if full
    speak(`${username}, arena sudah penuh. Coba lagi nanti.`);
    return;
  }
  if(players.length >= MAX_PLAYERS && vip){
    // find oldest non-vip to replace
    const nonVipIndex = players.findIndex(p => !p.vip);
    if(nonVipIndex !== -1){
      const removed = players.splice(nonVipIndex,1)[0];
      // remove UI
      if(removed.ui && removed.ui.row) removed.ui.row.remove();
      speak(`${removed.username} digeser dari arena oleh VIP ${username}.`);
    } else {
      // all are VIP — cannot replace
      speak(`Arena sudah penuh oleh VIP. ${username} masuk ke antrian.`);
      // optionally queue — for simplicity we ignore queue
      return;
    }
  }

  const ui = createRow(username, vip);
  const p = { username, taps:0, joinedAt:Date.now(), vip:!!vip, progress:0, finished:false, ui };
  players.push(p);
  updatePlayerCount();
  speak(`${username} bergabung${vip ? ' sebagai VIP!' : '!'}`);
  commentatorEl.innerText = `${username} masuk arena ${vip ? ' (VIP)' : ''}`;
  cheer.play();

  // if enough players and not active -> start countdown then round
  if(!roundActive && players.length >= MAX_PLAYERS){
    startCountdownAndRound();
  }
}

// update player count UI
function updatePlayerCount(){
  playerCountEl.innerText = players.length;
}

// per-tick update
function step(){
  if(!roundActive) return;
  // update progress randomly scaled by vip
  players.forEach(p => {
    if(p.finished) return;
    const delta = (p.vip ? (2 + Math.random()*6) : (1 + Math.random()*3));
    p.progress += delta;
    const pct = Math.min(100, (p.progress / 1000) * 100); // normalize
    p.ui.prog.style.width = pct + '%';
    if(p.progress >= 1000){ p.finished = true; speak(`${p.username} mencapai finish!`); }
  });
  updateLeaderboard();
}

// update leaderboard UI
function updateLeaderboard(){
  const sorted = players.slice().sort((a,b)=>b.progress - a.progress).slice(0,3);
  leaderboardEl.innerHTML = '';
  for(let i=0;i<3;i++){
    const li = document.createElement('li');
    const item = sorted[i];
    li.innerText = item ? `${item.username} (${Math.floor(item.progress)})` : '—';
    leaderboardEl.appendChild(li);
  }
}

// countdown then start round
function startCountdownAndRound(){
  roundNumber++;
  roundLabel.innerText = `Ronde: ${roundNumber}`;
  speak(`Arena penuh! Ronde ${roundNumber} akan dimulai dalam 5 detik. Bersiap!`);
  commentatorEl.innerText = 'Ronde akan dimulai... 5';
  let c=5;
  const cd = setInterval(()=>{
    c--;
    commentatorEl.innerText = c>0 ? `Ronde akan dimulai... ${c}` : 'GO!';
    if(c<=0){
      clearInterval(cd);
      startRound();
    }
  },1000);
}

function startRound(){
  roundActive = true;
  roundStartAt = Date.now();
  speak('Balapan dimulai! Tap untuk mempercepat mobilmu!');
  bgMusic.play().catch(()=>{ /* require user gesture sometimes */ });
  // step every 300ms
  roundTimerId = setInterval(step, 300);
  // end after ROUND_MS
  setTimeout(endRound, ROUND_MS);
}

// end round
function endRound(){
  if(!roundActive) return;
  roundActive = false;
  clearInterval(roundTimerId);
  bgMusic.pause();
  cheer.play();
  // determine top 3
  const sorted = players.slice().sort((a,b)=>b.progress - a.progress);
  const top3 = sorted.slice(0,3);
  if(top3.length){
    const names = top3.map((p,i)=>`${i+1}. ${p.username}`).join(', ');
    speak(`Ronde selesai! Pemenang: ${names}`);
    commentatorEl.innerText = `Pemenang: ${names}`;
  } else {
    speak('Ronde selesai. Tidak ada pemenang.');
    commentatorEl.innerText = 'Ronde selesai.';
  }
  // confetti trigger
  triggerConfetti();
  // reset players after short delay
  setTimeout(()=>{ players.forEach(p=> p.ui.row.remove()); players = []; updatePlayerCount(); updateLeaderboard(); }, 8000);
}

// CONFETTI (simple)
const confettiCanvas = document.getElementById('confetti');
const cctx = confettiCanvas.getContext && confettiCanvas.getContext('2d');
confettiCanvas.width = innerWidth; confettiCanvas.height = innerHeight;
let confs = [];
function triggerConfetti(){
  for(let i=0;i<200;i++){
    confs.push({ x: Math.random()*confettiCanvas.width, y: -Math.random()*confettiCanvas.height, r: 4+Math.random()*6, c: `hsl(${Math.random()*360}, 100%, 60%)`, vy:2+Math.random()*4 });
  }
  animateConfetti();
}
function animateConfetti(){
  if(!cctx) return;
  cctx.clearRect(0,0,confettiCanvas.width, confettiCanvas.height);
  confs.forEach(f => { cctx.fillStyle = f.c; cctx.fillRect(f.x,f.y,f.r,f.r*0.6); f.y += f.vy; });
  confs = confs.filter(f => f.y < confettiCanvas.height+50);
  if(confs.length) requestAnimationFrame(animateConfetti);
}

// fetch events from server
async function pollEvents(){
  try {
    const res = await fetch('/api/lastEvent');
    if(!res.ok) return;
    const ev = await res.json();
    if(ev && ev.username){
      const uname = ev.username;
      const type = (ev.event || '').toLowerCase();
      const giftName = ev.gift || '';
      if(type === 'tap' || type === 'like' || type === 'interaction'){
        // count taps -> join after TAP_NEEDED
        tryAddFromTap(uname);
      } else if(type === 'gift' || giftName){
        const isMawar = /mawar|rose/i.test(giftName || '');
        if(isMawar){
          addPlayer(uname, true);
        } else {
          // treat as normal gift that gives boost if already in players
          const p = findPlayer(uname);
          if(p){
            p.progress += 50;
            speak(`${uname} mengirim gift! Dapat boost!`);
          } else {
            // optionally add to queue — for simplicity we don't auto-add non-mawar gifts
          }
        }
      }
    }
  } catch(e){ console.warn('poll err', e); }
}

// debugging simulate buttons
document.getElementById('btnSimTap').addEventListener('click', ()=> {
  const name = 'Viewer' + Math.floor(Math.random()*999);
  tryAddFromTap(name);
});
document.getElementById('btnSimGift').addEventListener('click', ()=> {
  const name = 'Gifter' + Math.floor(Math.random()*999);
  addPlayer(name, true);
});
document.getElementById('btnReset').addEventListener('click', ()=> {
  players.forEach(p=> p.ui.row.remove());
  players = [];
  updatePlayerCount();
  updateLeaderboard();
  speak('Game direset oleh host.');
});

// start polling
pollInterval = setInterval(pollEvents, 2500);
updateLeaderboard();
