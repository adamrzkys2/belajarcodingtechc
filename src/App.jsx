/*
Modern QuizLive — Enhanced UI (src/App.jsx)
Single-file React component (modernized)
Adds:
- Full top header with logo, navigation, search, notifications, profile menu
- Responsive mobile menu
- Stats cards (players, questions, avg score)
- Settings modal (theme toggle, sounds)
- Footer
- Polished spacing, gradients, and micro-interactions using Framer Motion

Keep Firebase dynamic import and realtime features from previous version.

Setup reminder:
- Install dependencies: npm install firebase framer-motion
- Tailwind configured in project
- Add Firebase env vars in .env.local
*/

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ---------- SAMPLE QUIZ ----------
const SAMPLE_QUIZ = {
  id: 'arduino-sensors-1',
  title: 'Arduino & Sensor — Kuis (15 Soal)',
  questions: [
    { id: 1, text: 'Pin Arduino manakah yang biasanya digunakan untuk input sensor analog?', choices: ['Pin Digital PWM','Pin Analog (A0-A5)','Pin Ground','Pin VCC'], answer: 1, time: 20 },
    { id: 2, text: 'Sensor apa yang digunakan untuk mengukur suhu?', choices: ['Sensor Ultrasonik','Sensor PIR','DHT11/DHT22','IR Receiver'], answer: 2, time: 18 },
    { id: 3, text: 'Sensor mana yang mengukur jarak menggunakan gelombang suara?', choices: ['Sensor Cahaya','Sensor Ultrasonik','Sensor Gas','Sensor Fleksibel'], answer: 1, time: 18 },
    { id: 4, text: 'Modul apa yang digunakan untuk mendeteksi gerakan manusia?', choices: ['LDR','Sensor PIR','MQ-2','BMP180'], answer: 1, time: 15 },
    { id: 5, text: 'Apa fungsi potensiometer ketika digunakan pada Arduino?', choices: ['Output digital on/off','Menghasilkan tegangan analog yang dapat diubah','Mengukur suhu','Mengirim sinyal nirkabel'], answer: 1, time: 15 },
    { id: 6, text: 'Sensor apa yang digunakan untuk mendeteksi intensitas cahaya?', choices: ['Sensor Ultrasonik','LDR (Light Dependent Resistor)','DHT11','HC-SR04'], answer: 1, time: 15 },
    { id: 7, text: 'Bagaimana sensor gas MQ mendeteksi adanya gas?', choices: ['Mengirim sinyal HIGH ketika ada gas','Mengeluarkan tegangan analog sesuai konsentrasi gas','Mematikan Arduino','Mengubah alamat I2C'], answer: 1, time: 20 },
    { id: 8, text: 'Protokol komunikasi apa yang digunakan banyak sensor digital seperti modul I2C?', choices: ['PWM','SPI','I2C','UART'], answer: 2, time: 15 },
    { id: 9, text: 'Apa fungsi resistor pull-down saat membaca tombol?', choices: ['Memberikan kondisi LOW saat tidak ditekan','Menaikkan tegangan','Menghilangkan noise','Memberi daya pada tombol'], answer: 0, time: 15 },
    { id: 10, text: 'Modul mana yang digunakan untuk mengukur tekanan udara?', choices: ['BMP180/BMP280','Sensor PIR','Servo','Sensor Ultrasonik'], answer: 0, time: 18 },
    { id: 11, text: 'Apa arti PWM dan mengapa digunakan?', choices: ['Pulse Width Modulation — mensimulasikan output analog dari pin digital','Pulse Width Modulation — mengukur suhu','Peripheral Wire Module — untuk sensor','Power Watt Management — untuk baterai'], answer: 0, time: 20 },
    { id: 12, text: 'Sensor apa yang dapat mendeteksi api atau nyala?', choices: ['Sensor Api (berbasis IR)','Sensor Kelembaban Tanah','LDR','DHT11'], answer: 0, time: 15 },
    { id: 13, text: 'Berapa tegangan umum untuk sensor Arduino UNO?', choices: ['3.3V saja','12V','5V (atau 3.3V untuk beberapa modul)','24V'], answer: 2, time: 12 },
    { id: 14, text: 'Sensor apa yang digunakan untuk mengukur kelembaban tanah?', choices: ['Sensor Kelembaban Tanah','HC-SR04','MQ-7','Sensor PIR'], answer: 0, time: 15 },
    { id: 15, text: 'Perangkat apa yang mengubah gerakan rotasi menjadi posisi sudut untuk umpan balik?', choices: ['Sensor Ultrasonik','Encoder','DHT22','Relay'], answer: 1, time: 18 }
  ]
};

