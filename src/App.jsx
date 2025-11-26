// src/App.jsx
import React, { useEffect, useRef, useState } from "react";

/* ---------- SAMPLE KUIS (Arduino & Sensor — 15 Soal, Bahasa Indonesia) ---------- */
const SAMPLE_QUIZ = {
  id: "arduino-sensors-1",
  title: "Arduino & Sensor — Kuis (15 Soal)",
  questions: [
    { id: 1, text: "Pin Arduino manakah yang biasanya digunakan untuk input sensor analog?", choices: ["Pin Digital PWM", "Pin Analog (A0-A5)", "Pin Ground", "Pin VCC"], answer: 1, time: 20 },
    { id: 2, text: "Sensor apa yang digunakan untuk mengukur suhu?", choices: ["Sensor Ultrasonik", "Sensor PIR", "DHT11/DHT22", "IR Receiver"], answer: 2, time: 18 },
    { id: 3, text: "Sensor mana yang mengukur jarak menggunakan gelombang suara?", choices: ["Sensor Cahaya", "Sensor Ultrasonik", "Sensor Gas", "Sensor Fleksibel"], answer: 1, time: 18 },
    { id: 4, text: "Modul apa yang digunakan untuk mendeteksi gerakan manusia?", choices: ["LDR", "Sensor PIR", "MQ-2", "BMP180"], answer: 1, time: 15 },
    { id: 5, text: "Apa fungsi potensiometer ketika digunakan pada Arduino?", choices: ["Output digital on/off", "Menghasilkan tegangan analog yang dapat diubah", "Mengukur suhu", "Mengirim sinyal nirkabel"], answer: 1, time: 15 },
    { id: 6, text: "Sensor apa yang digunakan untuk mendeteksi intensitas cahaya?", choices: ["Sensor Ultrasonik", "LDR (Light Dependent Resistor)", "DHT11", "HC-SR04"], answer: 1, time: 15 },
    { id: 7, text: "Bagaimana sensor gas MQ mendeteksi adanya gas?", choices: ["Mengirim sinyal HIGH ketika ada gas", "Mengeluarkan tegangan analog sesuai konsentrasi gas", "Mematikan Arduino", "Mengubah alamat I2C"], answer: 1, time: 20 },
    { id: 8, text: "Protokol komunikasi apa yang digunakan banyak sensor digital seperti modul I2C?", choices: ["PWM", "SPI", "I2C", "UART"], answer: 2, time: 15 },
    { id: 9, text: "Apa fungsi resistor pull-down saat membaca tombol?", choices: ["Memberikan kondisi LOW saat tidak ditekan", "Menaikkan tegangan", "Menghilangkan noise", "Memberi daya pada tombol"], answer: 0, time: 15 },
    { id: 10, text: "Modul mana yang digunakan untuk mengukur tekanan udara?", choices: ["BMP180/BMP280", "Sensor PIR", "Servo", "Sensor Ultrasonik"], answer: 0, time: 18 },
    { id: 11, text: "Apa arti PWM dan mengapa digunakan?", choices: ["Pulse Width Modulation — mensimulasikan output analog dari pin digital", "Pulse Width Modulation — mengukur suhu", "Peripheral Wire Module — untuk sensor", "Power Watt Management — untuk baterai"], answer: 0, time: 20 },
    { id: 12, text: "Sensor apa yang dapat mendeteksi api atau nyala?", choices: ["Sensor Api (berbasis IR)", "Sensor Kelembaban Tanah", "LDR", "DHT11"], answer: 0, time: 15 },
    { id: 13, text: "Berapa tegangan umum untuk sensor Arduino UNO?", choices: ["3.3V saja", "12V", "5V (atau 3.3V untuk beberapa modul)", "24V"], answer: 2, time: 12 },
    { id: 14, text: "Sensor apa yang digunakan untuk mengukur kelembaban tanah?", choices: ["Sensor Kelembaban Tanah", "HC-SR04", "MQ-7", "Sensor PIR"], answer: 0, time: 15 },
    { id: 15, text: "Perangkat apa yang mengubah gerakan rotasi menjadi posisi sudut untuk umpan balik?", choices: ["Sensor Ultrasonik", "Encoder", "DHT22", "Relay"], answer: 1, time: 18 }
  ]
};

