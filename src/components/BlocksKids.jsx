import React, { useCallback, useEffect, useRef, useState } from "react";
import "./blocks-kids.css";

/**
 * BlocksKids — updated:
 * - square full-width header buttons
 * - repeat block (simple scratch-like repeat previous command)
 * - reorder program steps by drag/drop
 * - click program tile to edit (repeat count)
 * - speed slider
 */

const BLOCKLY_UMD_URL = "https://unpkg.com/blockly/blockly.min.js";
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-blockly-src="${src}"]`);
    if (existing) {
      if (window.Blockly) return resolve(window.Blockly);
      existing.addEventListener("load", () => resolve(window.Blockly));
      existing.addEventListener("error", reject);
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.defer = true;
    s.setAttribute("data-blockly-src", src);
    s.onload = () => resolve(window.Blockly);
    s.onerror = (e) => reject(e);
    document.head.appendChild(s);
  });
}

export default function BlocksKids() {
  // fixed grid config
  const cols = 5;
  const rows = 5;
  const gridSize = 80;
  const stageWidth = cols * gridSize;
  const stageHeight = rows * gridSize;

  // grid state (visual only)
  const [grid, setGrid] = useState(() => new Array(cols * rows).fill(null));
  const [robotCell, setRobotCell] = useState(() => Math.floor((rows * cols) / 2));
  const robotRef = useRef(null);

  // program array (ordered steps shown below arena)
  // each item: { type,label,icon,colorFrom,colorTo, value? }
  const [program, setProgram] = useState([]);
  const [log, setLog] = useState([]);
  const [playing, setPlaying] = useState(false);
  const playTimerRef = useRef(null);
  const stopFlagRef = useRef(false);

  // speed (ms)
  const [speedMs, setSpeedMs] = useState(300);

  // palette (added a 'repeat' block for "scratch-like" behavior)
  const palette = [
    { type: "forward", label: "Maju", icon: "↑", colorFrom: "#4facfe", colorTo: "#00f2fe" },
    { type: "back", label: "Mundur", icon: "↓", colorFrom: "#a18cd1", colorTo: "#fbc2eb" },
    { type: "left", label: "Belok Kiri", icon: "↶", colorFrom: "#ff7e5f", colorTo: "#feb47b" },
    { type: "right", label: "Belok Kanan", icon: "↷", colorFrom: "#00b09b", colorTo: "#96c93d" },
    { type: "jump", label: "Lompat", icon: "⤴", colorFrom: "#f6d365", colorTo: "#fda085" },
    { type: "wait", label: "Tunggu", icon: "⏱", colorFrom: "#a1c4fd", colorTo: "#c2e9fb" },
    // repeat: repeats previous command N times (simple scratch-like repeat support)
    { type: "repeat", label: "Ulangi", icon: "⟲", colorFrom: "#ffb86b", colorTo: "#ff758c", value: 2 },
  ];

  // helpers ------------------------------------------------
  function cellToPos(index) {
    const r = Math.floor(index / cols);
    const c = index % cols;
    return { left: c * gridSize, top: r * gridSize };
  }

  function appendToProgram(cmd) {
    setProgram((p) => [...p, cmd]);
  }
  function removeProgramIndex(i) {
    setProgram((p) => p.filter((_, idx) => idx !== i));
  }
  function clearProgram() {
    setProgram([]);
  }

  // DRAG handlers for palette (drag source)
  function onPaletteDragStart(e, cmd) {
    e.dataTransfer.setData("application/x-pictoblox-cmd", JSON.stringify(cmd));
    try { e.dataTransfer.effectAllowed = "copy"; } catch {}
  }

  // DRAG handlers for robot (dragging robot to change start cell)
  function onRobotDragStart(e) {
    e.dataTransfer.setData("application/x-pictoblox-robot", "robot");
    try { e.dataTransfer.effectAllowed = "move"; } catch {}
  }

  // GRID: accept only robot drops now (NOT commands)
  function onCellDragOver(e) {
    e.preventDefault();
    const isRobot = e.dataTransfer.types && Array.from(e.dataTransfer.types).includes("application/x-pictoblox-robot");
    e.dataTransfer.dropEffect = isRobot ? "move" : "none";
  }
  function onCellDrop(e, idx) {
    e.preventDefault();
    const rb = e.dataTransfer.getData("application/x-pictoblox-robot");
    if (rb) {
      setRobotCell(idx);
    }
  }

  // CLICKING GRID: move robot start position (no program addition)
  function onCellClick(idx) {
    setRobotCell(idx);
  }
  function onCellContext(e, idx) {
    e.preventDefault();
    setGrid(prev => {
      const next = prev.slice();
      next[idx] = null;
      return next;
    });
  }

  // PROGRAM area: accept drops from palette to append program
  function onProgramDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }
  function onProgramDrop(e) {
    e.preventDefault();
    const raw = e.dataTransfer.getData("application/x-pictoblox-cmd");
    if (raw) {
      try {
        const cmd = JSON.parse(raw);
        appendToProgram(cmd);
      } catch (err) {
        // ignore
      }
    }
  }

  // PROGRAM tiles drag/reorder handlers
  function onProgramTileDragStart(e, idx) {
    e.dataTransfer.setData("application/x-pictoblox-program-index", String(idx));
    try { e.dataTransfer.effectAllowed = "move"; } catch {}
  }
  function onProgramListDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }
  function onProgramTileDrop(e, targetIdx) {
    e.preventDefault();
    const raw = e.dataTransfer.getData("application/x-pictoblox-program-index");
    if (!raw) return;
    const srcIdx = parseInt(raw, 10);
    if (isNaN(srcIdx)) return;
    setProgram(prev => {
      const next = prev.slice();
      const [item] = next.splice(srcIdx, 1);
      // if dropping onto same spot, just insert
      const insertAt = srcIdx < targetIdx ? targetIdx - 1 : targetIdx;
      next.splice(insertAt, 0, item);
      return next;
    });
  }

  // click program tile to edit (simple: allow editing repeat count)
  function onProgramTileClick(p, idx) {
    if (p.type === "repeat") {
      const v = prompt("Masukkan jumlah pengulangan (angka positif):", String(p.value ?? 2));
      if (v === null) return;
      const n = Math.max(1, Math.floor(Number(v) || 1));
      setProgram(prev => {
        const next = prev.slice();
        next[idx] = { ...next[idx], value: n };
        return next;
      });
    } else {
      alert(`Langkah: ${p.label}\n(Tip: sekarang kamu bisa mengedit blok 'Ulangi')`);
    }
  }

  // program -> commands mapping
  function programToCommands() {
    return program.map(p => {
      switch (p.type) {
        case "forward": return { type: "forward", value: 1 };
        case "back": return { type: "back", value: 1 };
        case "left": return { type: "left" };
        case "right": return { type: "right" };
        case "jump": return { type: "jump" };
        case "wait": return { type: "wait" };
        case "repeat": return { type: "repeat", value: p.value ?? 2 };
        default: return null;
      }
    }).filter(Boolean);
  }

  // executor (supports 'repeat' which repeats previous command N times)
  async function executePictobloxCommands(commands, speedMsParam) {
    stopFlagRef.current = false;
    setPlaying(true);
    setLog([]);
    let posIndex = robotCell;
    const updateRobotDom = (index) => {
      const el = document.getElementById("pictorobot");
      if (!el) return;
      const p = cellToPos(index);
      el.style.left = `${p.left + (gridSize - 48) / 2}px`;
      el.style.top = `${p.top + (gridSize - 48) / 2}px`;
    };

    updateRobotDom(posIndex);

    for (let i = 0; i < commands.length; i++) {
      if (stopFlagRef.current) break;
      const cmd = commands[i];

      // handle repeat: repeat previous command N times (if any)
      if (cmd.type === "repeat") {
        setLog(l => [...l, `→ repeat ${cmd.value}x`]);
        if (i === 0) {
          // nothing to repeat
          setLog(l => [...l, "(tidak ada langkah sebelumnya untuk diulang)"]);
          await new Promise(res => (playTimerRef.current = setTimeout(res, speedMsParam)));
          continue;
        }
        const prevCmd = commands[i - 1];
        for (let r = 0; r < (cmd.value || 1); r++) {
          if (stopFlagRef.current) break;
          setLog(l => [...l, `  ↳ ${prevCmd.type}${prevCmd.value ? " " + prevCmd.value : ""}`]);
          await executeSingleCmd(prevCmd, () => {
            posIndex = getPosIndex(); // closure uses outer
          }, speedMsParam);
        }
        continue;
      }

      setLog(l => [...l, `→ ${cmd.type}${cmd.value ? " " + cmd.value : ""}`]);
      await executeSingleCmd(cmd, (newIndex) => {
        posIndex = newIndex;
        setRobotCell(newIndex);
        updateRobotDom(newIndex);
      }, speedMsParam);
    }

    setPlaying(false);

    // helper: executes a single (non-repeat) command. Calls updatePos(newIndex) when moved
    async function executeSingleCmd(cmd, updatePosFn, speed) {
      let newPos = posIndex;
      if (cmd.type === "forward") {
        const r = Math.floor(posIndex / cols);
        const c = posIndex % cols;
        const nr = Math.max(0, r - 1);
        newPos = nr * cols + c;
        updatePosFn(newPos);
        await new Promise(res => (playTimerRef.current = setTimeout(res, speed)));
      } else if (cmd.type === "back") {
        const r = Math.floor(posIndex / cols);
        const c = posIndex % cols;
        const nr = Math.min(rows - 1, r + 1);
        newPos = nr * cols + c;
        updatePosFn(newPos);
        await new Promise(res => (playTimerRef.current = setTimeout(res, speed)));
      } else if (cmd.type === "left") {
        const r = Math.floor(posIndex / cols);
        const c = posIndex % cols;
        const nc = Math.max(0, c - 1);
        newPos = r * cols + nc;
        updatePosFn(newPos);
        await new Promise(res => (playTimerRef.current = setTimeout(res, Math.max(80, speed / 2))));
      } else if (cmd.type === "right") {
        const r = Math.floor(posIndex / cols);
        const c = posIndex % cols;
        const nc = Math.min(cols - 1, c + 1);
        newPos = r * cols + nc;
        updatePosFn(newPos);
        await new Promise(res => (playTimerRef.current = setTimeout(res, Math.max(80, speed / 2))));
      } else if (cmd.type === "jump") {
        const el = document.getElementById("pictorobot");
        if (el) {
          el.style.transition = "transform 160ms";
          el.style.transform = "translateY(-14px)";
          await new Promise(res => (playTimerRef.current = setTimeout(res, 160)));
          el.style.transform = "translateY(0px)";
          await new Promise(res => (playTimerRef.current = setTimeout(res, speed)));
          el.style.transition = "";
        } else await new Promise(res => (playTimerRef.current = setTimeout(res, speed)));
      } else if (cmd.type === "wait") {
        await new Promise(res => (playTimerRef.current = setTimeout(res, speed)));
      } else {
        await new Promise(res => (playTimerRef.current = setTimeout(res, speed)));
      }
    }

    // helper for getting current posIndex (captured)
    function getPosIndex() {
      return posIndex;
    }
  }

  // run/stop/clear handlers --------------------------------
  const onRun = useCallback(async () => {
    stopFlagRef.current = false;
    setLog([]);
    if (!program.length) {
      setLog(["(Program kosong)"]);
      return;
    }
    const cmds = programToCommands();
    await executePictobloxCommands(cmds, speedMs);
  }, [program, speedMs]);

  const onStop = useCallback(() => {
    stopFlagRef.current = true;
    if (playTimerRef.current) { clearTimeout(playTimerRef.current); playTimerRef.current = null; }
    setPlaying(false);
  }, []);

  const onClearGrid = useCallback(() => {
    setGrid(new Array(cols * rows).fill(null));
    setLog([]);
  }, []);

  // load optional Blockly script (unchanged)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await loadScript(BLOCKLY_UMD_URL);
        if (!mounted) return;
      } catch (e) { /* ignore if only using pictoblox */ }
    })();
    return () => { mounted = false; };
  }, []);

  // move robot DOM when robotCell changes
  useEffect(() => {
    const el = document.getElementById("pictorobot");
    if (!el) return;
    const p = cellToPos(robotCell);
    el.style.left = `${p.left + (gridSize - 48) / 2}px`;
    el.style.top = `${p.top + (gridSize - 48) / 2}px`;
  }, [robotCell]);

  return (
    <section className="blocks-fullwrap">
      <div className="blocks-kids-root pictoblox-mode full-width">
        {/* HEADER WITH LOGO */}
        <div className="playground-header">
          <div className="logo-title">
            <img src="/logo.jpg" alt="Tiny Robotics Logo" className="tiny-logo" />
            <h1>Belajar Coding bersama TECH-C Robotic Coding</h1>
          </div>

          <div className="header-right">
            <div className="speed-control">
              <label>Kecepatan</label>
              <input
                type="range"
                min="120"
                max="800"
                step="20"
                value={speedMs}
                onChange={(e) => setSpeedMs(Number(e.target.value))}
              />
              <div className="speed-value">{speedMs} ms</div>
            </div>

            <div className="header-actions">
              {/* Full-width square-ish buttons */}
              <button className="btn btn-square" onClick={onRun} disabled={playing}>Run ▶</button>
              <button className="btn btn-square ghost" onClick={onStop}>Stop ✕</button>
              <button className="btn btn-square ghost" onClick={onClearGrid}>Clear Grid</button>
            </div>
          </div>
        </div>

        <div className="pictoblox-layout" style={{ marginTop: 12 }}>
          {/* Palette */}
          <aside className="pallet-panel">
            <div className="panel-title">Blok Kode</div>
            <div className="palette-list">
              {palette.map((p, i) => (
                <div
                  key={p.type + i}
                  className="palette-tile square"
                  draggable
                  onDragStart={(e) => onPaletteDragStart(e, p)}
                  title={p.label}
                  style={{ background: `linear-gradient(90deg, ${p.colorFrom}, ${p.colorTo})` }}
                >
                  <div className="tile-label">{p.label}</div>
                  <div className="tile-icon">{p.icon}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, fontSize: 14, color: "#666" }}>
              Seret blok ke area "Program Kamu" di bawah untuk menambah langkah. (<strong>Jangan</strong> seret ke grid.)
            </div>
          </aside>

          {/* Arena + Program column */}
          <main style={{ flex: 1 }}>
            <div className="arena-panel" style={{ marginBottom: 12 }}>
              <div className="panel-title">Arena Robot</div>

              <div
                id="gridWrap"
                className="grid-wrap"
                style={{
                  width: stageWidth,
                  height: stageHeight,
                  gridTemplateColumns: `repeat(${cols}, ${gridSize}px)`,
                  gridTemplateRows: `repeat(${rows}, ${gridSize}px)`
                }}
              >
                {Array.from({ length: cols * rows }).map((_, idx) => {
                  const cell = grid[idx];
                  return (
                    <div
                      key={idx}
                      className={`grid-cell ${idx === robotCell ? "robot-start" : ""}`}
                      onDragOver={onCellDragOver}
                      onDrop={(e) => onCellDrop(e, idx)}
                      onClick={() => onCellClick(idx)}
                      onContextMenu={(e) => onCellContext(e, idx)}
                      style={{ width: gridSize, height: gridSize }}
                      aria-label={`cell-${idx}`}
                    >
                      {cell ? (
                        <div className="cell-tile" style={{ background: `linear-gradient(90deg, ${cell.colorFrom}, ${cell.colorTo})` }}>
                          <div className="cell-icon">{cell.icon}</div>
                          <div className="cell-label">{cell.label}</div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}

                <div
                  id="pictorobot"
                  draggable
                  onDragStart={(e) => onRobotDragStart(e)}
                  ref={robotRef}
                  style={{
                    position: "absolute",
                    width: 48,
                    height: 48,
                    pointerEvents: "auto",
                    zIndex: 50,
                    transition: "left 160ms, top 160ms",
                  }}
                  title="Drag untuk mengubah posisi awal robot"
                >
                  <svg viewBox="0 0 64 64" width="48" height="48" aria-hidden>
                    <rect x="10" y="18" width="44" height="30" rx="6" fill="#4f46e5" />
                    <line x1="32" y1="10" x2="32" y2="18" stroke="#4f46e5" strokeWidth="2" />
                    <circle cx="32" cy="8" r="3" fill="#22d3ee" />
                    <circle cx="23" cy="32" r="4" fill="#fff" />
                    <circle cx="41" cy="32" r="4" fill="#fff" />
                    <rect x="25" y="40" width="14" height="3" rx="1" fill="#fff" />
                    <rect x="4" y="24" width="6" height="18" rx="2" fill="#4f46e5" />
                    <rect x="54" y="24" width="6" height="18" rx="2" fill="#4f46e5" />
                    <circle cx="22" cy="50" r="3" fill="#1e293b" />
                    <circle cx="42" cy="50" r="3" fill="#1e293b" />
                  </svg>
                </div>
              </div>

              {/* Position and hint */}
              <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ color: "#666" }}>Posisi: ({Math.floor(robotCell / cols)}, {robotCell % cols})</div>
                <div style={{ color: "#fff", background: "#2b8cf4", padding: "6px 10px", borderRadius: 18, fontSize: 12 }}>Arah: Kanan</div>
              </div>
            </div>

            {/* Program Kamu panel (DROP TARGET) */}
            <div
              className="program-panel"
              onDragOver={onProgramDragOver}
              onDrop={onProgramDrop}
              role="region"
              aria-label="program-drop-area"
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontWeight: 800 }}>Program Kamu</div>
                <button className="clear-link" onClick={() => { clearProgram(); }}>Hapus Semua</button>
              </div>

              <div
                className="program-list"
                onDragOver={onProgramListDragOver}
                aria-label="program-list"
              >
                {program.length === 0 ? (
                  <div style={{ color: "#666", padding: 12, borderRadius: 8, background: "#fbfbfd" }}>
                    Program kosong — seret blok dari palette ke sini untuk menambah langkah.
                  </div>
                ) : (
                  program.map((p, i) => (
                    <div
                      key={i}
                      className="program-tile square"
                      draggable
                      onDragStart={(e) => onProgramTileDragStart(e, i)}
                      onDrop={(e) => onProgramTileDrop(e, i)}
                      onClick={() => onProgramTileClick(p, i)}
                      style={{ background: `linear-gradient(90deg, ${p.colorFrom}, ${p.colorTo})` }}
                    >
                      <div className="program-left">
                        <div className="step-number">{i + 1}</div>
                        <div className="program-label">{p.label}{p.type === "repeat" ? ` ×${p.value ?? 2}` : ""}</div>
                      </div>
                      <button className="program-remove" onClick={(ev) => { ev.stopPropagation(); removeProgramIndex(i); }}>✕</button>
                    </div>
                  ))
                )}
              </div>
              <div style={{ marginTop: 8, color: "#666", fontSize: 13 }}>Tip: Klik blok 'Ulangi' untuk mengubah jumlah pengulangan. Seret blok program untuk mengubah urutan.</div>
            </div>

            {/* Log */}
            <div style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Commands</div>
              <div className="cmdList">
                {log.length === 0 ? <div style={{ color: "#666" }}>No commands yet — build your program and press Run.</div> : null}
                {log.map((l, i) => <div key={i} className="cmdItem">{l}</div>)}
              </div>
            </div>
          </main>
        </div>
      </div>
    </section>
  );
}