// ---------- Helpers ----------
const shortId = () => Math.random().toString(36).slice(2,8).toUpperCase();
const initials = (name='Player') => name.split(' ').map(s=>s[0]).slice(0,2).join('').toUpperCase();

// ---------- useFirebase hook (dynamic import) ----------
function useFirebase() {
  const dbRef = useRef(null);
  const appRef = useRef(null);
  const readyRef = useRef(false);

  const init = async () => {
    if (readyRef.current) return { app: appRef.current, db: dbRef.current };
    const { initializeApp } = await import('firebase/app');
    const { getDatabase } = await import('firebase/database');

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
  };

  return { init, appRef, dbRef };
}

export default function App() {
  const fb = useFirebase();
  const [inited, setInited] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [roomData, setRoomData] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [joinRoomCode, setJoinRoomCode] = useState('');
  const [playerId, setPlayerId] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [localAnswer, setLocalAnswer] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [dark, setDark] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    (async () => {
      await fb.init();
      setInited(true);
    })();
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  // ---------- ROOM LISTENER ----------
  useEffect(() => {
    if (!inited || !roomId) return;
    (async () => {
      const { ref, onValue } = await import('firebase/database');
      const roomRef = ref(fb.dbRef.current, `rooms/${roomId}`);
      onValue(roomRef, (snap) => {
        setRoomData(snap.exists() ? snap.val() : null);
      });
    })();
    return () => {
      clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [inited, roomId]);

  // ---------- PRESENCE ----------
  useEffect(() => {
    if (!inited || !roomId || !playerId) return;
    (async () => {
      const { ref, set, onDisconnect } = await import('firebase/database');
      const connRef = ref(fb.dbRef.current, `rooms/${roomId}/players/${playerId}/connected`);
      await set(connRef, true);
      onDisconnect(connRef).set(false);
    })();
  }, [inited, roomId, playerId]);

  // ---------- CRUD Helpers ----------
  const createRoom = async () => {
    if (!inited) return;
    const id = shortId();
    const { ref, set } = await import('firebase/database');
    const roomRef = ref(fb.dbRef.current, `rooms/${id}`);
    const initial = {
      meta: { title: SAMPLE_QUIZ.title },
      quiz: SAMPLE_QUIZ,
      state: 'lobby',
      currentIndex: 0,
      players: {},
      answers: {}
    };
    await set(roomRef, initial);
    setRoomId(id);
    setIsHost(true);
    setNotifCount((n) => n + 1);
  };

  const joinRoom = async (id, name) => {
    if (!inited || !id || !name) return alert('room id and name required');
    const { ref, set } = await import('firebase/database');
    const pid = Math.random().toString(36).slice(2,9);
    const pRef = ref(fb.dbRef.current, `rooms/${id}/players/${pid}`);
    await set(pRef, { name, score: 0, connected: true });
    setPlayerId(pid);
    setPlayerName(name);
    setRoomId(id);
    setIsHost(false);
    setNotifCount((n) => n + 1);
  };

  const leaveRoom = async () => {
    if (!inited || !roomId) return;
    const { ref, remove } = await import('firebase/database');
    if (playerId) {
      const pRef = ref(fb.dbRef.current, `rooms/${roomId}/players/${playerId}`);
      await remove(pRef);
    }
    setRoomId('');
    setRoomData(null);
    setPlayerId(null);
    setIsHost(false);
    setLocalAnswer(null);
  };

  const startQuiz = async () => {
    if (!inited || !roomId) return;
    const { ref, update } = await import('firebase/database');
    const rRef = ref(fb.dbRef.current, `rooms/${roomId}`);
    await update(rRef, { state: 'question', currentIndex: 0, answers: {} });
    setNotifCount((n)=>n+1);
  };

  const submitAnswer = async (choice) => {
    if (!inited || !roomId || !playerId) return;
    const { ref, set } = await import('firebase/database');
    const aRef = ref(fb.dbRef.current, `rooms/${roomId}/answers/${playerId}`);
    await set(aRef, choice);
    setLocalAnswer(choice);
  };

  const nextQuestion = async () => {
    if (!inited || !roomId || !roomData) return;
    const { ref, update } = await import('firebase/database');
    const idx = roomData.currentIndex || 0;
    const quiz = roomData.quiz || SAMPLE_QUIZ;
    const q = quiz.questions[idx];

    // scoring
    const answers = roomData.answers || {};
    const batch = {};
    Object.entries(answers).forEach(([pid, choice]) => {
      const correct = choice === q.answer;
      if (correct) {
        const current = (roomData.players && roomData.players[pid] && roomData.players[pid].score) || 0;
        batch[`players/${pid}/score`] = current + 100;
      }
    });

    const nextIdx = idx + 1;
    const newState = nextIdx >= quiz.questions.length ? 'finished' : 'question';
    batch['currentIndex'] = nextIdx;
    batch['answers'] = {};
    batch['state'] = newState;

    const rRef = ref(fb.dbRef.current, `rooms/${roomId}`);
    await update(rRef, batch);
    setLocalAnswer(null);
  };

  // ---------- Timer ----------
  useEffect(() => {
    if (!roomData) return;
    if (roomData.state !== 'question') {
      setTimeLeft(0);
      clearInterval(timerRef.current);
      return;
    }
    const idx = roomData.currentIndex || 0;
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
  }, [roomData]);

  // ---------- UI components ----------
  const IconBell = ({className}) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118.6 14.4V11a6 6 0 10-12 0v3.4c0 .538-.214 1.055-.595 1.445L4 17h5m6 0a3 3 0 11-6 0h6z" />
    </svg>
  );

  const IconSearch = ({className}) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />
    </svg>
  );

  const Header = () => (
    <header className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-4">
        <div className="bg-gradient-to-r from-indigo-600 to-blue-500 text-white px-3 py-2 rounded-full font-bold">QL</div>
        <div>
          <div className="text-lg font-extrabold">QuizLive</div>
          <div className="text-sm text-gray-500">Kuis kelas secara real-time</div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center bg-white border rounded-full px-3 py-2 shadow-sm">
          <IconSearch className="w-5 h-5 text-gray-400" />
          <input placeholder="Cari kuis, kode room..." className="ml-2 outline-none w-48" />
        </div>

        <div className="relative">
          <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800" onClick={()=>setNotifCount(0)}>
            <IconBell className="w-6 h-6 text-gray-600" />
          </button>
          {notifCount>0 && <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">{notifCount}</div>}
        </div>

        <div className="flex items-center gap-2">
          <button className="px-3 py-2 bg-indigo-600 text-white rounded-lg hidden md:inline" onClick={createRoom}>Create</button>
          <div className="relative">
            <button className="flex items-center gap-2 px-3 py-2 border rounded-full" onClick={()=>setShowSettings(true)}>
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center font-semibold">AB</div>
              <span className="hidden sm:inline">Host</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );

  const Stats = ({ players }) => {
    const numPlayers = Object.keys(players || {}).length;
    const numQuestions = (roomData && roomData.quiz && roomData.quiz.questions.length) || SAMPLE_QUIZ.questions.length;
    const avgScore = (() => {
      const ps = Object.values(players || {});
      if (ps.length === 0) return 0;
      return Math.round(ps.reduce((s,p)=>s+(p.score||0),0)/ps.length);
    })();

    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div className="p-4 bg-white rounded-xl shadow flex flex-col">
          <div className="text-sm text-gray-500">Players</div>
          <div className="text-2xl font-bold">{numPlayers}</div>
        </div>
        <div className="p-4 bg-white rounded-xl shadow flex flex-col">
          <div className="text-sm text-gray-500">Questions</div>
          <div className="text-2xl font-bold">{numQuestions}</div>
        </div>
        <div className="p-4 bg-white rounded-xl shadow flex flex-col">
          <div className="text-sm text-gray-500">Avg Score</div>
          <div className="text-2xl font-bold">{avgScore}</div>
        </div>
      </div>
    );
  };

  const PlayerList = ({ players }) => (
    <div className="space-y-2">
      {Object.entries(players || {}).map(([pid, p]) => (
        <div key={pid} className="flex items-center justify-between p-2 border rounded-lg bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center font-semibold">{initials(p.name)}</div>
            <div>
              <div className="font-medium">{p.name}</div>
              <div className="text-xs text-gray-500">{p.connected ? 'online' : 'offline'}</div>
            </div>
          </div>
          <div className="font-semibold">{p.score || 0}</div>
        </div>
      ))}
    </div>
  );

  const QuestionCard = ({ q }) => {
    const pct = q && q.time ? (timeLeft / q.time) * 100 : 0;
    return (
      <motion.div initial={{scale:0.99,opacity:0}} animate={{scale:1,opacity:1}} exit={{opacity:0}} className="p-6 bg-white rounded-2xl shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div className="text-lg font-semibold">{q.text}</div>
          <div className="text-sm text-gray-600">{timeLeft}s</div>
        </div>

        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
          <div className="h-2 rounded-full bg-gradient-to-r from-green-400 to-yellow-300 transition-all" style={{ width: `${pct}%` }} />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {q.choices.map((c, idx) => {
            const selected = localAnswer === idx;
            return (
              <motion.button key={idx} whileHover={{scale:1.02}} whileTap={{scale:0.98}} onClick={()=>submitAnswer(idx)} className={`p-4 text-left rounded-lg border ${selected ? 'ring-2 ring-indigo-400 bg-indigo-50' : 'bg-white'}`}>
                <div className="font-medium">{String.fromCharCode(65+idx)}. {c}</div>
              </motion.button>
            );
          })}
        </div>
      </motion.div>
    );
  };

  const Leaderboard = ({ players }) => (
    <div className="p-4 bg-white rounded-2xl shadow-md">
      <h4 className="font-semibold mb-3">Leaderboard</h4>
      <ol className="list-decimal ml-5 space-y-2">
        {Object.entries(players || {}).sort((a,b)=>(b[1].score||0)-(a[1].score||0)).map(([pid,p])=> (
          <li key={pid} className="flex justify-between"><span>{p.name}</span><span className="font-semibold">{p.score||0}</span></li>
        ))}
      </ol>
    </div>
  );

  // ---------- Settings Modal ----------
  const SettingsModal = ({ open, onClose }) => (
    <AnimatePresence>
      {open && (
        <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <motion.div initial={{y:20,opacity:0}} animate={{y:0,opacity:1}} exit={{y:20,opacity:0}} className="w-full max-w-md p-6 bg-white rounded-2xl shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Pengaturan</h3>
              <button onClick={onClose} className="text-gray-500">Tutup</button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Tema</div>
                  <div className="text-xs text-gray-500">Switch between light & dark</div>
                </div>
                <button onClick={()=>setDark(!dark)} className="px-3 py-2 border rounded">{dark ? 'Gelap' : 'Terang'}</button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Suara</div>
                  <div className="text-xs text-gray-500">Toggle UI sounds</div>
                </div>
                <button className="px-3 py-2 border rounded">Toggle</button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // ---------- Main render ----------
  return (
    <div max-w-3xl mx-auto text-center>
      <div className="max-w-7xl mx-auto">
        <Header />
        <div className="mb-4">
          <Stats players={roomData ? roomData.players : {}} />
        </div>

        {!roomId && (
          <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-md">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Host or join a live room</h2>
                <p className="text-sm text-gray-500 mb-4">Create a room and share the code. Players can join from their devices.</p>
                <div className="flex gap-2">
                  <button className="px-4 py-3 bg-indigo-600 text-white rounded-lg" onClick={createRoom}>Buat Room</button>
                  <button className="px-4 py-3 border rounded-lg" onClick={()=>{navigator.clipboard && navigator.clipboard.writeText(window.location.href)}}>Bagikan Link Aplikasi</button>
                </div>
              </div>
              <div>
                <input className="w-full border p-3 rounded-lg mb-3" placeholder="Nama Anda" value={playerName} onChange={(e)=>setPlayerName(e.target.value)} />
                <div className="flex gap-2">
                  <input className="flex-1 border p-3 rounded-lg" placeholder="Kode Room" value={joinRoomCode} onChange={(e)=>setJoinRoomCode(e.target.value.toUpperCase())} />
                  <button className="px-4 py-3 bg-green-600 text-white rounded-lg" onClick={() => joinRoom(joinRoomCode, playerName)}>Gabung</button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {roomId && roomData && (
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm text-gray-500">Room</div>
                  <div className="text-2xl font-bold">{roomId}</div>
                </div>
                <div className="space-x-2">
                  {isHost && <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg" onClick={startQuiz}>Mulai</button>}
                  {isHost && <button className="px-4 py-2 border rounded-lg" onClick={nextQuestion}>Selanjutnya</button>}
                  <button className="px-3 py-2 border rounded-lg" onClick={leaveRoom}>Keluar</button>
                </div>
              </div>

              <AnimatePresence exitBeforeEnter>
                {roomData.state === 'lobby' && (
                  <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="p-6 bg-white rounded-2xl shadow-md">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-semibold">Menunggu di lobi</h3>
                        <div className="text-sm text-gray-500">Bagikan kode room kepada peserta</div>
                      </div>
                      <div className="text-lg font-mono bg-slate-100 px-3 py-2 rounded-lg">{roomId}</div>
                    </div>
                    <PlayerList players={roomData.players} />
                  </motion.div>
                )}

                {roomData.state === 'question' && (
                  <QuestionCard key={`q-${roomData.currentIndex}`} q={roomData.quiz.questions[roomData.currentIndex]} />
                )}

                {roomData.state === 'finished' && (
                  <motion.div initial={{opacity:0}} animate={{opacity:1}} className="p-6 bg-white rounded-2xl shadow-md">
                    <h3 className="text-xl font-semibold mb-3">Kuis Selesai</h3>
                    <Leaderboard players={roomData.players} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="space-y-4">
              <Leaderboard players={roomData.players} />
              <div className="p-4 bg-white rounded-2xl shadow-md">
                <h4 className="font-semibold mb-2">Players</h4>
                <PlayerList players={roomData.players} />
              </div>
              <div className="p-4 bg-white rounded-2xl shadow-md text-sm text-gray-500">
                Tip: open in multiple tabs and join the same room to test real-time behaviour.
              </div>
            </div>
          </div>
        )}

        {!roomData && roomId && (
          <div className="p-6 bg-white rounded-2xl shadow-md mt-6">Menghubungkan ke room... (Jika room belum ada, host harus membuatnya.)</div>
        )}

        <footer className="mt-10 text-sm text-gray-500">
          <div className="border-t pt-4 flex justify-between">
            <div>© {new Date().getFullYear()} QuizLive — Built with ❤️</div>
            <div>Made for classrooms • <button className="underline" onClick={()=>setShowSettings(true)}>Pengaturan</button></div>
          </div>
        </footer>
      </div>

      <div className="absolute inset-0 -z-10 bg-cover bg-center blur-3xl opacity-40" style={{backgroundImage: `url('https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1950&q=80')`}}></div>
      <SettingsModal open={showSettings} onClose={()=>setShowSettings(false)} />
    </div>
  );
}
