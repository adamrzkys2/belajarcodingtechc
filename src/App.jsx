/*
Realtime Multiplayer Quiz — Single-file React component (src/App.jsx)
Uses: Firebase Realtime Database (modular SDK v9)

Setup notes (brief):
1. Install firebase: npm install firebase
2. Add Firebase config as Vite env variables (in .env.local):
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_DATABASE_URL=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_APP_ID=...

3. This file initializes Firebase using import.meta.env variables. It implements a simple realtime room model:
   /rooms/{roomId} -> { meta, state, currentIndex, players: {playerId: {name,score,connected}}, answers: {playerId: choice} }

4. Security: for production add Firebase Realtime DB rules and auth. This demo assumes an open DB for simplicity.

Behavior included:
- Create room (host) or join room (player) by room code
- Room state synced in realtime for all participants
- Host can start quiz, move to next question
- Players submit answers — scores are updated server-side via simple logic (host computes scoring)
- Basic presence (connected flag) using onDisconnect

This is a frontend-only, demo-ready component. For robust production you should use Firebase Authentication and secure DB rules.
*/

import React, { useEffect, useState, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getDatabase,
  ref,
  push,
  set,
  onValue,
  update,
  get,
  onDisconnect,
  remove
} from 'firebase/database';

// ----- SAMPLE QUIZ -----
const SAMPLE_QUIZ = {
  id: 'sample-1',
  title: 'Realtime Quiz — Mini',
  questions: [
    { id: 1, text: 'Capital of France?', choices: ['Paris', 'Madrid', 'Berlin', 'Rome'], answer: 0, time: 12 },
    { id: 2, text: 'Which runs in browser?', choices: ['Python', 'C++', 'JavaScript', 'Java'], answer: 2, time: 10 },
    { id: 3, text: 'Painter of Mona Lisa?', choices: ['Van Gogh', 'Da Vinci', 'Picasso', 'Rembrandt'], answer: 1, time: 12 }
  ]
};

// ----- Firebase init -----
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Utilities
const shortId = () => Math.random().toString(36).slice(2, 8).toUpperCase();

