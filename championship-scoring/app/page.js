'use client';

import { useState, useEffect } from "react";

const INDIVIDUAL_PTS = [32,28,27,26,25,24,23,22,20,17,16,15,14,13,12,11,9,7,6,5,4,3,2,1];
const RELAY_PTS = [64,56,54,52,50,48,46,44,40,34,32,30,28,26,24,22,18,14,12,10,8,6,4,2];

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

const STORAGE_KEY = "championship_scoring_v3";

function getPointsForPlace(place, eventType) {
  if (place < 1 || place > 24) return 0;
  return eventType === "R" ? RELAY_PTS[place - 1] : INDIVIDUAL_PTS[place - 1];
}

function initTeam(name) {
  return { name: name || "", seeds: {}, currentScore: 0, thruEvent: 0 };
}

function calcPsychPoints(team, events) {
  let total = 0;
  const byEvent = {};
  events.forEach((ev) => {
    let evTotal = 0;
    for (let p = 1; p <= 24; p++) {
      if (team.seeds[`${ev.num}-${p}`]) evTotal += getPointsForPlace(p, ev.type);
    }
    byEvent[ev.num] = evTotal;
    total += evTotal;
  });
  return { total, byEvent };
}

function calcProjection(team, events) {
  const psych = calcPsychPoints(team, events);
  const thru = team.thruEvent || 0;
  if (thru === 0 || psych.total === 0) {
    return { psychTotal: psych.total, currentScore: team.currentScore, pointsToGo: null, projected: null, byEvent: psych.byEvent };
  }
  let psychThru = 0;
  events.forEach((ev) => { if (ev.num <= thru) psychThru += (psych.byEvent[ev.num] || 0); });
  const pointsToGo = psych.total - psychThru;
  const projected = team.currentScore + pointsToGo;
  return { psychTotal: psych.total, currentScore: team.currentScore, pointsToGo, projected, byEvent: psych.byEvent };
}