/* ---------- Responsive CSS injection ---------- */
const responsiveStyles = `
/* container */
.app-container { width: 100%; max-width: 1100px; margin: 0 auto; padding: 20px; box-sizing: border-box; font-family: Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; color: #0f172a; }

/* header */
.header-row { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom: 18px; }
.logo { width:44px; height:44px; border-radius:10px; object-fit:cover; }
.title { font-size:18px; font-weight:700; }
.subtitle { font-size:12px; color:#6b7280; }

/* grid */
.grid-2col { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; align-items: start; }

/* UI blocks */
.card { background: #fff; border-radius: 14px; padding: 16px; box-shadow: 0 6px 18px rgba(15,23,42,0.06); }
.stats-row { display:flex; gap:12px; margin-bottom: 16px; justify-content:center; }

/* form */
.btn { padding: 10px 14px; border-radius: 10px; cursor: pointer; border: 1px solid transparent; background:#111827; color:#fff; box-sizing: border-box; }
.btn.secondary { background: transparent; color: #111827; border-color: #e5e7eb; }
.input { padding: 10px; border-radius: 8px; border: 1px solid #e5e7eb; box-sizing: border-box; }

/* question choices */
.choice-btn { padding: 12px; border-radius: 10px; border: 1px solid #e5e7eb; text-align:left; background:#fff; cursor:pointer; }
.choice-btn[disabled] { cursor: default; opacity: 0.95; }

/* footer */
.footer { font-size:13px; color:#6b7280; margin-top: 18px; text-align: center; }

/* small screens */
@media (max-width: 900px) {
  .grid-2col { grid-template-columns: 1fr; }
  .header-row { flex-direction: column; align-items: flex-start; gap: 10px; }
  .stats-row { grid-template-columns: repeat(3,1fr); }
}

/* mobile */
@media (max-width: 420px) {
  .title { font-size: 16px; }
  .btn { width: 100%; padding: 12px; font-size: 15px; }
  .input { width: 100%; padding: 12px; font-size: 15px; }
  .stats-row { flex-direction: column; gap: 8px; }
  .choice-grid { grid-template-columns: 1fr !important; }
}
`;

/* ---------- Helpers ---------- */
const genId = () => Math.random().toString(36).slice(2, 8).toUpperCase();
const initials = (name = "") => (name || "").split(" ").map(s => s[0] || "").slice(0, 2).join("").toUpperCase();

/* ---------- Firebase dynamic loader ---------- */
function useFirebase() {
  const dbRef = useRef(null);
  const appRef = useRef(null);
  const readyRef = useRef(false);
  const init = async () => {
    if (readyRef.current) return { app: appRef.current, db: dbRef.current };
    try {
      const { initializeApp } = await import("firebase/app");
      const { getDatabase } = await import("firebase/database");
      const cfg = {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID,
        databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL
      };
      const app = initializeApp(cfg);
      const db = getDatabase(app);
      appRef.current = app;
      dbRef.current = db;
      readyRef.current = true;
      return { app, db };
    } catch (e) {
      console.warn("Firebase init failed", e);
      return {};
    }
  };
  return { init, appRef, dbRef };
}