export default function App() {
  // local UI state
  const [roomId, setRoomId] = useState('');
  const [roomData, setRoomData] = useState(null);
  const [name, setName] = useState('');
  const [playerId, setPlayerId] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [localAnswer, setLocalAnswer] = useState(null);
  const timerRef = useRef(null);

  // create a room as host
  const createRoom = async () => {
    const id = shortId();
    const roomRef = ref(db, `rooms/${id}`);
    const initial = {
      meta: { title: SAMPLE_QUIZ.title, quizId: SAMPLE_QUIZ.id },
      quiz: SAMPLE_QUIZ,
      state: 'lobby', // lobby | running | question | finished
      currentIndex: 0,
      players: {},
      answers: {}
    };
    await set(roomRef, initial);
    setRoomId(id);
    setIsHost(true);
    listenRoom(id);
  };

  // join an existing room
  const joinRoom = async (id, playerName) => {
    if (!id || !playerName) return alert('Room ID and name required');
    const playersRef = ref(db, `rooms/${id}/players`);
    const newPlayerRef = ref(db, `rooms/${id}/players/${Math.random().toString(36).slice(2,9)}`);
    const pid = newPlayerRef.key;

    const playerObj = { name: playerName, score: 0, connected: true };
    await set(newPlayerRef, playerObj);

    // presence cleanup on disconnect
    const connRef = ref(db, `rooms/${id}/players/${pid}/connected`);
    onDisconnect(connRef).set(false);

    setPlayerId(pid);
    setName(playerName);
    setIsHost(false);
    setRoomId(id);
    listenRoom(id);
  };

  // listen to room updates
  const listenRoom = (id) => {
    const roomRef = ref(db, `rooms/${id}`);
    onValue(roomRef, (snap) => {
      if (!snap.exists()) {
        setRoomData(null);
        return;
      }
      setRoomData(snap.val());
    });
  };

  // host starts quiz
  const startQuiz = async () => {
    if (!roomId) return;
    const roomRef = ref(db, `rooms/${roomId}`);
    await update(roomRef, { state: 'running', currentIndex: 0, answers: {} });
    // move to question state after a tick
    await update(roomRef, { state: 'question' });
  };

  // host moves to next question (and calculates scores based on answers stored)
  const nextQuestion = async () => {
    if (!roomId || !roomData) return;
    const idx = roomData.currentIndex || 0;
    const quiz = roomData.quiz || SAMPLE_QUIZ;
    const q = quiz.questions[idx];

    // scoring: iterate answers, update player scores
    const answers = roomData.answers || {};
    const updates = {};
    const playerUpdates = {};
    Object.entries(answers).forEach(([pid, choice]) => {
      const correct = choice === q.answer;
      if (correct) {
        // +100 simple
        playerUpdates[`players/${pid}/score`] = (roomData.players && roomData.players[pid] && roomData.players[pid].score || 0) + 100;
      }
    });

    // apply scoring and advance
    const roomRef = ref(db, `rooms/${roomId}`);
    const nextIdx = idx + 1;
    const newState = nextIdx >= quiz.questions.length ? 'finished' : 'question';

    // batch update: merge player scores and set answers cleared
    const batch = {};
    Object.entries(playerUpdates).forEach(([path, val]) => {
      batch[path] = val;
    });
    batch['currentIndex'] = nextIdx;
    batch['answers'] = {};
    batch['state'] = newState;

    await update(roomRef, batch);
  };

  // player submits answer
  const submitAnswer = async (choice) => {
    if (!roomId || !playerId) return;
    const ansRef = ref(db, `rooms/${roomId}/answers/${playerId}`);
    await set(ansRef, choice);
    setLocalAnswer(choice);
  };

  // Host can set quiz (replace quiz object in room) — optional helper
  const setQuiz = async (quiz) => {
    if (!roomId) return;
    const roomRef = ref(db, `rooms/${roomId}/quiz`);
    await set(roomRef, quiz);
  };

  // leave room (cleanup presence if player)
  const leaveRoom = async () => {
    if (!roomId) return;
    if (playerId) {
      const pRef = ref(db, `rooms/${roomId}/players/${playerId}`);
      await remove(pRef);
    }
    setRoomId('');
    setRoomData(null);
    setPlayerId(null);
    setIsHost(false);
    setLocalAnswer(null);
  };

  // UI helpers
  const renderLobby = () => {
    return (
      <div className="p-4 bg-white rounded shadow">
        <h2 className="text-xl font-bold">Lobby</h2>
        <div className="mt-3 grid gap-2">
          <input placeholder="Your name" className="border p-2 rounded" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="flex gap-2">
            <button className="px-3 py-2 bg-green-600 text-white rounded" onClick={createRoom}>Create Room</button>
            <input className="border p-2 rounded" placeholder="Room ID" value={roomId} onChange={(e)=>setRoomId(e.target.value.toUpperCase())} />
            <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={() => joinRoom(roomId, name)}>Join Room</button>
          </div>
        </div>
      </div>
    );
  };

  const renderRoom = () => {
    if (!roomData) return <div>Loading room...</div>;
    const { players = {}, state = 'lobby', currentIndex = 0, quiz = SAMPLE_QUIZ } = roomData;
    const q = quiz.questions[currentIndex];

    return (
      <div className="space-y-4">
        <div className="p-4 bg-white rounded shadow flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold">Room {roomId}</h3>
            <div className="text-sm text-gray-600">Quiz: {quiz.title}</div>
            <div className="text-sm text-gray-600">State: {state}</div>
          </div>
          <div className="text-right">
            {isHost ? (
              <div className="space-y-2">
                <button className="px-3 py-2 bg-indigo-600 text-white rounded" onClick={() => setQuiz(SAMPLE_QUIZ)}>Load Sample Quiz</button>
                <button className="px-3 py-2 bg-green-600 text-white rounded" onClick={startQuiz}>Start Quiz</button>
                <button className="px-3 py-2 border rounded" onClick={nextQuestion}>Next</button>
                <button className="px-3 py-2 border rounded" onClick={leaveRoom}>End / Leave</button>
              </div>
            ) : (
              <div>
                <button className="px-3 py-2 border rounded" onClick={leaveRoom}>Leave Room</button>
              </div>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 bg-white rounded shadow">
            <h4 className="font-semibold mb-2">Players</h4>
            <div className="space-y-2">
              {Object.entries(players).length === 0 && <div className="text-sm text-gray-500">No players yet</div>}
              {Object.entries(players).map(([pid, p]) => (
                <div key={pid} className={`p-2 border rounded flex justify-between ${pid===playerId? 'bg-indigo-50' : ''}`}>
                  <div>{p.name} {p.connected ? '' : '(offline)'}</div>
                  <div className="font-medium">{p.score || 0}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 bg-white rounded shadow">
            <h4 className="font-semibold mb-2">Question</h4>
            {state === 'lobby' && <div className="text-sm">Waiting for host to start the quiz.</div>}
            {state === 'question' && q && (
              <div>
                <div className="font-medium mb-2">{q.text}</div>
                <div className="grid gap-2">
                  {q.choices.map((c, idx) => (
                    <button key={idx} className={`p-2 border rounded text-left ${localAnswer===idx ? 'bg-green-100' : ''}`} onClick={() => submitAnswer(idx)}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {state === 'finished' && (
              <div>
                <div className="font-semibold">Quiz finished</div>
                <div className="mt-2">
                  <ol className="list-decimal ml-5">
                    {Object.entries(players).sort((a,b)=> (b[1].score||0)-(a[1].score||0)).map(([pid,p]) => (
                      <li key={pid}>{p.name} — {p.score || 0} pts</li>
                    ))}
                  </ol>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-white p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Realtime Multiplayer Quiz (Firebase Realtime DB)</h1>
        {!roomId && renderLobby()}
        {roomId && renderRoom()}
        <div className="mt-6 text-sm text-gray-500">Tip: open this page in multiple tabs (or different browsers) and join the same room to simulate real players.</div>
      </div>
    </div>
  );
}
