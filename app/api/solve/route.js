import { SYSTEM_PROMPT, buildUserPrompt } from "../../../lib/prompt";

export const runtime = "nodejs";
export const maxDuration = 120;

// Provider: Groq (free tier) if GROQ_API_KEY is set, otherwise OpenAI.
const USE_GROQ = !!process.env.GROQ_API_KEY;
const MODEL = USE_GROQ
  ? process.env.GROQ_MODEL || "openai/gpt-oss-120b"
  : process.env.OPENAI_MODEL || "gpt-5.6";

class ApiError extends Error {
  constructor(msg, status) { super(msg); this.status = status; }
}

async function postJson(url, key, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    let msg = data?.error?.message || `API error ${res.status}`;
    if (res.status === 429) msg = "Free-tier rate limit reached. Wait a minute and try again.";
    throw new ApiError(msg, res.status);
  }
  return data;
}

// ---------- Groq (OpenAI-compatible Chat Completions) ----------
async function callGroq(input, useWeb, jsonMode = false) {
  const body = {
    model: MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: input },
    ],
    temperature: 0.4,
    max_completion_tokens: 8000,
    ...(MODEL.startsWith("openai/gpt-oss") ? { reasoning_effort: "medium" } : {}),
    ...(useWeb ? { tools: [{ type: "browser_search" }], tool_choice: "required" } : {}),
    ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
  };
  const data = await postJson("https://api.groq.com/openai/v1/chat/completions", process.env.GROQ_API_KEY, body);
  const msg = data.choices?.[0]?.message || {};
  const sources = [];
  for (const t of msg.executed_tools || []) {
    for (const r of t?.search_results?.results || []) {
      if (r.url && !sources.some((s) => s.url === r.url)) sources.push({ title: r.title || r.url, url: r.url });
    }
  }
  return { text: msg.content || "", sources };
}

// ---------- OpenAI (Responses API) ----------
async function callOpenAI(input, useWeb) {
  const data = await postJson("https://api.openai.com/v1/responses", process.env.OPENAI_API_KEY, {
    model: MODEL,
    instructions: SYSTEM_PROMPT,
    input,
    ...(useWeb ? { tools: [{ type: "web_search" }] } : {}),
  });
  let text = data.output_text || "";
  const sources = [];
  for (const item of data.output || []) {
    if (item.type !== "message") continue;
    for (const c of item.content || []) {
      if (c.type !== "output_text") continue;
      if (!data.output_text) text += c.text;
      for (const a of c.annotations || []) {
        if (a.type === "url_citation" && a.url && !sources.some((s) => s.url === a.url)) {
          sources.push({ title: a.title || a.url, url: a.url });
        }
      }
    }
  }
  return { text, sources };
}

function parseJson(text) {
  const cleaned = text
    .replace(/【[^】]*】/g, "") // strip inline citation markers
    .replace(/```json|```/g, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error("Model did not return valid JSON.");
  }
}

export async function POST(req) {
  if (!process.env.GROQ_API_KEY && !process.env.OPENAI_API_KEY) {
    return Response.json({ error: "Set GROQ_API_KEY (free) or OPENAI_API_KEY on the server." }, { status: 500 });
  }
  try {
    const payload = await req.json();
    if (!payload.problem || payload.problem.trim().length < 15) {
      return Response.json({ error: "Please describe the problem in a bit more detail." }, { status: 400 });
    }
    const input = buildUserPrompt(payload);
    const call = USE_GROQ ? callGroq : callOpenAI;
    let webUsed = payload.useWeb !== false;

    let out;
    try {
      out = await call(input, webUsed);
    } catch (e) {
      // Web search unsupported for this model/account → plain generation.
      if (webUsed && [400, 403, 404].includes(e.status)) {
        webUsed = false;
        out = await call(input, false);
      } else throw e;
    }

    let solution;
    try {
      solution = parseJson(out.text);
    } catch {
      // One retry in strict JSON mode, feeding back what we already have.
      const retryInput = `${input}\n\nDraft notes (reformat into the required JSON):\n${out.text.slice(0, 6000)}`;
      const retry = USE_GROQ ? await callGroq(retryInput, false, true) : await callOpenAI(retryInput, false);
      solution = parseJson(retry.text);
    }

    return Response.json({ solution, sources: out.sources, webUsed, model: MODEL });
  } catch (e) {
    return Response.json({ error: e.message || "Something went wrong" }, { status: e.status || 500 });
  }
}