/* ---------- App Component (full) ---------- */
export default function App() {
  const fb = useFirebase();
  const [inited, setInited] = useState(false);

  // Room & user
  const [roomId, setRoomId] = useState("");
  const [roomData, setRoomData] = useState(null);
  const [playerName, setPlayerName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [playerId, setPlayerId] = useState(null);
  const [isHost, setIsHost] = useState(false);

  // Answer & timer
  const [localAnswer, setLocalAnswer] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef(null);

  // UI, background, audio
  const [dark, setDark] = useState(false);
  const bgRef = useRef(null);

  // audio refs
  const lobbyAudioRef = useRef(null);
  const questionBgmRef = useRef(null);
  const audioAllowedRef = useRef(false);

  /* inject responsive CSS once */
  useEffect(() => {
    if (!document.getElementById("app-responsive-styles")) {
      const s = document.createElement("style");
      s.id = "app-responsive-styles";
      s.innerHTML = responsiveStyles;
      document.head.appendChild(s);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await fb.init();
      setInited(true);
    })();
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  /* ---------- Room listener (if joined) ---------- */
  useEffect(() => {
    if (!inited || !roomId) return;
    let stop = false;
    (async () => {
      try {
        const { ref, onValue } = await import("firebase/database");
        const rRef = ref(fb.dbRef.current, `rooms/${roomId}`);
        onValue(rRef, (snap) => {
          if (stop) return;
          setRoomData(snap.exists() ? snap.val() : null);
        });
      } catch (e) {
        console.warn("room listener err", e);
      }
    })();
    return () => {
      stop = true;
      clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [inited, roomId]);

  /* ---------- presence ---------- */
  useEffect(() => {
    if (!inited || !roomId || !playerId) return;
    (async () => {
      try {
        const { ref, set, onDisconnect } = await import("firebase/database");
        const pRef = ref(fb.dbRef.current, `rooms/${roomId}/players/${playerId}/connected`);
        await set(pRef, true);
        onDisconnect(pRef).set(false);
      } catch (e) {
        console.warn("presence err", e);
      }
    })();
  }, [inited, roomId, playerId]);

  /* ---------- audio init & control ---------- */
  useEffect(() => {
    try {
      lobbyAudioRef.current = new Audio("https://assets.mixkit.co/music/preview/mixkit-happy-ukulele-219.mp3");
      lobbyAudioRef.current.loop = true;
      lobbyAudioRef.current.volume = 0.28;
      questionBgmRef.current = new Audio("https://assets.mixkit.co/music/preview/mixkit-electronic-ambient-1106.mp3");
      questionBgmRef.current.loop = true;
      questionBgmRef.current.volume = 0.12;
    } catch (e) {
      console.warn("audio init failed", e);
    }

    const resume = () => {
      audioAllowedRef.current = true;
      try { lobbyAudioRef.current && lobbyAudioRef.current.play().catch(()=>{}); } catch(e){}
      try { questionBgmRef.current && questionBgmRef.current.play().catch(()=>{}); } catch(e){}
      window.removeEventListener("pointerdown", resume);
    };
    window.addEventListener("pointerdown", resume, { once: true });

    return () => {
      try { lobbyAudioRef.current && lobbyAudioRef.current.pause(); } catch(e){}
      try { questionBgmRef.current && questionBgmRef.current.pause(); } catch(e){}
      window.removeEventListener("pointerdown", resume);
    };
  }, []);

  useEffect(() => {
    const state = roomData && roomData.state;
    if (!audioAllowedRef.current) return;
    try {
      if (state === "lobby") {
        questionBgmRef.current && (questionBgmRef.current.pause(), questionBgmRef.current.currentTime = 0);
        lobbyAudioRef.current && lobbyAudioRef.current.play().catch(()=>{});
      } else if (state === "question") {
        lobbyAudioRef.current && (lobbyAudioRef.current.pause(), lobbyAudioRef.current.currentTime = 0);
        questionBgmRef.current && questionBgmRef.current.play().catch(()=>{});
      } else {
        lobbyAudioRef.current && (lobbyAudioRef.current.pause(), lobbyAudioRef.current.currentTime = 0);
        questionBgmRef.current && (questionBgmRef.current.pause(), questionBgmRef.current.currentTime = 0);
      }
    } catch (e) { /* ignore */ }
  }, [roomData && roomData.state]);

  /* ---------- background parallax ---------- */
  useEffect(() => {
    const el = bgRef.current;
    if (!el) return;
    const onMove = (e) => {
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      el.style.backgroundPosition = `${50 + (x - 50) / 10}% ${50 + (y - 50) / 10}%`;
      el.style.transform = `scale(1.02) translate(${(x - 50) / 50}px, ${(y - 50) / 50}px)`;
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  /* ---------- CRUD: create/join/leave/start/next ---------- */
  const createRoom = async () => {
    if (!inited) return alert("Firebase belum siap");
    const id = genId();
    try {
      const { ref, set } = await import("firebase/database");
      const rRef = ref(fb.dbRef.current, `rooms/${id}`);
      const initial = { meta: { title: SAMPLE_QUIZ.title }, quiz: SAMPLE_QUIZ, state: "lobby", currentIndex: 0, players: {}, answers: {} };
      await set(rRef, initial);
      setRoomId(id);
      setIsHost(true);
    } catch (e) {
      console.error("createRoom err", e);
    }
  };

  const joinRoom = async (code, name) => {
    if (!inited) return alert("Firebase belum siap");
    if (!code || !name) return alert("Masukkan kode room dan nama");
    try {
      const { ref, set } = await import("firebase/database");
      const pid = Math.random().toString(36).slice(2, 9);
      const pRef = ref(fb.dbRef.current, `rooms/${code}/players/${pid}`);
      await set(pRef, { name, score: 0, connected: true });
      setPlayerId(pid);
      setPlayerName(name);
      setRoomId(code);
      setIsHost(false);
      setJoinCode("");
    } catch (e) {
      console.error("joinRoom err", e);
      alert("Gagal gabung - cek kode room");
    }
  };

  const leaveRoom = async () => {
    if (!inited || !roomId) return;
    try {
      const { ref, remove } = await import("firebase/database");
      if (playerId) {
        const pRef = ref(fb.dbRef.current, `rooms/${roomId}/players/${playerId}`);
        await remove(pRef);
      }
      setRoomId("");
      setRoomData(null);
      setPlayerId(null);
      setIsHost(false);
      setLocalAnswer(null);
    } catch (e) { console.error(e); }
  };

  const startQuiz = async () => {
    if (!inited || !roomId) return;
    try {
      const { ref, update } = await import("firebase/database");
      const rRef = ref(fb.dbRef.current, `rooms/${roomId}`);
      await update(rRef, { state: "question", currentIndex: 0, answers: {} });
    } catch (e) { console.error("startQuiz err", e); }
  };

  const nextQuestion = async () => {
    if (!inited || !roomId || !roomData) return;
    try {
      const { ref, update } = await import("firebase/database");
      const idx = roomData.currentIndex || 0;
      const quiz = roomData.quiz || SAMPLE_QUIZ;
      const q = quiz.questions[idx];
      if (!q) return;

      const answers = roomData.answers || {};
      const updates = {};

      // normalize choices and award points
      Object.entries(answers).forEach(([pid, rawChoice]) => {
        const choice = typeof rawChoice === "number" ? rawChoice : Number(rawChoice);
        if (Number.isNaN(choice)) return;
        const correct = choice === q.answer;
        if (correct) {
          const cur = (roomData.players && roomData.players[pid] && Number(roomData.players[pid].score)) || 0;
          updates[`players/${pid}/score`] = cur + 100;
        }
      });

      const nextIdx = idx + 1;
      const newState = nextIdx >= quiz.questions.length ? "finished" : "question";
      updates["currentIndex"] = nextIdx;
      updates["answers"] = {};
      updates["state"] = newState;

      const rRef = ref(fb.dbRef.current, `rooms/${roomId}`);
      await update(rRef, updates);
      setLocalAnswer(null);
    } catch (e) {
      console.error("nextQuestion err", e);
    }
  };

  /* ---------- Timer: restart only when question state or index changes ---------- */
  useEffect(() => {
    if (!roomData) return;
    const state = roomData.state;
    const idx = roomData.currentIndex || 0;
    if (state !== "question") {
      setTimeLeft(0);
      clearInterval(timerRef.current);
      return;
    }
    const quiz = roomData.quiz || SAMPLE_QUIZ;
    const q = quiz.questions[idx];
    if (!q) return;
    setTimeLeft(q.time);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          if (isHost) nextQuestion();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [roomData && roomData.state, roomData && roomData.currentIndex]);

  useEffect(() => {
    if (!roomData) return;
    setLocalAnswer(null);
  }, [roomData && roomData.currentIndex]);

  /* ---------- submitAnswer: lock on first click, write to DB, play SFX ---------- */
  const submitAnswer = async (choice) => {
    if (localAnswer !== null) return; // locked
    if (!inited || !roomId || !playerId) return alert("Silakan gabung room terlebih dahulu.");
    setLocalAnswer(choice);

    // local correctness
    const quiz = roomData?.quiz || SAMPLE_QUIZ;
    const idx = roomData?.currentIndex || 0;
    const correctIndex = quiz.questions[idx].answer;

    // play SFX
    try {
      if (choice === correctIndex) {
        const ch = new Audio("https://assets.mixkit.co/sfx/preview/mixkit-positive-notification-951.mp3");
        ch.volume = 0.6; ch.play().catch(()=>{});
      } else {
        const ch = new Audio("https://assets.mixkit.co/sfx/preview/mixkit-player-losing-or-failing-2042.mp3");
        ch.volume = 0.6; ch.play().catch(()=>{});
      }
    } catch (e) {}

    try {
      const { ref, set } = await import("firebase/database");
      const aRef = ref(fb.dbRef.current, `rooms/${roomId}/answers/${playerId}`);
      await set(aRef, choice);
    } catch (e) {
      console.error("submitAnswer err", e);
    }
  };

  /* ---------- UI components ---------- */
  const Header = () => (
    <div className="header-row">
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <img className="logo" src="/logo.jpg" alt="Logo" />
        <div>
          <div className="title">QuizLive</div>
          <div className="subtitle">Kuis kelas secara real-time</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button className="btn secondary" onClick={() => setDark(d => !d)} style={{ background: dark ? "#111827" : "transparent", color: dark ? "#fff" : "#111827" }}>{dark ? "Gelap" : "Terang"}</button>
        <button className="btn secondary" onClick={() => { lobbyAudioRef.current && lobbyAudioRef.current.pause(); questionBgmRef.current && questionBgmRef.current.pause(); }}>Mute</button>
      </div>
    </div>
  );

  const Stats = ({ players }) => {
    const numPlayers = Object.keys(players || {}).length;
    const numQ = (roomData && roomData.quiz && roomData.quiz.questions.length) || SAMPLE_QUIZ.questions.length;
    const avg = (() => {
      const ps = Object.values(players || {});
      if (!ps.length) return 0;
      return Math.round(ps.reduce((s, p) => s + (p.score || 0), 0) / ps.length);
    })();
    return (
      <div className="stats-row">
        <div style={{ minWidth: 120, textAlign: "center" }} className="card">
          <div style={{ fontSize: 12, color: "#6b7280" }}>Peserta</div>
          <div style={{ fontWeight: 700, fontSize: 20 }}>{numPlayers}</div>
        </div>
        <div style={{ minWidth: 120, textAlign: "center" }} className="card">
          <div style={{ fontSize: 12, color: "#6b7280" }}>Soal</div>
          <div style={{ fontWeight: 700, fontSize: 20 }}>{numQ}</div>
        </div>
        <div style={{ minWidth: 120, textAlign: "center" }} className="card">
          <div style={{ fontSize: 12, color: "#6b7280" }}>Rata-rata Skor</div>
          <div style={{ fontWeight: 700, fontSize: 20 }}>{avg}</div>
        </div>
      </div>
    );
  };

  const PlayerList = ({ players }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {Object.entries(players || {}).map(([pid, p]) => (
        <div key={pid} style={{ display: "flex", justifyContent: "space-between", padding: 8, borderRadius: 8, background: "#fff" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: "#e0e7ff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>{initials(p.name)}</div>
            <div>
              <div style={{ fontWeight: 600 }}>{p.name}</div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>{p.connected ? "online" : "offline"}</div>
            </div>
          </div>
          <div style={{ fontWeight: 700 }}>{p.score || 0}</div>
        </div>
      ))}
    </div>
  );

  const QuestionCard = ({ q }) => {
    const idx = roomData?.currentIndex || 0;
    const correctIndex = roomData?.quiz?.questions?.[idx]?.answer;
    const pct = q && q.time ? (timeLeft / q.time) * 100 : 0;
    return (
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{q.text}</div>
          <div style={{ color: "#6b7280" }}>{timeLeft}s</div>
        </div>

        <div style={{ height: 10, background: "#f1f5f9", borderRadius: 10, overflow: "hidden", marginBottom: 12 }}>
          <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg,#34d399,#fbbf24)" }} />
        </div>

        <div className="choice-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {q.choices.map((choiceText, i) => {
            const selected = localAnswer === i;
            const isCorrect = correctIndex === i;
            let bg = "#fff";
            if (localAnswer !== null) {
              if (selected && isCorrect) bg = "#dcfce7"; // green
              else if (selected && !isCorrect) bg = "#fee2e2"; // red
              else if (isCorrect) bg = "#ecfdf5"; // reveal correct
              else bg = "#fafafa";
            } else {
              bg = "#fff";
            }
            return (
              <button
                key={i}
                onClick={() => submitAnswer(i)}
                disabled={localAnswer !== null}
                className="choice-btn"
                style={{ background: bg }}
              >
                <div style={{ fontWeight: 600 }}>{String.fromCharCode(65 + i)}. {choiceText}</div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  /* ---------- Layout ---------- */
  const rootStyle = { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 28, background: dark ? "#0f172a" : "#f8fafc" };
  const containerStyle = { width: "100%", maxWidth: 1100, zIndex: 10 };

  return (
    <div style={rootStyle}>
      {/* interactive blurred background */}
      <div
        ref={bgRef}
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "url('https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1950&q=80')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(14px)",
          opacity: 0.38,
          transform: "scale(1)",
          transition: "transform 0.12s linear, background-position 0.12s linear",
          zIndex: -10
        }}
      />

      <div style={containerStyle} className="app-container">
        <Header />
        <Stats players={roomData ? roomData.players : {}} />

        {/* Lobby / Join */}
        {!roomId && (
          <div className="card" style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Buat atau gabung room live</h2>
            <p style={{ color: "#6b7280", marginBottom: 12 }}>Buat room dan bagikan kodenya. Peserta dapat bergabung dari perangkat mereka.</p>

            <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
              <button className="btn" onClick={createRoom} style={{ background: "#4f46e5" }}>Buat Room</button>
              <button className="btn secondary" onClick={() => { navigator.clipboard && navigator.clipboard.writeText(window.location.href); alert("Link aplikasi disalin"); }}>Bagikan Link Aplikasi</button>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <input className="input" placeholder="Nama Anda" value={playerName} onChange={(e) => setPlayerName(e.target.value)} />
              <input className="input" placeholder="Kode Room" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} style={{ width: 160 }} />
              <button className="btn" onClick={() => joinRoom(joinCode, playerName)} style={{ background: "#059669" }}>Gabung</button>
            </div>
          </div>
        )}

        {/* Room area */}
        {roomId && roomData && (
          <div className="grid-2col">
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>Ruangan</div>
                  <div style={{ fontSize: 20, fontWeight: 800 }}>{roomId}</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {isHost && <button className="btn" onClick={startQuiz} style={{ background: "#4f46e5" }}>Mulai</button>}
                  {isHost && <button className="btn secondary" onClick={nextQuestion}>Selanjutnya</button>}
                  <button className="btn secondary" onClick={leaveRoom}>Keluar</button>
                </div>
              </div>

              {/* Lobby */}
              {roomData.state === "lobby" && (
                <div className="card" style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                    <div>
                      <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Menunggu di lobi</h3>
                      <div style={{ color: "#6b7280" }}>Bagikan kode room kepada peserta</div>
                    </div>
                    <div style={{ fontFamily: "monospace", padding: "6px 10px", background: "#f3f4f6", borderRadius: 8 }}>{roomId}</div>
                  </div>
                  <PlayerList players={roomData.players} />
                </div>
              )}

              {/* Question */}
              {roomData.state === "question" && (
                <div style={{ marginBottom: 12 }}>
                  <QuestionCard q={roomData.quiz.questions[roomData.currentIndex]} />
                </div>
              )}

              {/* Finished */}
              {roomData.state === "finished" && (
                <div className="card">
                  <h3 style={{ fontSize: 18, fontWeight: 700 }}>Kuis Selesai</h3>
                  <div style={{ marginTop: 8 }}>
                    <PlayerList players={roomData.players} />
                  </div>
                </div>
              )}
            </div>

            {/* Right column */}
            <div>
              <div className="card" style={{ marginBottom: 12 }}>
                <h4 style={{ marginTop: 0 }}>Papan Skor</h4>
                <ol style={{ paddingLeft: 16, margin: 0 }}>
                  {Object.entries(roomData.players || {}).sort((a, b) => (b[1].score || 0) - (a[1].score || 0)).map(([pid, p]) => (
                    <li key={pid} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <span>{p.name}</span>
                      <strong>{p.score || 0}</strong>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="card">
                <h4 style={{ marginTop: 0 }}>Peserta</h4>
                <div>
                  <PlayerList players={roomData.players} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Connecting */}
        {roomId && !roomData && (
          <div className="card" style={{ marginTop: 12 }}>Menghubungkan ke room... (Jika room belum ada, host harus membuatnya.)</div>
        )}

        <div className="footer">© {new Date().getFullYear()} QuizLive — Dibuat untuk ruang kelas</div>
      </div>
    </div>
  );
}
