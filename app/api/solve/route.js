import { SYSTEM_PROMPT, buildUserPrompt } from "../../../lib/prompt";

export const runtime = "nodejs";
export const maxDuration = 120;

const MODEL = process.env.OPENAI_MODEL || "gpt-5.6";

async function callOpenAI(input, useWeb) {
  const body = {
    model: MODEL,
    instructions: SYSTEM_PROMPT,
    input,
    ...(useWeb ? { tools: [{ type: "web_search" }] } : {}),
  };
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    const msg = data?.error?.message || `OpenAI error ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return data;
}

function extract(data) {
  let text = data.output_text || "";
  const sources = [];
  for (const item of data.output || []) {
    if (item.type !== "message") continue;
    for (const c of item.content || []) {
      if (c.type === "output_text") {
        if (!data.output_text) text += c.text;
        for (const a of c.annotations || []) {
          if (a.type === "url_citation" && a.url && !sources.some((s) => s.url === a.url)) {
            sources.push({ title: a.title || a.url, url: a.url });
          }
        }
      }
    }
  }
  return { text, sources };
}

function parseJson(text) {
  const cleaned = text.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error("Model did not return valid JSON. Try again.");
  }
}

export async function POST(req) {
  if (!process.env.OPENAI_API_KEY) {
    return Response.json({ error: "OPENAI_API_KEY is not set on the server." }, { status: 500 });
  }
  try {
    const payload = await req.json();
    if (!payload.problem || payload.problem.trim().length < 15) {
      return Response.json({ error: "Please describe the problem in a bit more detail." }, { status: 400 });
    }
    const input = buildUserPrompt(payload);
    const useWeb = payload.useWeb !== false;

    let data;
    let webUsed = useWeb;
    try {
      data = await callOpenAI(input, useWeb);
    } catch (e) {
      // If the model/account doesn't support web search, fall back to plain generation.
      if (useWeb && e.status === 400) {
        data = await callOpenAI(input, false);
        webUsed = false;
      } else throw e;
    }

    const { text, sources } = extract(data);
    const solution = parseJson(text);
    return Response.json({ solution, sources, webUsed, model: MODEL });
  } catch (e) {
    return Response.json({ error: e.message || "Something went wrong" }, { status: 500 });
  }
}
