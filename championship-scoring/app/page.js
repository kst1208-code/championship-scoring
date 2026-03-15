'use client';

import { useState, useEffect } from "react";

function defaultScoringConfig() {
  return {
    finals: [
      { name: "A Final", size: 8, points: [32, 28, 27, 26, 25, 24, 23, 22] },
      { name: "B Final", size: 8, points: [20, 17, 16, 15, 14, 13, 12, 11] },
      { name: "C Final", size: 8, points: [9, 7, 6, 5, 4, 3, 2, 1] },
    ],
    relayMultiplier: 2,
  };
}

function getTotalPlaces(sc) {
  return sc.finals.reduce((sum, f) => sum + f.size, 0);
}

function getPointsForPlace(place, eventType, sc) {
  let idx = 0;
  for (const final of sc.finals) {
    for (let i = 0; i < final.size; i++) {
      idx++;
      if (idx === place) {
        const pts = final.points[i] || 0;
        return eventType === "R" ? pts * sc.relayMultiplier : pts;
      }
    }
  }
  return 0;
}

const DEFAULT_EVENTS = [
  { num: 1, name: "200 Medley Relay", type: "R" },
  { num: 2, name: "800 Free Relay", type: "R" },
  { num: 3, name: "500 Free", type: "I" },
  { num: 4, name: "200 IM", type: "I" },
  { num: 5, name: "50 Free", type: "I" },
  { num: 6, name: "1M Diving", type: "I" },
  { num: 7, name: "400 Medley Relay", type: "R" },
  { num: 8, name: "100 Fly", type: "I" },
  { num: 9, name: "400 IM", type: "I" },
  { num: 10, name: "200 Free", type: "I" },
  { num: 11, name: "100 Breast", type: "I" },
  { num: 12, name: "100 Back", type: "I" },
  { num: 13, name: "3M Diving", type: "I" },
  { num: 14, name: "200 Free Relay", type: "R" },
  { num: 15, name: "1650 Free", type: "I" },
  { num: 16, name: "200 Back", type: "I" },
  { num: 17, name: "100 Free", type: "I" },
  { num: 18, name: "200 Breast", type: "I" },
  { num: 19, name: "200 Fly", type: "I" },
  { num: 20, name: "400 Free Relay", type: "R" },
];

const TEAM_COLORS = [
  { bg: "#1a2744", accent: "#3b82f6", light: "#dbeafe", text: "#93c5fd" },
  { bg: "#2d1b36", accent: "#a855f7", light: "#f3e8ff", text: "#c4b5fd" },
  { bg: "#1a2e1a", accent: "#22c55e", light: "#dcfce7", text: "#86efac" },
  { bg: "#2e2213", accent: "#f59e0b", light: "#fef3c7", text: "#fcd34d" },
  { bg: "#2e1313", accent: "#ef4444", light: "#fee2e2", text: "#fca5a5" },
  { bg: "#132e2e", accent: "#14b8a6", light: "#ccfbf1", text: "#5eead4" },
  { bg: "#2e1a2e", accent: "#ec4899", light: "#fce7f3", text: "#f9a8d4" },
  { bg: "#1f2415", accent: "#84cc16", light: "#ecfccb", text: "#bef264" },
];

const FINAL_COLORS = ["#38bdf8", "#a78bfa", "#fb923c", "#4ade80", "#f472b6", "#facc15"];
const STORAGE_KEY = "championship_scoring_v4";

function initTeam(n) { return { name: n || "", seeds: {}, currentScore: 0, thruEvent: 0 }; }

function calcPsychPoints(team, events, sc) {
  let total = 0; const byEvent = {}; const tp = getTotalPlaces(sc);
  events.forEach(ev => {
    let evT = 0;
    for (let p = 1; p <= tp; p++) { if (team.seeds[`${ev.num}-${p}`]) evT += getPointsForPlace(p, ev.type, sc); }
    byEvent[ev.num] = evT; total += evT;
  });
  return { total, byEvent };
}

function calcProjection(team, events, sc) {
  const psych = calcPsychPoints(team, events, sc); const thru = team.thruEvent || 0;
  if (thru === 0 || psych.total === 0) return { psychTotal: psych.total, currentScore: team.currentScore, pointsToGo: null, projected: null, byEvent: psych.byEvent };
  let psychThru = 0;
  events.forEach(ev => { if (ev.num <= thru) psychThru += (psych.byEvent[ev.num] || 0); });
  const pointsToGo = psych.total - psychThru;
  return { psychTotal: psych.total, currentScore: team.currentScore, pointsToGo, projected: team.currentScore + pointsToGo, byEvent: psych.byEvent };
}

function buildPlaceInfo(sc) {
  const info = [];
  for (let fi = 0; fi < sc.finals.length; fi++)
    for (let i = 0; i < sc.finals[fi].size; i++)
      info.push({ finalIndex: fi, finalName: sc.finals[fi].name, fc: FINAL_COLORS[fi % FINAL_COLORS.length] });
  return info;
}

