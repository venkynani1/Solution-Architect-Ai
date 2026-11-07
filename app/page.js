"use client";
import { useEffect, useState } from "react";

const SAMPLES = [
  "Our training team manually collects trainer profiles over email, schedules evaluation calls and tracks status in Excel. It takes days per training request and status is often out of date.",
  "A mid-size hospital has 3-hour OPD wait times because appointment slots, doctor availability and patient flow are not coordinated.",
  "Retail stores lose sales due to stock-outs while warehouses hold excess inventory of slow-moving items.",
];

const list = (arr) => (arr?.length ? <ul>{arr.map((x, i) => <li key={i}>{x}</li>)}</ul> : null);

function toMarkdown(s, sources) {
  const L = [];
  const b = (arr) => (arr || []).map((x) => `- ${x}`).join("\n");
  L.push(`# ${s.title}`, "", s.summary, "");
  L.push("## Problem analysis", `**Core problem:** ${s.problemAnalysis?.coreProblem}`, "", "**Stakeholders**", b(s.problemAnalysis?.stakeholders), "", "**Root causes**", b(s.problemAnalysis?.rootCauses), "", "**Success criteria**", b(s.problemAnalysis?.successCriteria), "");
  L.push(`## Recommended approach: ${s.recommendedApproach?.name}`, s.recommendedApproach?.description, "", "**Why this is best**", b(s.recommendedApproach?.whyBest), "", "**Key features**", b(s.recommendedApproach?.keyFeatures), "");
  L.push("## Architecture", s.architecture?.overview, "", ...(s.architecture?.components || []).map((c) => `- **${c.name}** — ${c.role}`), "");
  L.push("## Tech stack", "| Layer | Technology | Why | Trend signal |", "|---|---|---|---|", ...(s.techStack || []).map((t) => `| ${t.layer} | ${t.technology} | ${t.why} | ${t.trendSignal} |`), "");
  L.push("## Trending tech applied", ...(s.trendingTech || []).map((t) => `- **${t.trend}** — ${t.howItApplies}`), "");
  L.push("## Alternatives", ...(s.alternatives || []).flatMap((a) => [`### ${a.approach}`, `Pros: ${(a.pros || []).join("; ")}`, `Cons: ${(a.cons || []).join("; ")}`, `Choose when: ${a.chooseWhen}`, ""]));
  L.push("## Roadmap", ...(s.roadmap || []).map((r) => `- **${r.phase}** (${r.duration}): ${(r.deliverables || []).join(", ")}`), "");
  L.push("## Risks", ...(s.risks || []).map((r) => `- ${r.risk} → ${r.mitigation}`), "");
  L.push("## KPIs", b(s.kpis), "", `## Effort\n${s.estimatedEffort}`, "", `## Innovation angle\n${s.innovationAngle}`);
  if (sources?.length) L.push("", "## Sources", ...sources.map((x) => `- [${x.title}](${x.url})`));
  return L.join("\n");
}