function Header({ view, setView, meetName, setMeetName, onReset }) {
  const [editing, setEditing] = useState(false);
  return (
    <div style={{
      background: "linear-gradient(135deg, #0c1220 0%, #1a1a2e 50%, #16213e 100%)",
      borderBottom: "1px solid rgba(56, 189, 248, 0.15)",
      position: "sticky", top: 0, zIndex: 100,
    }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "12px 16px 8px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: "linear-gradient(135deg, #38bdf8, #818cf8)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, fontWeight: 800, color: "#0c1220",
              boxShadow: "0 0 20px rgba(56,189,248,0.3)",
            }}>S</div>
            {editing ? (
              <input autoFocus value={meetName} onChange={e => setMeetName(e.target.value)}
                onBlur={() => setEditing(false)} onKeyDown={e => e.key === "Enter" && setEditing(false)}
                style={{
                  background: "rgba(255,255,255,0.1)", border: "1px solid rgba(56,189,248,0.3)",
                  borderRadius: 6, padding: "4px 10px", color: "#e2e8f0", fontSize: 16, fontWeight: 700, outline: "none", width: 220,
                }} />
            ) : (
              <div onClick={() => setEditing(true)} style={{ cursor: "pointer" }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#e2e8f0", letterSpacing: "-0.02em", lineHeight: 1.1 }}>{meetName || "Championship Meet"}</div>
                <div style={{ fontSize: 10, color: "#64748b", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600 }}>Tap to rename</div>
              </div>
            )}
          </div>
          <button onClick={onReset} style={{
            background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: 6, padding: "6px 10px", color: "#fca5a5", fontSize: 11, cursor: "pointer", fontWeight: 600,
          }}>Reset All</button>
        </div>
        <div style={{ display: "flex", gap: 4, overflowX: "auto", paddingBottom: 2 }}>
          {[
            { key: "dashboard", label: "Dashboard", icon: "◉" },
            { key: "events", label: "Events", icon: "☰" },
            { key: "psych", label: "Psych Sheets", icon: "⊞" },
            { key: "scenario", label: "What-If", icon: "⚡" },
          ].map(t => (
            <button key={t.key} onClick={() => setView(t.key)} style={{
              background: view === t.key ? "rgba(56,189,248,0.15)" : "transparent",
              border: view === t.key ? "1px solid rgba(56,189,248,0.3)" : "1px solid transparent",
              borderRadius: 6, padding: "7px 14px", color: view === t.key ? "#38bdf8" : "#64748b",
              fontSize: 12, cursor: "pointer", fontWeight: view === t.key ? 700 : 500, whiteSpace: "nowrap", transition: "all 0.15s",
            }}><span style={{ marginRight: 4 }}>{t.icon}</span>{t.label}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Dashboard({ teams, events, setView, setActiveTeam }) {
  const projections = teams.map(t => calcProjection(t, events));
  const maxProjected = Math.max(...projections.map(p => p.projected || p.psychTotal || 0), 1);
  const sorted = teams.map((t, i) => ({ team: t, proj: projections[i], idx: i }))
    .sort((a, b) => (b.proj.projected || b.proj.psychTotal || 0) - (a.proj.projected || a.proj.psychTotal || 0));
  const hasLiveData = teams.some(t => t.thruEvent > 0);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "16px 16px 100px" }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>
          {hasLiveData ? "Live Projections" : "Psych Sheet Predictions"}
        </div>
        {sorted.map(({ team, proj, idx }, rank) => {
          const tc = TEAM_COLORS[idx % TEAM_COLORS.length];
          const score = proj.projected || proj.psychTotal || 0;
          const barWidth = maxProjected > 0 ? (score / maxProjected) * 100 : 0;
          const isLeader = rank === 0 && score > 0;
          return (
            <div key={idx} onClick={() => { setActiveTeam(idx); setView("psych"); }}
              style={{
                background: isLeader ? `linear-gradient(135deg, ${tc.bg}, rgba(56,189,248,0.08))` : "rgba(255,255,255,0.02)",
                border: isLeader ? `1px solid ${tc.accent}40` : "1px solid rgba(255,255,255,0.05)",
                borderRadius: 12, padding: "14px 16px", marginBottom: 8, cursor: "pointer", transition: "all 0.2s",
                boxShadow: isLeader ? `0 4px 24px ${tc.accent}15` : "none",
              }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 7,
                    background: `linear-gradient(135deg, ${tc.accent}, ${tc.accent}88)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, fontWeight: 800, color: "#fff",
                  }}>{rank + 1}</div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#e2e8f0" }}>{team.name || `Team ${idx + 1}`}</div>
                    {hasLiveData && team.thruEvent > 0 && (
                      <div style={{ fontSize: 10, color: "#64748b", fontWeight: 500 }}>Thru Event #{team.thruEvent} · Actual: {proj.currentScore}</div>
                    )}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: tc.text, lineHeight: 1 }}>{score}</div>
                  <div style={{ fontSize: 10, color: "#64748b", fontWeight: 500 }}>{hasLiveData && proj.projected ? "projected" : "psych pts"}</div>
                </div>
              </div>
              <div style={{ height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${barWidth}%`, borderRadius: 3, background: `linear-gradient(90deg, ${tc.accent}, ${tc.accent}88)`, transition: "width 0.6s cubic-bezier(0.4,0,0.2,1)" }} />
              </div>
              {hasLiveData && proj.projected && proj.psychTotal > 0 && (
                <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
                  {[
                    { label: "Psych", value: proj.psychTotal },
                    { label: "Actual", value: proj.currentScore },
                    { label: "To Go", value: proj.pointsToGo },
                    { label: "Diff", value: proj.projected - proj.psychTotal, signed: true },
                  ].map((s, i) => (
                    <div key={i} style={{ flex: 1 }}>
                      <div style={{ fontSize: 9, color: "#475569", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</div>
                      <div style={{
                        fontSize: 13, fontWeight: 700,
                        color: s.signed ? (s.value > 0 ? "#4ade80" : s.value < 0 ? "#f87171" : "#94a3b8") : "#cbd5e1",
                      }}>{s.signed && s.value > 0 ? "+" : ""}{s.value ?? "—"}</div>
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
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "6px 8px", color: "#64748b", fontWeight: 600, fontSize: 10, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>#</th>
                  <th style={{ textAlign: "left", padding: "6px 8px", color: "#64748b", fontWeight: 600, fontSize: 10, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>Event</th>
                  {teams.filter(t => t.name).map((t, i) => (
                    <th key={i} style={{ textAlign: "right", padding: "6px 8px", color: TEAM_COLORS[i % TEAM_COLORS.length].text, fontWeight: 700, fontSize: 10, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>{t.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {events.filter(e => e.name).map(ev => {
                  const scores = teams.filter(t => t.name).map(t => calcPsychPoints(t, [ev]).total);
                  const maxScore = Math.max(...scores);
                  return (
                    <tr key={ev.num}>
                      <td style={{ padding: "5px 8px", color: "#475569", fontWeight: 500, borderBottom: "1px solid rgba(255,255,255,0.03)" }}>{ev.num}</td>
                      <td style={{ padding: "5px 8px", color: "#94a3b8", fontWeight: 500, borderBottom: "1px solid rgba(255,255,255,0.03)", whiteSpace: "nowrap" }}>
                        <span style={{ fontSize: 9, color: ev.type === "R" ? "#818cf8" : "#64748b", fontWeight: 700, marginRight: 4, padding: "1px 4px", background: ev.type === "R" ? "rgba(129,140,248,0.1)" : "rgba(100,116,139,0.1)", borderRadius: 3 }}>{ev.type}</span>{ev.name}
                      </td>
                      {scores.map((s, i) => (
                        <td key={i} style={{ padding: "5px 8px", textAlign: "right", fontWeight: s === maxScore && s > 0 ? 800 : 500, color: s === maxScore && s > 0 ? TEAM_COLORS[i % TEAM_COLORS.length].text : "#475569", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>{s || "—"}</td>
                      ))}
                    </tr>
                  );
                })}
                <tr>
                  <td colSpan={2} style={{ padding: "8px 8px", color: "#e2e8f0", fontWeight: 800, borderTop: "2px solid rgba(56,189,248,0.2)" }}>TOTAL</td>
                  {teams.filter(t => t.name).map((t, i) => (
                    <td key={i} style={{ padding: "8px 8px", textAlign: "right", fontWeight: 900, color: TEAM_COLORS[i % TEAM_COLORS.length].text, borderTop: "2px solid rgba(56,189,248,0.2)", fontSize: 14 }}>{calcPsychPoints(t, events).total}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function EventSetup({ events, setEvents }) {
  const updateEvent = (idx, field, value) => { const next = [...events]; next[idx] = { ...next[idx], [field]: value }; setEvents(next); };
  const addEvent = () => { const num = events.length > 0 ? Math.max(...events.map(e => e.num)) + 1 : 1; setEvents([...events, { num, name: "", type: "I" }]); };
  const removeEvent = (idx) => { if (events.length > 1) setEvents(events.filter((_, i) => i !== idx)); };

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "16px 16px 100px" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Meet Events</div>
      <div style={{ fontSize: 12, color: "#475569", marginBottom: 16, lineHeight: 1.5 }}>Pre-loaded with the standard NCAA Championship order. Edit event names, toggle Individual/Relay, or add custom events.</div>
      {events.map((ev, idx) => (
        <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 8, padding: "8px 12px" }}>
          <div style={{ width: 28, fontSize: 12, color: "#64748b", fontWeight: 700, flexShrink: 0 }}>{ev.num}</div>
          <input value={ev.name} onChange={e => updateEvent(idx, "name", e.target.value)} placeholder="Event name..."
            style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: "6px 10px", color: "#e2e8f0", fontSize: 13, outline: "none" }} />
          <button onClick={() => updateEvent(idx, "type", ev.type === "I" ? "R" : "I")}
            style={{ background: ev.type === "R" ? "rgba(129,140,248,0.15)" : "rgba(100,116,139,0.1)", border: ev.type === "R" ? "1px solid rgba(129,140,248,0.3)" : "1px solid rgba(100,116,139,0.2)", borderRadius: 6, padding: "5px 12px", color: ev.type === "R" ? "#818cf8" : "#64748b", fontSize: 11, fontWeight: 700, cursor: "pointer", minWidth: 50, textAlign: "center" }}>
            {ev.type === "R" ? "Relay" : "Indiv"}
          </button>
          <button onClick={() => removeEvent(idx)} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 16, padding: "0 4px" }}>×</button>
        </div>
      ))}
      <button onClick={addEvent} style={{ width: "100%", background: "rgba(56,189,248,0.08)", border: "1px dashed rgba(56,189,248,0.3)", borderRadius: 8, padding: "10px", color: "#38bdf8", fontSize: 12, fontWeight: 600, cursor: "pointer", marginTop: 8 }}>+ Add Event</button>
    </div>
  );
}

function PsychSheet({ teams, setTeams, events, activeTeam, setActiveTeam }) {
  const team = teams[activeTeam] || teams[0];
  const tc = TEAM_COLORS[activeTeam % TEAM_COLORS.length];
  const psych = calcPsychPoints(team, events);

  const toggleSeed = (eventNum, place) => {
    const key = `${eventNum}-${place}`;
    const next = [...teams];
    const seeds = { ...next[activeTeam].seeds };
    seeds[key] = !seeds[key];
    next[activeTeam] = { ...next[activeTeam], seeds };
    setTeams(next);
  };

  const updateTeamField = (field, value) => {
    const next = [...teams];
    next[activeTeam] = { ...next[activeTeam], [field]: value };
    setTeams(next);
  };

  const addTeam = () => { if (teams.length < 8) setTeams([...teams, initTeam("")]); };
  const removeTeam = (idx) => {
    if (teams.length > 2) {
      const next = teams.filter((_, i) => i !== idx);
      setTeams(next);
      if (activeTeam >= next.length) setActiveTeam(next.length - 1);
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "16px 16px 100px" }}>
      <div style={{ display: "flex", gap: 6, marginBottom: 12, overflowX: "auto", alignItems: "center" }}>
        {teams.map((t, i) => {
          const c = TEAM_COLORS[i % TEAM_COLORS.length];
          return (
            <button key={i} onClick={() => setActiveTeam(i)} style={{
              background: activeTeam === i ? `${c.accent}20` : "rgba(255,255,255,0.02)",
              border: activeTeam === i ? `1px solid ${c.accent}40` : "1px solid rgba(255,255,255,0.05)",
              borderRadius: 8, padding: "8px 14px", cursor: "pointer", whiteSpace: "nowrap",
              color: activeTeam === i ? c.text : "#64748b", fontSize: 12, fontWeight: activeTeam === i ? 700 : 500, transition: "all 0.15s",
            }}>
              {t.name || `Team ${i + 1}`}
              {teams.length > 2 && activeTeam === i && <span onClick={(e) => { e.stopPropagation(); removeTeam(i); }} style={{ marginLeft: 6, color: "#64748b", fontSize: 14 }}>×</span>}
            </button>
          );
        })}
        {teams.length < 8 && <button onClick={addTeam} style={{ background: "none", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 12px", color: "#475569", fontSize: 12, cursor: "pointer" }}>+</button>}
      </div>

      <div style={{ background: `linear-gradient(135deg, ${tc.bg}, rgba(0,0,0,0.3))`, border: `1px solid ${tc.accent}30`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: "1 1 160px" }}>
            <label style={{ display: "block", fontSize: 10, color: "#64748b", fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Team Name</label>
            <input value={team.name} onChange={e => updateTeamField("name", e.target.value)} placeholder="Enter team name..."
              style={{ width: "100%", background: "rgba(255,255,255,0.08)", border: `1px solid ${tc.accent}30`, borderRadius: 6, padding: "8px 10px", color: "#e2e8f0", fontSize: 14, outline: "none", fontWeight: 700, boxSizing: "border-box" }} />
          </div>
          <div style={{ flex: "0 0 100px" }}>
            <label style={{ display: "block", fontSize: 10, color: "#64748b", fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Actual Score</label>
            <input type="number" value={team.currentScore || ""} onChange={e => updateTeamField("currentScore", parseInt(e.target.value) || 0)} placeholder="0"
              style={{ width: "100%", background: "rgba(255,255,255,0.08)", border: `1px solid ${tc.accent}30`, borderRadius: 6, padding: "8px 10px", color: tc.text, fontSize: 14, outline: "none", fontWeight: 700, textAlign: "center", boxSizing: "border-box" }} />
          </div>
          <div style={{ flex: "0 0 100px" }}>
            <label style={{ display: "block", fontSize: 10, color: "#64748b", fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Thru Event #</label>
            <input type="number" value={team.thruEvent || ""} onChange={e => updateTeamField("thruEvent", parseInt(e.target.value) || 0)} placeholder="0" min="0" max={events.length}
              style={{ width: "100%", background: "rgba(255,255,255,0.08)", border: `1px solid ${tc.accent}30`, borderRadius: 6, padding: "8px 10px", color: tc.text, fontSize: 14, outline: "none", fontWeight: 700, textAlign: "center", boxSizing: "border-box" }} />
          </div>
          <div style={{ background: `${tc.accent}15`, border: `1px solid ${tc.accent}30`, borderRadius: 8, padding: "8px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Psych Total</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: tc.text }}>{psych.total}</div>
          </div>
        </div>
      </div>

      <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
        Seeding — Tap places where {team.name || "this team"} has swimmers
      </div>
      <div style={{ overflowX: "auto", paddingBottom: 8 }}>
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              <th style={{ position: "sticky", left: 0, background: "#0f172a", zIndex: 10, padding: "6px 4px", fontSize: 9, color: "#475569", fontWeight: 600, textAlign: "left", minWidth: 90, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>Event</th>
              {Array.from({ length: 24 }, (_, i) => (
                <th key={i} style={{ padding: "6px 0", fontSize: 9, color: "#475569", fontWeight: 600, textAlign: "center", minWidth: 28, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>{i + 1}</th>
              ))}
              <th style={{ padding: "6px 4px", fontSize: 9, color: tc.text, fontWeight: 700, textAlign: "right", minWidth: 40, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>Pts</th>
            </tr>
          </thead>
          <tbody>
            {events.filter(e => e.name).map(ev => {
              const evPts = psych.byEvent[ev.num] || 0;
              return (
                <tr key={ev.num}>
                  <td style={{ position: "sticky", left: 0, background: "#0f172a", zIndex: 10, padding: "4px 4px", fontSize: 11, color: "#94a3b8", fontWeight: 500, borderBottom: "1px solid rgba(255,255,255,0.03)", whiteSpace: "nowrap" }}>
                    <span style={{ fontSize: 8, color: ev.type === "R" ? "#818cf8" : "#475569", fontWeight: 700, marginRight: 3, padding: "1px 3px", background: ev.type === "R" ? "rgba(129,140,248,0.1)" : "transparent", borderRadius: 2 }}>{ev.type}</span>{ev.name}
                  </td>
                  {Array.from({ length: 24 }, (_, p) => {
                    const place = p + 1;
                    const active = !!team.seeds[`${ev.num}-${place}`];
                    const pts = active ? getPointsForPlace(place, ev.type) : 0;
                    return (
                      <td key={p} style={{ padding: "2px 1px", textAlign: "center", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                        <button onClick={() => toggleSeed(ev.num, place)} style={{
                          width: 26, height: 26, borderRadius: 5,
                          background: active ? `linear-gradient(135deg, ${tc.accent}, ${tc.accent}cc)` : "rgba(255,255,255,0.03)",
                          border: active ? "none" : "1px solid rgba(255,255,255,0.06)",
                          color: active ? "#fff" : "transparent", cursor: "pointer",
                          fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center",
                          transition: "all 0.1s", boxShadow: active ? `0 2px 8px ${tc.accent}40` : "none", padding: 0,
                        }}>{active ? pts : ""}</button>
                      </td>
                    );
                  })}
                  <td style={{ padding: "4px 4px", textAlign: "right", fontSize: 13, fontWeight: evPts > 0 ? 800 : 400, color: evPts > 0 ? tc.text : "#334155", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>{evPts || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function WhatIfScenario({ teams, events }) {
  const [scenarioTeams, setScenarioTeams] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(events[0]?.num || 1);
  useEffect(() => { setScenarioTeams(JSON.parse(JSON.stringify(teams))); }, []);
  if (!scenarioTeams) return null;

  const toggleScenarioSeed = (teamIdx, eventNum, place) => {
    const next = [...scenarioTeams];
    const seeds = { ...next[teamIdx].seeds };
    seeds[`${eventNum}-${place}`] = !seeds[`${eventNum}-${place}`];
    next[teamIdx] = { ...next[teamIdx], seeds };
    setScenarioTeams(next);
  };

  const ev = events.find(e => e.num === selectedEvent) || events[0];
  const activeTeams = scenarioTeams.filter(t => t.name);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "16px 16px 100px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em" }}>What-If Scenario Builder</div>
          <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>Modify seeds to see how results change. Your actual psych sheet is safe.</div>
        </div>
        <button onClick={() => setScenarioTeams(JSON.parse(JSON.stringify(teams)))} style={{
          background: "rgba(56,189,248,0.1)", border: "1px solid rgba(56,189,248,0.2)", borderRadius: 6, padding: "6px 12px", color: "#38bdf8", fontSize: 11, fontWeight: 600, cursor: "pointer",
        }}>Reset to Psych</button>
      </div>

      <div style={{ display: "flex", gap: 4, overflowX: "auto", marginBottom: 16, paddingBottom: 4 }}>
        {events.filter(e => e.name).map(e => (
          <button key={e.num} onClick={() => setSelectedEvent(e.num)} style={{
            background: selectedEvent === e.num ? "rgba(56,189,248,0.15)" : "rgba(255,255,255,0.02)",
            border: selectedEvent === e.num ? "1px solid rgba(56,189,248,0.3)" : "1px solid rgba(255,255,255,0.05)",
            borderRadius: 6, padding: "6px 10px", cursor: "pointer", whiteSpace: "nowrap",
            color: selectedEvent === e.num ? "#38bdf8" : "#64748b", fontSize: 11, fontWeight: selectedEvent === e.num ? 700 : 500,
          }}>#{e.num}</button>
        ))}
      </div>

      {ev && (
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0", marginBottom: 4 }}>
            #{ev.num} {ev.name}
            <span style={{ fontSize: 10, color: ev.type === "R" ? "#818cf8" : "#64748b", fontWeight: 700, marginLeft: 8, padding: "2px 6px", background: ev.type === "R" ? "rgba(129,140,248,0.1)" : "rgba(100,116,139,0.1)", borderRadius: 4 }}>{ev.type === "R" ? "Relay" : "Individual"}</span>
          </div>
          <div style={{ fontSize: 11, color: "#475569", marginBottom: 12 }}>Tap cells to toggle seeds. Points update instantly.</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%" }}>
              <thead>
                <tr>
                  <th style={{ padding: "6px 8px", fontSize: 10, color: "#475569", fontWeight: 600, textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>Team</th>
                  {Array.from({ length: 24 }, (_, i) => (
                    <th key={i} style={{ padding: "6px 0", fontSize: 9, color: "#475569", fontWeight: 600, textAlign: "center", minWidth: 28, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>{i + 1}</th>
                  ))}
                  <th style={{ padding: "6px 8px", fontSize: 10, color: "#64748b", fontWeight: 700, textAlign: "right", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>Pts</th>
                </tr>
              </thead>
              <tbody>
                {activeTeams.map((t) => {
                  const teamIdx = scenarioTeams.indexOf(t);
                  const tc = TEAM_COLORS[teamIdx % TEAM_COLORS.length];
                  const evPts = calcPsychPoints(t, [ev]).total;
                  return (
                    <tr key={teamIdx}>
                      <td style={{ padding: "4px 8px", fontSize: 12, color: tc.text, fontWeight: 700, borderBottom: "1px solid rgba(255,255,255,0.03)", whiteSpace: "nowrap" }}>{t.name}</td>
                      {Array.from({ length: 24 }, (_, p) => {
                        const place = p + 1;
                        const active = !!t.seeds[`${ev.num}-${place}`];
                        const pts = active ? getPointsForPlace(place, ev.type) : 0;
                        return (
                          <td key={p} style={{ padding: "2px 1px", textAlign: "center", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                            <button onClick={() => toggleScenarioSeed(teamIdx, ev.num, place)} style={{
                              width: 26, height: 26, borderRadius: 5,
                              background: active ? `linear-gradient(135deg, ${tc.accent}, ${tc.accent}cc)` : "rgba(255,255,255,0.03)",
                              border: active ? "none" : "1px solid rgba(255,255,255,0.06)",
                              color: active ? "#fff" : "transparent", cursor: "pointer",
                              fontSize: 9, fontWeight: 700, padding: 0, transition: "all 0.1s",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              boxShadow: active ? `0 2px 8px ${tc.accent}40` : "none",
                            }}>{active ? pts : ""}</button>
                          </td>
                        );
                      })}
                      <td style={{ padding: "4px 8px", textAlign: "right", fontSize: 14, fontWeight: 800, color: evPts > 0 ? tc.text : "#334155", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>{evPts || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12, padding: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Scenario vs. Original Psych</div>
        {activeTeams.map((t) => {
          const teamIdx = scenarioTeams.indexOf(t);
          const tc = TEAM_COLORS[teamIdx % TEAM_COLORS.length];
          const scenarioPts = calcPsychPoints(t, events).total;
          const originalPts = calcPsychPoints(teams[teamIdx], events).total;
          const diff = scenarioPts - originalPts;
          return (
            <div key={teamIdx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: tc.text }}>{t.name}</div>
              <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
                <div style={{ textAlign: "center" }}><div style={{ fontSize: 9, color: "#475569", fontWeight: 600 }}>Original</div><div style={{ fontSize: 14, fontWeight: 700, color: "#94a3b8" }}>{originalPts}</div></div>
                <div style={{ fontSize: 16, color: "#334155" }}>→</div>
                <div style={{ textAlign: "center" }}><div style={{ fontSize: 9, color: "#475569", fontWeight: 600 }}>Scenario</div><div style={{ fontSize: 14, fontWeight: 700, color: tc.text }}>{scenarioPts}</div></div>
                <div style={{ fontSize: 13, fontWeight: 800, color: diff > 0 ? "#4ade80" : diff < 0 ? "#f87171" : "#475569", minWidth: 50, textAlign: "right" }}>{diff > 0 ? "+" : ""}{diff}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ChampionshipScoring() {
  const [view, setView] = useState("dashboard");
  const [meetName, setMeetName] = useState("Championship Meet");
  const [teams, setTeams] = useState([initTeam(""), initTeam(""), initTeam(""), initTeam("")]);
  const [events, setEvents] = useState([...DEFAULT_EVENTS]);
  const [activeTeam, setActiveTeam] = useState(0);
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.teams) setTeams(data.teams);
        if (data.events) setEvents(data.events);
        if (data.meetName) setMeetName(data.meetName);
      }
    } catch (e) {}
    setLoaded(true);
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ teams, events, meetName }));
    } catch (e) {}
  }, [teams, events, meetName, loaded]);

  const handleReset = () => {
    if (confirm("Reset all data? This cannot be undone.")) {
      setTeams([initTeam(""), initTeam(""), initTeam(""), initTeam("")]);
      setEvents([...DEFAULT_EVENTS]);
      setMeetName("Championship Meet");
      setActiveTeam(0);
      setView("dashboard");
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    }
  };

  if (!loaded) return <div style={{ minHeight: "100vh", background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center", color: "#38bdf8", fontSize: 16, fontWeight: 600 }}>Loading...</div>;

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", color: "#e2e8f0" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      <Header view={view} setView={setView} meetName={meetName} setMeetName={setMeetName} onReset={handleReset} />
      {view === "dashboard" && <Dashboard teams={teams} events={events} setView={setView} setActiveTeam={setActiveTeam} />}
      {view === "events" && <EventSetup events={events} setEvents={setEvents} />}
      {view === "psych" && <PsychSheet teams={teams} setTeams={setTeams} events={events} activeTeam={activeTeam} setActiveTeam={setActiveTeam} />}
      {view === "scenario" && <WhatIfScenario teams={teams} events={events} />}
    </div>
  );
}