// ─── SCORING SETUP ─────────────────────────────────────────────────
function ScoringSetup({ scoringConfig: sc, setScoringConfig: setSc }) {
  const tp = getTotalPlaces(sc);
  const addFinal = () => { setSc({ ...sc, finals: [...sc.finals, { name: `Final ${String.fromCharCode(65 + sc.finals.length)}`, size: 8, points: [0,0,0,0,0,0,0,0] }] }); };
  const removeFinal = i => { if (sc.finals.length <= 1) return; setSc({ ...sc, finals: sc.finals.filter((_, j) => j !== i) }); };
  const updateFinalName = (i, name) => { const f = [...sc.finals]; f[i] = { ...f[i], name }; setSc({ ...sc, finals: f }); };
  const updateFinalSize = (i, size) => {
    const s = Math.max(1, Math.min(16, parseInt(size) || 1)); const f = [...sc.finals];
    const old = f[i].points; f[i] = { ...f[i], size: s, points: Array.from({ length: s }, (_, j) => old[j] !== undefined ? old[j] : 0) };
    setSc({ ...sc, finals: f });
  };
  const updatePoints = (fi, pi, v) => { const f = [...sc.finals]; const pts = [...f[fi].points]; pts[pi] = Math.max(0, parseInt(v) || 0); f[fi] = { ...f[fi], points: pts }; setSc({ ...sc, finals: f }); };
  const updateRelay = v => { setSc({ ...sc, relayMultiplier: Math.max(1, parseFloat(v) || 1) }); };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "16px 16px 100px" }}>
      <div style={{ background: "rgba(56,189,248,0.06)", border: "1px solid rgba(56,189,248,0.15)", borderRadius: 10, padding: "12px 16px", marginBottom: 20, display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center" }}>
        <div><div style={{ fontSize: 10, color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Finals</div><div style={{ fontSize: 18, fontWeight: 800, color: "#38bdf8" }}>{sc.finals.length}</div></div>
        <div><div style={{ fontSize: 10, color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Total places</div><div style={{ fontSize: 18, fontWeight: 800, color: "#38bdf8" }}>{tp}</div></div>
        <div><div style={{ fontSize: 10, color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Max indiv pts</div><div style={{ fontSize: 18, fontWeight: 800, color: "#38bdf8" }}>{sc.finals[0]?.points[0] || 0}</div></div>
        <div>
          <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Relay multiplier</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input type="number" value={sc.relayMultiplier} onChange={e => updateRelay(e.target.value)} min="1" max="4" step="0.5"
              style={{ width: 56, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(56,189,248,0.3)", borderRadius: 6, padding: "4px 8px", color: "#38bdf8", fontSize: 16, fontWeight: 800, outline: "none", textAlign: "center" }} />
            <span style={{ fontSize: 12, color: "#64748b" }}>x</span>
          </div>
        </div>
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Finals Configuration</div>
      {sc.finals.map((final, fi) => {
        const fc = FINAL_COLORS[fi % FINAL_COLORS.length];
        const startPlace = sc.finals.slice(0, fi).reduce((s, f) => s + f.size, 0) + 1;
        return (
          <div key={fi} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 16, marginBottom: 12, borderLeft: `3px solid ${fc}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <input value={final.name} onChange={e => updateFinalName(fi, e.target.value)}
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "6px 10px", color: fc, fontSize: 14, fontWeight: 700, outline: "none", width: 130 }} />
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 11, color: "#64748b" }}>Swimmers:</span>
                  <input type="number" value={final.size} onChange={e => updateFinalSize(fi, e.target.value)} min="1" max="16"
                    style={{ width: 50, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "6px 8px", color: "#e2e8f0", fontSize: 13, fontWeight: 700, outline: "none", textAlign: "center" }} />
                </div>
                <span style={{ fontSize: 11, color: "#475569" }}>Places {startPlace}–{startPlace + final.size - 1}</span>
              </div>
              {sc.finals.length > 1 && <button onClick={() => removeFinal(fi)} style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 6, padding: "4px 10px", color: "#fca5a5", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>Remove</button>}
            </div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {final.points.map((pts, pi) => (
                <div key={pi} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 9, color: "#475569", marginBottom: 2, fontWeight: 600 }}>{pi + 1}{pi === 0 ? "st" : pi === 1 ? "nd" : pi === 2 ? "rd" : "th"}</div>
                  <input type="number" value={pts} onChange={e => updatePoints(fi, pi, e.target.value)} min="0" max="999"
                    style={{ width: 44, height: 36, background: pts > 0 ? `${fc}15` : "rgba(255,255,255,0.04)", border: pts > 0 ? `1px solid ${fc}40` : "1px solid rgba(255,255,255,0.06)", borderRadius: 6, padding: "0 4px", color: pts > 0 ? fc : "#475569", fontSize: 14, fontWeight: 700, outline: "none", textAlign: "center" }} />
                </div>
              ))}
            </div>
          </div>
        );
      })}
      <button onClick={addFinal} style={{ width: "100%", background: "rgba(56,189,248,0.08)", border: "1px dashed rgba(56,189,248,0.3)", borderRadius: 8, padding: "10px", color: "#38bdf8", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>+ Add Final</button>
      <div style={{ marginTop: 24, fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Complete Points Table Preview</div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12 }}>
          <thead><tr>
            <th style={{ textAlign: "left", padding: "6px 8px", color: "#64748b", fontWeight: 600, fontSize: 10, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>Place</th>
            <th style={{ textAlign: "left", padding: "6px 8px", color: "#64748b", fontWeight: 600, fontSize: 10, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>Final</th>
            <th style={{ textAlign: "right", padding: "6px 8px", color: "#64748b", fontWeight: 600, fontSize: 10, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>Indiv Pts</th>
            <th style={{ textAlign: "right", padding: "6px 8px", color: "#64748b", fontWeight: 600, fontSize: 10, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>Relay Pts</th>
          </tr></thead>
          <tbody>{(() => { let place = 0; return sc.finals.map((final, fi) => { const fc = FINAL_COLORS[fi % FINAL_COLORS.length]; return final.points.map((pts, pi) => { place++; return (
            <tr key={`${fi}-${pi}`}>
              <td style={{ padding: "4px 8px", color: "#94a3b8", fontWeight: 600, borderBottom: "1px solid rgba(255,255,255,0.03)" }}>{place}</td>
              <td style={{ padding: "4px 8px", borderBottom: "1px solid rgba(255,255,255,0.03)" }}><span style={{ fontSize: 10, color: fc, fontWeight: 700, padding: "2px 6px", background: `${fc}15`, borderRadius: 4 }}>{final.name}</span></td>
              <td style={{ padding: "4px 8px", textAlign: "right", fontWeight: 700, color: pts > 0 ? "#e2e8f0" : "#334155", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>{pts || "—"}</td>
              <td style={{ padding: "4px 8px", textAlign: "right", fontWeight: 700, color: pts > 0 ? "#818cf8" : "#334155", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>{pts > 0 ? pts * sc.relayMultiplier : "—"}</td>
            </tr>); }); }); })()}</tbody>
        </table>
      </div>
    </div>
  );
}

// ─── HEADER ────────────────────────────────────────────────────────
function Header({ view, setView, meetName, setMeetName, onReset }) {
  const [editing, setEditing] = useState(false);
  return (
    <div style={{ background: "linear-gradient(135deg, #0c1220 0%, #1a1a2e 50%, #16213e 100%)", borderBottom: "1px solid rgba(56, 189, 248, 0.15)", position: "sticky", top: 0, zIndex: 100 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "12px 16px 8px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: "linear-gradient(135deg, #38bdf8, #818cf8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, color: "#0c1220", boxShadow: "0 0 20px rgba(56,189,248,0.3)" }}>S</div>
            {editing ? (
              <input autoFocus value={meetName} onChange={e => setMeetName(e.target.value)} onBlur={() => setEditing(false)} onKeyDown={e => e.key === "Enter" && setEditing(false)}
                style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(56,189,248,0.3)", borderRadius: 6, padding: "4px 10px", color: "#e2e8f0", fontSize: 16, fontWeight: 700, outline: "none", width: 220 }} />
            ) : (
              <div onClick={() => setEditing(true)} style={{ cursor: "pointer" }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#e2e8f0", letterSpacing: "-0.02em", lineHeight: 1.1 }}>{meetName || "Championship Meet"}</div>
                <div style={{ fontSize: 10, color: "#64748b", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600 }}>Tap to rename</div>
              </div>
            )}
          </div>
          <button onClick={onReset} style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 6, padding: "6px 10px", color: "#fca5a5", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>Reset All</button>
        </div>
        <div style={{ display: "flex", gap: 4, overflowX: "auto", paddingBottom: 2 }}>
          {[{ key: "dashboard", label: "Dashboard", icon: "◉" }, { key: "scoring", label: "Scoring", icon: "✦" }, { key: "events", label: "Events", icon: "☰" }, { key: "psych", label: "Psych Sheets", icon: "⊞" }, { key: "live", label: "Live", icon: "◈" }, { key: "scenario", label: "What-If", icon: "⚡" }].map(t => (
            <button key={t.key} onClick={() => setView(t.key)} style={{
              background: view === t.key ? "rgba(56,189,248,0.15)" : "transparent", border: view === t.key ? "1px solid rgba(56,189,248,0.3)" : "1px solid transparent",
              borderRadius: 6, padding: "7px 14px", color: view === t.key ? "#38bdf8" : "#64748b", fontSize: 12, cursor: "pointer", fontWeight: view === t.key ? 700 : 500, whiteSpace: "nowrap", transition: "all 0.15s",
            }}><span style={{ marginRight: 4 }}>{t.icon}</span>{t.label}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── DASHBOARD ─────────────────────────────────────────────────────
function Dashboard({ teams, events, sc, setView, setActiveTeam }) {
  const projections = teams.map(t => calcProjection(t, events, sc));
  const maxP = Math.max(...projections.map(p => p.projected || p.psychTotal || 0), 1);
  const sorted = teams.map((t, i) => ({ team: t, proj: projections[i], idx: i })).sort((a, b) => (b.proj.projected || b.proj.psychTotal || 0) - (a.proj.projected || a.proj.psychTotal || 0));
  const hasLive = teams.some(t => t.thruEvent > 0);
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "16px 16px 100px" }}>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 12, background: "rgba(129,140,248,0.08)", border: "1px solid rgba(129,140,248,0.2)", borderRadius: 6, padding: "4px 12px", cursor: "pointer" }} onClick={() => setView("scoring")}>
        <span style={{ fontSize: 11, color: "#818cf8", fontWeight: 600 }}>{sc.finals.length} finals · {getTotalPlaces(sc)} places · {sc.relayMultiplier}x relay</span>
        <span style={{ fontSize: 10, color: "#64748b" }}>Edit</span>
      </div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>{hasLive ? "Live Projections" : "Psych Sheet Predictions"}</div>
        {sorted.map(({ team, proj, idx }, rank) => {
          const tc = TEAM_COLORS[idx % TEAM_COLORS.length]; const score = proj.projected || proj.psychTotal || 0;
          const bw = maxP > 0 ? (score / maxP) * 100 : 0; const lead = rank === 0 && score > 0;
          return (
            <div key={idx} onClick={() => { setActiveTeam(idx); setView("psych"); }} style={{
              background: lead ? `linear-gradient(135deg, ${tc.bg}, rgba(56,189,248,0.08))` : "rgba(255,255,255,0.02)",
              border: lead ? `1px solid ${tc.accent}40` : "1px solid rgba(255,255,255,0.05)", borderRadius: 12, padding: "14px 16px", marginBottom: 8, cursor: "pointer", transition: "all 0.2s", boxShadow: lead ? `0 4px 24px ${tc.accent}15` : "none",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: `linear-gradient(135deg, ${tc.accent}, ${tc.accent}88)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#fff" }}>{rank + 1}</div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#e2e8f0" }}>{team.name || `Team ${idx + 1}`}</div>
                    {hasLive && team.thruEvent > 0 && <div style={{ fontSize: 10, color: "#64748b", fontWeight: 500 }}>Thru Event #{team.thruEvent} · Actual: {proj.currentScore}</div>}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: tc.text, lineHeight: 1 }}>{score}</div>
                  <div style={{ fontSize: 10, color: "#64748b", fontWeight: 500 }}>{hasLive && proj.projected ? "projected" : "psych pts"}</div>
                </div>
              </div>
              <div style={{ height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${bw}%`, borderRadius: 3, background: `linear-gradient(90deg, ${tc.accent}, ${tc.accent}88)`, transition: "width 0.6s cubic-bezier(0.4,0,0.2,1)" }} />
              </div>
              {hasLive && proj.projected && proj.psychTotal > 0 && (
                <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
                  {[{ label: "Psych", value: proj.psychTotal }, { label: "Actual", value: proj.currentScore }, { label: "To Go", value: proj.pointsToGo }, { label: "Diff", value: proj.projected - proj.psychTotal, signed: true }].map((s, i) => (
                    <div key={i} style={{ flex: 1 }}>
                      <div style={{ fontSize: 9, color: "#475569", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: s.signed ? (s.value > 0 ? "#4ade80" : s.value < 0 ? "#f87171" : "#94a3b8") : "#cbd5e1" }}>{s.signed && s.value > 0 ? "+" : ""}{s.value ?? "—"}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {teams.filter(t => t.name).length > 0 && (
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Event-by-Event Breakdown</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead><tr>
                <th style={{ textAlign: "left", padding: "6px 8px", color: "#64748b", fontWeight: 600, fontSize: 10, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>#</th>
                <th style={{ textAlign: "left", padding: "6px 8px", color: "#64748b", fontWeight: 600, fontSize: 10, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>Event</th>
                {teams.filter(t => t.name).map((t, i) => <th key={i} style={{ textAlign: "right", padding: "6px 8px", color: TEAM_COLORS[i % TEAM_COLORS.length].text, fontWeight: 700, fontSize: 10, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>{t.name}</th>)}
              </tr></thead>
              <tbody>
                {events.filter(e => e.name).map(ev => { const scores = teams.filter(t => t.name).map(t => calcPsychPoints(t, [ev], sc).total); const mx = Math.max(...scores); return (
                  <tr key={ev.num}>
                    <td style={{ padding: "5px 8px", color: "#475569", fontWeight: 500, borderBottom: "1px solid rgba(255,255,255,0.03)" }}>{ev.num}</td>
                    <td style={{ padding: "5px 8px", color: "#94a3b8", fontWeight: 500, borderBottom: "1px solid rgba(255,255,255,0.03)", whiteSpace: "nowrap" }}>
                      <span style={{ fontSize: 9, color: ev.type === "R" ? "#818cf8" : "#64748b", fontWeight: 700, marginRight: 4, padding: "1px 4px", background: ev.type === "R" ? "rgba(129,140,248,0.1)" : "rgba(100,116,139,0.1)", borderRadius: 3 }}>{ev.type}</span>{ev.name}
                    </td>
                    {scores.map((s, i) => <td key={i} style={{ padding: "5px 8px", textAlign: "right", fontWeight: s === mx && s > 0 ? 800 : 500, color: s === mx && s > 0 ? TEAM_COLORS[i % TEAM_COLORS.length].text : "#475569", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>{s || "—"}</td>)}
                  </tr>); })}
                <tr>
                  <td colSpan={2} style={{ padding: "8px 8px", color: "#e2e8f0", fontWeight: 800, borderTop: "2px solid rgba(56,189,248,0.2)" }}>TOTAL</td>
                  {teams.filter(t => t.name).map((t, i) => <td key={i} style={{ padding: "8px 8px", textAlign: "right", fontWeight: 900, color: TEAM_COLORS[i % TEAM_COLORS.length].text, borderTop: "2px solid rgba(56,189,248,0.2)", fontSize: 14 }}>{calcPsychPoints(t, events, sc).total}</td>)}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── EVENT SETUP ───────────────────────────────────────────────────
function EventSetup({ events, setEvents }) {
  const upd = (i, f, v) => { const n = [...events]; n[i] = { ...n[i], [f]: v }; setEvents(n); };
  const add = () => { const num = events.length > 0 ? Math.max(...events.map(e => e.num)) + 1 : 1; setEvents([...events, { num, name: "", type: "I" }]); };
  const rem = i => { if (events.length > 1) setEvents(events.filter((_, j) => j !== i)); };
  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "16px 16px 100px" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Meet Events</div>
      <div style={{ fontSize: 12, color: "#475569", marginBottom: 16, lineHeight: 1.5 }}>Pre-loaded with the standard NCAA Championship order. Edit event names, toggle Individual/Relay, or add custom events.</div>
      {events.map((ev, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 8, padding: "8px 12px" }}>
          <div style={{ width: 28, fontSize: 12, color: "#64748b", fontWeight: 700, flexShrink: 0 }}>{ev.num}</div>
          <input value={ev.name} onChange={e => upd(i, "name", e.target.value)} placeholder="Event name..." style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: "6px 10px", color: "#e2e8f0", fontSize: 13, outline: "none" }} />
          <button onClick={() => upd(i, "type", ev.type === "I" ? "R" : "I")} style={{ background: ev.type === "R" ? "rgba(129,140,248,0.15)" : "rgba(100,116,139,0.1)", border: ev.type === "R" ? "1px solid rgba(129,140,248,0.3)" : "1px solid rgba(100,116,139,0.2)", borderRadius: 6, padding: "5px 12px", color: ev.type === "R" ? "#818cf8" : "#64748b", fontSize: 11, fontWeight: 700, cursor: "pointer", minWidth: 50, textAlign: "center" }}>{ev.type === "R" ? "Relay" : "Indiv"}</button>
          <button onClick={() => rem(i)} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 16, padding: "0 4px" }}>×</button>
        </div>
      ))}
      <button onClick={add} style={{ width: "100%", background: "rgba(56,189,248,0.08)", border: "1px dashed rgba(56,189,248,0.3)", borderRadius: 8, padding: "10px", color: "#38bdf8", fontSize: 12, fontWeight: 600, cursor: "pointer", marginTop: 8 }}>+ Add Event</button>
    </div>
  );
}

// ─── PSYCH SHEET ───────────────────────────────────────────────────
function PsychSheet({ teams, setTeams, events, sc, activeTeam, setActiveTeam }) {
  const team = teams[activeTeam] || teams[0]; const tc = TEAM_COLORS[activeTeam % TEAM_COLORS.length];
  const psych = calcPsychPoints(team, events, sc); const tp = getTotalPlaces(sc); const pi = buildPlaceInfo(sc);
  const toggle = (en, p) => { const k = `${en}-${p}`; const n = [...teams]; const s = { ...n[activeTeam].seeds }; s[k] = !s[k]; n[activeTeam] = { ...n[activeTeam], seeds: s }; setTeams(n); };
  const updField = (f, v) => { const n = [...teams]; n[activeTeam] = { ...n[activeTeam], [f]: v }; setTeams(n); };
  const addT = () => { if (teams.length < 8) setTeams([...teams, initTeam("")]); };
  const remT = i => { if (teams.length > 2) { const n = teams.filter((_, j) => j !== i); setTeams(n); if (activeTeam >= n.length) setActiveTeam(n.length - 1); } };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "16px 16px 100px" }}>
      <div style={{ display: "flex", gap: 6, marginBottom: 12, overflowX: "auto", alignItems: "center" }}>
        {teams.map((t, i) => { const c = TEAM_COLORS[i % TEAM_COLORS.length]; return (
          <button key={i} onClick={() => setActiveTeam(i)} style={{ background: activeTeam === i ? `${c.accent}20` : "rgba(255,255,255,0.02)", border: activeTeam === i ? `1px solid ${c.accent}40` : "1px solid rgba(255,255,255,0.05)", borderRadius: 8, padding: "8px 14px", cursor: "pointer", whiteSpace: "nowrap", color: activeTeam === i ? c.text : "#64748b", fontSize: 12, fontWeight: activeTeam === i ? 700 : 500, transition: "all 0.15s" }}>
            {t.name || `Team ${i + 1}`}{teams.length > 2 && activeTeam === i && <span onClick={e => { e.stopPropagation(); remT(i); }} style={{ marginLeft: 6, color: "#64748b", fontSize: 14 }}>×</span>}
          </button>); })}
        {teams.length < 8 && <button onClick={addT} style={{ background: "none", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 12px", color: "#475569", fontSize: 12, cursor: "pointer" }}>+</button>}
      </div>
      <div style={{ background: `linear-gradient(135deg, ${tc.bg}, rgba(0,0,0,0.3))`, border: `1px solid ${tc.accent}30`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: "1 1 160px" }}>
            <label style={{ display: "block", fontSize: 10, color: "#64748b", fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Team Name</label>
            <input value={team.name} onChange={e => updField("name", e.target.value)} placeholder="Enter team name..." style={{ width: "100%", background: "rgba(255,255,255,0.08)", border: `1px solid ${tc.accent}30`, borderRadius: 6, padding: "8px 10px", color: "#e2e8f0", fontSize: 14, outline: "none", fontWeight: 700, boxSizing: "border-box" }} />
          </div>
          <div style={{ flex: "0 0 100px" }}>
            <label style={{ display: "block", fontSize: 10, color: "#64748b", fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Actual Score</label>
            <input type="number" value={team.currentScore || ""} onChange={e => updField("currentScore", parseInt(e.target.value) || 0)} placeholder="0" style={{ width: "100%", background: "rgba(255,255,255,0.08)", border: `1px solid ${tc.accent}30`, borderRadius: 6, padding: "8px 10px", color: tc.text, fontSize: 14, outline: "none", fontWeight: 700, textAlign: "center", boxSizing: "border-box" }} />
          </div>
          <div style={{ flex: "0 0 100px" }}>
            <label style={{ display: "block", fontSize: 10, color: "#64748b", fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Thru Event #</label>
            <input type="number" value={team.thruEvent || ""} onChange={e => updField("thruEvent", parseInt(e.target.value) || 0)} placeholder="0" min="0" max={events.length} style={{ width: "100%", background: "rgba(255,255,255,0.08)", border: `1px solid ${tc.accent}30`, borderRadius: 6, padding: "8px 10px", color: tc.text, fontSize: 14, outline: "none", fontWeight: 700, textAlign: "center", boxSizing: "border-box" }} />
          </div>
          <div style={{ background: `${tc.accent}15`, border: `1px solid ${tc.accent}30`, borderRadius: 8, padding: "8px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Psych Total</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: tc.text }}>{psych.total}</div>
          </div>
        </div>
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Seeding — Tap places where {team.name || "this team"} has swimmers</div>
      <div style={{ overflowX: "auto", paddingBottom: 8 }}>
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              <th style={{ position: "sticky", left: 0, background: "#0f172a", zIndex: 10 }}></th>
              {pi.map((p, idx) => { const isFirst = idx === 0 || pi[idx - 1].finalIndex !== p.finalIndex; if (!isFirst) return null;
                return <th key={idx} colSpan={sc.finals[p.finalIndex].size} style={{ padding: "4px 0", fontSize: 9, color: p.fc, fontWeight: 700, textAlign: "center", borderBottom: `2px solid ${p.fc}40` }}>{p.finalName}</th>; })}
              <th></th>
            </tr>
            <tr>
              <th style={{ position: "sticky", left: 0, background: "#0f172a", zIndex: 10, padding: "4px 4px", fontSize: 9, color: "#475569", fontWeight: 600, textAlign: "left", minWidth: 90, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>Event</th>
              {pi.map((_, idx) => <th key={idx} style={{ padding: "4px 0", fontSize: 9, color: "#475569", fontWeight: 600, textAlign: "center", minWidth: 28, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>{idx + 1}</th>)}
              <th style={{ padding: "4px 4px", fontSize: 9, color: tc.text, fontWeight: 700, textAlign: "right", minWidth: 40, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>Pts</th>
            </tr>
          </thead>
          <tbody>
            {events.filter(e => e.name).map(ev => { const evPts = psych.byEvent[ev.num] || 0; return (
              <tr key={ev.num}>
                <td style={{ position: "sticky", left: 0, background: "#0f172a", zIndex: 10, padding: "4px 4px", fontSize: 11, color: "#94a3b8", fontWeight: 500, borderBottom: "1px solid rgba(255,255,255,0.03)", whiteSpace: "nowrap" }}>
                  <span style={{ fontSize: 8, color: ev.type === "R" ? "#818cf8" : "#475569", fontWeight: 700, marginRight: 3, padding: "1px 3px", background: ev.type === "R" ? "rgba(129,140,248,0.1)" : "transparent", borderRadius: 2 }}>{ev.type}</span>{ev.name}
                </td>
                {Array.from({ length: tp }, (_, p) => { const place = p + 1; const active = !!team.seeds[`${ev.num}-${place}`]; const pts = active ? getPointsForPlace(place, ev.type, sc) : 0; const pInfo = pi[p]; return (
                  <td key={p} style={{ padding: "2px 1px", textAlign: "center", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                    <button onClick={() => toggle(ev.num, place)} style={{ width: 26, height: 26, borderRadius: 5, background: active ? `linear-gradient(135deg, ${tc.accent}, ${tc.accent}cc)` : "rgba(255,255,255,0.03)", border: active ? "none" : `1px solid ${pInfo.fc}15`, color: active ? "#fff" : "transparent", cursor: "pointer", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.1s", boxShadow: active ? `0 2px 8px ${tc.accent}40` : "none", padding: 0 }}>{active ? pts : ""}</button>
                  </td>); })}
                <td style={{ padding: "4px 4px", textAlign: "right", fontSize: 13, fontWeight: evPts > 0 ? 800 : 400, color: evPts > 0 ? tc.text : "#334155", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>{evPts || "—"}</td>
              </tr>); })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── WHAT-IF ───────────────────────────────────────────────────────
function WhatIfScenario({ teams, events, sc }) {
  const [sTeams, setSTeams] = useState(null); const [selEv, setSelEv] = useState(events[0]?.num || 1);
  const tp = getTotalPlaces(sc); const pi = buildPlaceInfo(sc);
  useEffect(() => { setSTeams(JSON.parse(JSON.stringify(teams))); }, []);
  if (!sTeams) return null;
  const toggleS = (ti, en, p) => { const n = [...sTeams]; const s = { ...n[ti].seeds }; s[`${en}-${p}`] = !s[`${en}-${p}`]; n[ti] = { ...n[ti], seeds: s }; setSTeams(n); };
  const ev = events.find(e => e.num === selEv) || events[0]; const aTeams = sTeams.filter(t => t.name);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "16px 16px 100px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em" }}>What-If Scenario Builder</div>
          <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>Modify seeds to see how results change. Your actual psych sheet is safe.</div>
        </div>
        <button onClick={() => setSTeams(JSON.parse(JSON.stringify(teams)))} style={{ background: "rgba(56,189,248,0.1)", border: "1px solid rgba(56,189,248,0.2)", borderRadius: 6, padding: "6px 12px", color: "#38bdf8", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Reset to Psych</button>
      </div>
      <div style={{ display: "flex", gap: 4, overflowX: "auto", marginBottom: 16, paddingBottom: 4 }}>
        {events.filter(e => e.name).map(e => (
          <button key={e.num} onClick={() => setSelEv(e.num)} style={{ background: selEv === e.num ? "rgba(56,189,248,0.15)" : "rgba(255,255,255,0.02)", border: selEv === e.num ? "1px solid rgba(56,189,248,0.3)" : "1px solid rgba(255,255,255,0.05)", borderRadius: 6, padding: "6px 10px", cursor: "pointer", whiteSpace: "nowrap", color: selEv === e.num ? "#38bdf8" : "#64748b", fontSize: 11, fontWeight: selEv === e.num ? 700 : 500 }}>#{e.num}</button>
        ))}
      </div>
      {ev && (
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0", marginBottom: 4 }}>#{ev.num} {ev.name}<span style={{ fontSize: 10, color: ev.type === "R" ? "#818cf8" : "#64748b", fontWeight: 700, marginLeft: 8, padding: "2px 6px", background: ev.type === "R" ? "rgba(129,140,248,0.1)" : "rgba(100,116,139,0.1)", borderRadius: 4 }}>{ev.type === "R" ? "Relay" : "Individual"}</span></div>
          <div style={{ fontSize: 11, color: "#475569", marginBottom: 12 }}>Tap cells to toggle seeds. Points update instantly.</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%" }}>
              <thead>
                <tr><th style={{ padding: "4px 8px" }}></th>{pi.map((p, idx) => { const isF = idx === 0 || pi[idx-1].finalIndex !== p.finalIndex; if (!isF) return null; return <th key={idx} colSpan={sc.finals[p.finalIndex].size} style={{ padding: "4px 0", fontSize: 9, color: p.fc, fontWeight: 700, textAlign: "center", borderBottom: `2px solid ${p.fc}40` }}>{p.finalName}</th>; })}<th></th></tr>
                <tr><th style={{ padding: "6px 8px", fontSize: 10, color: "#475569", fontWeight: 600, textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>Team</th>{Array.from({ length: tp }, (_, i) => <th key={i} style={{ padding: "6px 0", fontSize: 9, color: "#475569", fontWeight: 600, textAlign: "center", minWidth: 28, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>{i + 1}</th>)}<th style={{ padding: "6px 8px", fontSize: 10, color: "#64748b", fontWeight: 700, textAlign: "right", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>Pts</th></tr>
              </thead>
              <tbody>
                {aTeams.map(t => { const ti = sTeams.indexOf(t); const tc = TEAM_COLORS[ti % TEAM_COLORS.length]; const evPts = calcPsychPoints(t, [ev], sc).total; return (
                  <tr key={ti}>
                    <td style={{ padding: "4px 8px", fontSize: 12, color: tc.text, fontWeight: 700, borderBottom: "1px solid rgba(255,255,255,0.03)", whiteSpace: "nowrap" }}>{t.name}</td>
                    {Array.from({ length: tp }, (_, p) => { const place = p+1; const active = !!t.seeds[`${ev.num}-${place}`]; const pts = active ? getPointsForPlace(place, ev.type, sc) : 0; return (
                      <td key={p} style={{ padding: "2px 1px", textAlign: "center", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                        <button onClick={() => toggleS(ti, ev.num, place)} style={{ width: 26, height: 26, borderRadius: 5, background: active ? `linear-gradient(135deg, ${tc.accent}, ${tc.accent}cc)` : "rgba(255,255,255,0.03)", border: active ? "none" : "1px solid rgba(255,255,255,0.06)", color: active ? "#fff" : "transparent", cursor: "pointer", fontSize: 9, fontWeight: 700, padding: 0, transition: "all 0.1s", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: active ? `0 2px 8px ${tc.accent}40` : "none" }}>{active ? pts : ""}</button>
                      </td>); })}
                    <td style={{ padding: "4px 8px", textAlign: "right", fontSize: 14, fontWeight: 800, color: evPts > 0 ? tc.text : "#334155", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>{evPts || "—"}</td>
                  </tr>); })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12, padding: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Scenario vs. Original Psych</div>
        {aTeams.map(t => { const ti = sTeams.indexOf(t); const tc = TEAM_COLORS[ti % TEAM_COLORS.length]; const sPts = calcPsychPoints(t, events, sc).total; const oPts = calcPsychPoints(teams[ti], events, sc).total; const diff = sPts - oPts; return (
          <div key={ti} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: tc.text }}>{t.name}</div>
            <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
              <div style={{ textAlign: "center" }}><div style={{ fontSize: 9, color: "#475569", fontWeight: 600 }}>Original</div><div style={{ fontSize: 14, fontWeight: 700, color: "#94a3b8" }}>{oPts}</div></div>
              <div style={{ fontSize: 16, color: "#334155" }}>→</div>
              <div style={{ textAlign: "center" }}><div style={{ fontSize: 9, color: "#475569", fontWeight: 600 }}>Scenario</div><div style={{ fontSize: 14, fontWeight: 700, color: tc.text }}>{sPts}</div></div>
              <div style={{ fontSize: 13, fontWeight: 800, color: diff > 0 ? "#4ade80" : diff < 0 ? "#f87171" : "#475569", minWidth: 50, textAlign: "right" }}>{diff > 0 ? "+" : ""}{diff}</div>
            </div>
          </div>); })}
      </div>
    </div>
  );
}

// ─── LIVE RESULTS ──────────────────────────────────────────────────
function LiveResults({ teams, setTeams, events, sc }) {
  const [resultsUrl, setResultsUrl] = useState("");
  const [status, setStatus] = useState("idle"); // idle, loading, connected, error
  const [eventLinks, setEventLinks] = useState([]);
  const [parsedEvents, setParsedEvents] = useState([]);
  const [teamMap, setTeamMap] = useState({}); // maps result school names -> team index
  const [error, setError] = useState("");
  const [lastPoll, setLastPoll] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Fetch the index page to discover event links
  const connectToMeet = async () => {
    if (!resultsUrl.trim()) return;
    setStatus("loading"); setError("");
    try {
      let baseUrl = resultsUrl.trim();
      if (!baseUrl.endsWith("/")) baseUrl += "/";
      const resp = await fetch(`/api/results?mode=index&url=${encodeURIComponent(baseUrl)}`);
      const data = await resp.json();
      if (data.error) { setError(data.error); setStatus("error"); return; }
      if (!data.links || data.links.length === 0) { setError("No event links found on that page. Make sure this is a HyTek results URL."); setStatus("error"); return; }
      setEventLinks(data.links);
      setStatus("connected");
    } catch (e) { setError(`Connection failed: ${e.message}`); setStatus("error"); }
  };

  // Fetch and parse all finals events
  const fetchAllResults = async () => {
    if (eventLinks.length === 0) return;
    setStatus("loading");
    const results = [];
    // Only fetch finals pages (F in the filename)
    const finalsLinks = eventLinks.filter(l => /F\d+\.htm/i.test(l.url));
    for (const link of finalsLinks) {
      try {
        const resp = await fetch(`/api/results?mode=event&url=${encodeURIComponent(link.url)}`);
        const data = await resp.json();
        if (data.event) results.push(data.event);
      } catch (e) { /* skip failed fetches */ }
    }
    setParsedEvents(results);
    setLastPoll(new Date());
    setStatus("connected");

    // Auto-detect team names from results
    const schoolNames = new Set();
    results.forEach(ev => ev.results.forEach(r => schoolNames.add(r.school)));
    const newMap = { ...teamMap };
    schoolNames.forEach(s => {
      if (newMap[s] === undefined) {
        // Try to auto-match to existing teams
        const matchIdx = teams.findIndex(t => t.name && (
          t.name.toLowerCase() === s.toLowerCase() ||
          s.toLowerCase().includes(t.name.toLowerCase()) ||
          t.name.toLowerCase().includes(s.toLowerCase())
        ));
        if (matchIdx >= 0) newMap[s] = matchIdx;
      }
    });
    setTeamMap(newMap);
  };

  // Apply results to team seeds
  const applyResults = () => {
    const next = teams.map(t => ({ ...t, seeds: { ...t.seeds } }));
    let maxEventApplied = 0;

    parsedEvents.forEach(ev => {
      ev.results.forEach(r => {
        const teamIdx = teamMap[r.school];
        if (teamIdx === undefined || teamIdx < 0) return;
        const key = `${ev.eventNum}-${r.place}`;
        next[teamIdx].seeds[key] = true;
        if (ev.eventNum > maxEventApplied) maxEventApplied = ev.eventNum;
      });
    });

    // Update actual scores from team rankings if available
    const latestRankings = parsedEvents.filter(e => e.rankings.length > 0).sort((a, b) => b.eventNum - a.eventNum)[0];
    if (latestRankings) {
      latestRankings.rankings.forEach(r => {
        const teamIdx = Object.entries(teamMap).find(([school]) =>
          r.team.toLowerCase().includes(school.toLowerCase()) || school.toLowerCase().includes(r.team.toLowerCase())
        );
        if (teamIdx && teamIdx[1] >= 0) {
          next[teamIdx[1]].currentScore = r.score;
          next[teamIdx[1]].thruEvent = latestRankings.eventNum;
        }
      });
    }

    setTeams(next);
  };

  // Auto-refresh polling
  useEffect(() => {
    if (!autoRefresh || eventLinks.length === 0) return;
    const interval = setInterval(() => { fetchAllResults(); }, 90000); // 90 second poll
    return () => clearInterval(interval);
  }, [autoRefresh, eventLinks]);

  const unmappedSchools = [...new Set(parsedEvents.flatMap(e => e.results.map(r => r.school)))].filter(s => teamMap[s] === undefined);
  const mappedSchools = Object.entries(teamMap).filter(([_, v]) => v !== undefined && v >= 0);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "16px 16px 100px" }}>
      {/* Connection */}
      <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Connect to Live Results</div>
      <div style={{ fontSize: 12, color: "#475569", marginBottom: 12, lineHeight: 1.5 }}>
        Paste the URL of a HyTek meet results page (e.g. from swimmeetresults.tech). The app will fetch event results and import placements automatically.
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input value={resultsUrl} onChange={e => setResultsUrl(e.target.value)} placeholder="https://swimmeetresults.tech/Your-Meet-2026/"
          onKeyDown={e => e.key === "Enter" && connectToMeet()}
          style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "10px 14px", color: "#e2e8f0", fontSize: 13, outline: "none" }} />
        <button onClick={connectToMeet} disabled={status === "loading"} style={{
          background: status === "connected" ? "rgba(34,197,94,0.15)" : "rgba(56,189,248,0.15)",
          border: status === "connected" ? "1px solid rgba(34,197,94,0.3)" : "1px solid rgba(56,189,248,0.3)",
          borderRadius: 8, padding: "10px 20px", color: status === "connected" ? "#4ade80" : "#38bdf8",
          fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
        }}>{status === "loading" ? "Loading..." : status === "connected" ? "Reconnect" : "Connect"}</button>
      </div>
      {error && <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "10px 14px", color: "#fca5a5", fontSize: 12, marginBottom: 16 }}>{error}</div>}

      {/* Connected state */}
      {status === "connected" && eventLinks.length > 0 && (
        <>
          {/* Status bar */}
          <div style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)", borderRadius: 10, padding: "12px 16px", marginBottom: 20, display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center" }}>
            <div><div style={{ fontSize: 10, color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Event pages</div><div style={{ fontSize: 18, fontWeight: 800, color: "#4ade80" }}>{eventLinks.length}</div></div>
            <div><div style={{ fontSize: 10, color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Parsed</div><div style={{ fontSize: 18, fontWeight: 800, color: "#4ade80" }}>{parsedEvents.length}</div></div>
            <div><div style={{ fontSize: 10, color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Last poll</div><div style={{ fontSize: 14, fontWeight: 600, color: "#94a3b8" }}>{lastPoll ? lastPoll.toLocaleTimeString() : "—"}</div></div>
            <button onClick={fetchAllResults} disabled={status === "loading"} style={{
              background: "rgba(56,189,248,0.1)", border: "1px solid rgba(56,189,248,0.2)", borderRadius: 6, padding: "6px 14px", color: "#38bdf8", fontSize: 11, fontWeight: 600, cursor: "pointer",
            }}>Fetch Results</button>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#64748b", cursor: "pointer" }}>
              <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} style={{ accentColor: "#38bdf8" }} />
              Auto-refresh (90s)
            </label>
          </div>

          {/* Team mapping */}
          {parsedEvents.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>
                Team Mapping — Match result teams to your teams
              </div>
              <div style={{ fontSize: 12, color: "#475569", marginBottom: 12, lineHeight: 1.5 }}>
                Teams from the results need to be mapped to your team list. The app auto-matches by name when possible. Fix any that are wrong or unmapped.
              </div>
              {[...new Set(parsedEvents.flatMap(e => e.results.map(r => r.school)))].sort().map(school => (
                <div key={school} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 8, padding: "6px 12px" }}>
                  <div style={{ flex: 1, fontSize: 13, color: teamMap[school] !== undefined && teamMap[school] >= 0 ? "#4ade80" : "#94a3b8", fontWeight: 600 }}>{school}</div>
                  <span style={{ fontSize: 11, color: "#475569" }}>→</span>
                  <select value={teamMap[school] !== undefined ? teamMap[school] : -1}
                    onChange={e => setTeamMap({ ...teamMap, [school]: parseInt(e.target.value) })}
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "5px 8px", color: "#e2e8f0", fontSize: 12, outline: "none" }}>
                    <option value={-1}>— Skip —</option>
                    {teams.map((t, i) => t.name && <option key={i} value={i}>{t.name}</option>)}
                  </select>
                </div>
              ))}
            </div>
          )}

          {/* Apply button */}
          {parsedEvents.length > 0 && (
            <button onClick={applyResults} style={{
              width: "100%", background: "linear-gradient(135deg, rgba(34,197,94,0.2), rgba(56,189,248,0.2))",
              border: "1px solid rgba(34,197,94,0.3)", borderRadius: 10, padding: "14px",
              color: "#4ade80", fontSize: 14, fontWeight: 700, cursor: "pointer",
              marginBottom: 20,
            }}>Apply Results to Psych Sheets ({parsedEvents.length} events)</button>
          )}

          {/* Parsed events summary */}
          {parsedEvents.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Fetched Events</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {parsedEvents.map(ev => (
                  <div key={ev.eventNum} style={{
                    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 6, padding: "6px 10px",
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8" }}>#{ev.eventNum}</div>
                    <div style={{ fontSize: 10, color: "#475569" }}>{ev.eventName?.substring(0, 25)}</div>
                    <div style={{ fontSize: 10, color: ev.isRelay ? "#818cf8" : "#475569" }}>{ev.results.length} results</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── MAIN APP ──────────────────────────────────────────────────────
export default function ChampionshipScoring() {
  const [view, setView] = useState("dashboard");
  const [meetName, setMeetName] = useState("Championship Meet");
  const [teams, setTeams] = useState([initTeam(""), initTeam(""), initTeam(""), initTeam("")]);
  const [events, setEvents] = useState([...DEFAULT_EVENTS]);
  const [sc, setSc] = useState(defaultScoringConfig());
  const [activeTeam, setActiveTeam] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try { const saved = localStorage.getItem(STORAGE_KEY); if (saved) { const d = JSON.parse(saved); if (d.teams) setTeams(d.teams); if (d.events) setEvents(d.events); if (d.meetName) setMeetName(d.meetName); if (d.scoringConfig) setSc(d.scoringConfig); } } catch (e) {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ teams, events, meetName, scoringConfig: sc })); } catch (e) {}
  }, [teams, events, meetName, sc, loaded]);

  const handleReset = () => {
    if (confirm("Reset all data? This cannot be undone.")) {
      setTeams([initTeam(""), initTeam(""), initTeam(""), initTeam("")]);
      setEvents([...DEFAULT_EVENTS]); setMeetName("Championship Meet"); setSc(defaultScoringConfig());
      setActiveTeam(0); setView("dashboard");
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    }
  };

  if (!loaded) return <div style={{ minHeight: "100vh", background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center", color: "#38bdf8", fontSize: 16, fontWeight: 600 }}>Loading...</div>;

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", color: "#e2e8f0" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      <Header view={view} setView={setView} meetName={meetName} setMeetName={setMeetName} onReset={handleReset} />
      {view === "dashboard" && <Dashboard teams={teams} events={events} sc={sc} setView={setView} setActiveTeam={setActiveTeam} />}
      {view === "scoring" && <ScoringSetup scoringConfig={sc} setScoringConfig={setSc} />}
      {view === "events" && <EventSetup events={events} setEvents={setEvents} />}
      {view === "psych" && <PsychSheet teams={teams} setTeams={setTeams} events={events} sc={sc} activeTeam={activeTeam} setActiveTeam={setActiveTeam} />}
      {view === "live" && <LiveResults teams={teams} setTeams={setTeams} events={events} sc={sc} />}
      {view === "scenario" && <WhatIfScenario teams={teams} events={events} sc={sc} />}
    </div>
  );
}