export default function Home() {
  const [form, setForm] = useState({ problem: "", industry: "", context: "Hackathon", constraints: "", preferredStack: "", useWeb: true });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try { setHistory(JSON.parse(localStorage.getItem("sa-history") || "[]")); } catch {}
  }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  async function solve() {
    setLoading(true); setError(""); setResult(null);
    try {
      const res = await fetch("/api/solve", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
      const next = [{ problem: form.problem, data, at: Date.now() }, ...history].slice(0, 10);
      setHistory(next);
      try { localStorage.setItem("sa-history", JSON.stringify(next)); } catch {}
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function copyMd() {
    await navigator.clipboard.writeText(toMarkdown(result.solution, result.sources));
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  }

  const s = result?.solution;

  return (
    <main className="wrap">
      <h1>Solution Architect AI</h1>
      <p className="sub">Paste a business problem. Get the best solution approach, architecture and trending tech stack — powered by ChatGPT.</p>

      <div className="card">
        <label>Problem statement</label>
        <textarea value={form.problem} onChange={set("problem")} placeholder="Describe the business problem, who faces it and what it costs today..." />
        <div className="chips">
          {SAMPLES.map((x, i) => <button key={i} className="chip" onClick={() => setForm({ ...form, problem: x })}>Sample {i + 1}</button>)}
        </div>
        <div className="grid2">
          <div><label>Industry / domain</label><input value={form.industry} onChange={set("industry")} placeholder="e.g. HR, Healthcare, Retail" /></div>
          <div>
            <label>Context</label>
            <select value={form.context} onChange={set("context")}>
              <option>Hackathon</option><option>Enterprise / client project</option><option>Startup MVP</option><option>Internal tool</option>
            </select>
          </div>
          <div><label>Constraints</label><input value={form.constraints} onChange={set("constraints")} placeholder="e.g. 48 hrs, 4 people, low budget" /></div>
          <div><label>Preferred / existing tech</label><input value={form.preferredStack} onChange={set("preferredStack")} placeholder="e.g. Java, Spring Boot, React, AWS" /></div>
        </div>
        <div className="row">
          <button onClick={solve} disabled={loading || form.problem.trim().length < 15}>{loading ? "Thinking…" : "Get solution approach"}</button>
          <label className="chk"><input type="checkbox" checked={form.useWeb} onChange={set("useWeb")} /> Search the web for current trends</label>
        </div>
        {error && <div className="err">{error}</div>}
      </div>

      {loading && <div className="card loading"><div className="spin" /> Analysing the problem and checking current tech trends… (30–90s)</div>}

      {s && (
        <>
          <div className="card">
            <div className="row" style={{ justifyContent: "space-between", marginTop: 0 }}>
              <h2>{s.title}</h2>
              <button className="ghost" onClick={copyMd}>{copied ? "Copied" : "Copy as Markdown"}</button>
            </div>
            <p>{s.summary}</p>
            <div className="meta">Model: {result.model} · {result.webUsed ? "Web-grounded" : "No web search"}</div>
          </div>

          <div className="card">
            <h3>Problem analysis</h3>
            <p><b>{s.problemAnalysis?.coreProblem}</b></p>
            <div className="cols">
              <div className="mini"><b>Stakeholders</b>{list(s.problemAnalysis?.stakeholders)}</div>
              <div className="mini"><b>Root causes</b>{list(s.problemAnalysis?.rootCauses)}</div>
              <div className="mini"><b>Success criteria</b>{list(s.problemAnalysis?.successCriteria)}</div>
            </div>
          </div>

          <div className="card">
            <h3>Recommended approach</h3>
            <h2>{s.recommendedApproach?.name}</h2>
            <p>{s.recommendedApproach?.description}</p>
            <div className="cols">
              <div className="mini"><b>Why this is best</b>{list(s.recommendedApproach?.whyBest)}</div>
              <div className="mini"><b>Key features</b>{list(s.recommendedApproach?.keyFeatures)}</div>
            </div>
          </div>

          <div className="card">
            <h3>Architecture</h3>
            <p>{s.architecture?.overview}</p>
            <div className="cols">
              {(s.architecture?.components || []).map((c, i) => <div className="mini" key={i}><b>{c.name}</b>{c.role}</div>)}
            </div>
          </div>

          <div className="card">
            <h3>Tech stack</h3>
            <div className="tablewrap">
              <table className="table">
                <thead><tr><th>Layer</th><th>Technology</th><th>Why</th><th>Trend signal</th></tr></thead>
                <tbody>{(s.techStack || []).map((t, i) => <tr key={i}><td><span className="pill">{t.layer}</span></td><td><b>{t.technology}</b></td><td>{t.why}</td><td>{t.trendSignal}</td></tr>)}</tbody>
              </table>
            </div>
          </div>

          {s.trendingTech?.length > 0 && (
            <div className="card">
              <h3>Trending tech applied</h3>
              <div className="cols">{s.trendingTech.map((t, i) => <div className="mini" key={i}><b>{t.trend}</b>{t.howItApplies}</div>)}</div>
            </div>
          )}

          <div className="card">
            <h3>Alternatives considered</h3>
            <div className="cols">
              {(s.alternatives || []).map((a, i) => (
                <div className="mini" key={i}>
                  <b>{a.approach}</b>
                  <ul>{(a.pros || []).map((p, j) => <li key={j} className="pro">+ {p}</li>)}{(a.cons || []).map((p, j) => <li key={"c" + j} className="con">− {p}</li>)}</ul>
                  <div className="meta">Choose when: {a.chooseWhen}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3>Roadmap</h3>
            <div className="cols">{(s.roadmap || []).map((r, i) => <div className="mini" key={i}><b>{r.phase}</b><div className="meta">{r.duration}</div>{list(r.deliverables)}</div>)}</div>
          </div>

          <div className="cols">
            <div className="card"><h3>Risks & mitigation</h3><ul>{(s.risks || []).map((r, i) => <li key={i}><b>{r.risk}</b> — {r.mitigation}</li>)}</ul></div>
            <div className="card"><h3>KPIs</h3>{list(s.kpis)}<h3 style={{ marginTop: 16 }}>Effort</h3><p>{s.estimatedEffort}</p></div>
          </div>

          <div className="card pitch"><h3>Innovation angle / pitch</h3><p style={{ margin: 0 }}>{s.innovationAngle}</p></div>

          {result.sources?.length > 0 && (
            <div className="card"><h3>Sources</h3><ul>{result.sources.map((x, i) => <li key={i}><a href={x.url} target="_blank" rel="noreferrer">{x.title}</a></li>)}</ul></div>
          )}
        </>
      )}

      {history.length > 0 && (
        <div className="card history">
          <h3>Recent</h3>
          {history.map((h, i) => (
            <button key={i} onClick={() => { setResult(h.data); setForm({ ...form, problem: h.problem }); window.scrollTo(0, 0); }}>
              {h.data.solution?.title} <span className="meta">— {h.problem.slice(0, 70)}…</span>
            </button>
          ))}
        </div>
      )}
    </main>
  );
}
