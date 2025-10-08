// Ganti URL di bawah dengan WebSocket IndoFinity kamu nanti:
const SOCKET_URL = "wss://indofinity.id/socket-demo";
const socket = new WebSocket(SOCKET_URL);

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const statusText = document.getElementById("status");
const commentator = document.getElementById("commentator");

let players = [];
let raceStarted = false;
let timer = null;

// Simulasi audio komentator (text-to-speech)
function speak(text) {
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "id-ID";
  speechSynthesis.speak(utter);
}

// Jalankan game 5 menit per ronde
function startRace() {
  if (raceStarted) return;
  raceStarted = true;
  speak("Balapan dimulai! Ayo tap terus untuk maju!");

  timer = setTimeout(() => {
    raceStarted = false;
    const winner = players.sort((a, b) => b.progress - a.progress)[0];
    speak(`Ronde selesai! Pemenangnya adalah ${winner.name}!`);
    statusText.textContent = `🏁 Pemenang: ${winner.name}`;
  }, 5 * 60 * 1000); // 5 menit
}

function drawRace() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  players.forEach((p, i) => {
    ctx.fillStyle = p.color;
    ctx.fillRect(p.progress, i * 40 + 10, 50, 20);
    ctx.fillText(p.name, 10, i * 40 + 25);
  });
}

socket.onmessage = (msg) => {
  const data = JSON.parse(msg.data);

  // Player join
  if (data.type === "join") {
    players.push({
      id: data.id,
      name: data.name,
      color: data.color || `hsl(${Math.random() * 360}, 100%, 50%)`,
      progress: 0
    });
    speak(`${data.name} bergabung dalam balapan!`);
    statusText.textContent = `${players.length} pemain bergabung`;

    if (players.length >= 7 && !raceStarted) {
      speak("Cukup 7 pemain! Balapan akan dimulai!");
      startRace();
    }
  }

  // Player tap (gerak)
  if (data.type === "tap" && raceStarted) {
    const player = players.find(p => p.id === data.id);
    if (player) {
      player.progress += 10;
      drawRace();
    }
  }
};

function updateLoop() {
  drawRace();
  requestAnimationFrame(updateLoop);
}
updateLoop();
