// KVKKpilot yapay zekâ uç noktası. Sağlayıcıyı ortam değişkeninden seçer:
// GEMINI_API_KEY (ücretsiz katman) > OPENAI_API_KEY > ANTHROPIC_API_KEY. Hiçbiri yoksa 503 döner.
const SYSTEM = `Sen KVKKpilot'sun: Türk KOBİ'lerine 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK), ikincil mevzuat ve Kişisel Verileri Koruma Kurulu kararları konusunda yardım eden bir uyum asistanısın.
Kurallar: Yalnızca KVKK, veri koruma, gizlilik ve bilgi güvenliği konularında yardım et; başka bir konu sorulursa kibarca KVKK konularına yönlendir. Sade Türkçe yaz. Madde numarası verirken emin ol; uydurma madde veya karar numarası yazma. Emin olmadığın noktada avukata danışmayı öner. Markdown başlıkları kullanma.`;

function provider() {
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return null;
}

// Yoğunluk (503) veya kota (429) hatasında sıradaki ücretsiz modele geçer.
const GEMINI_MODELS = (process.env.GEMINI_MODEL ? [process.env.GEMINI_MODEL] : [])
  .concat(["gemini-flash-latest", "gemini-flash-lite-latest", "gemini-3.6-flash", "gemini-3.5-flash-lite"]);

async function callGemini(messages, json) {
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: SYSTEM }] },
    contents: messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
    generationConfig: Object.assign({ maxOutputTokens: 4096 }, json ? { responseMimeType: "application/json" } : {}),
  });
  let lastErr = "Gemini hatası";
  for (const model of [...new Set(GEMINI_MODELS)]) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
      body,
    });
    const d = await r.json().catch(() => ({}));
    if (r.ok) return ((d.candidates || [])[0]?.content?.parts || []).map((p) => p.text || "").join("");
    lastErr = (d.error && d.error.message) || "Gemini hatası";
    if (![404, 429, 500, 503].includes(r.status)) break; // anahtar/istek hatası: diğer modeller de başarısız olur
  }
  throw new Error(lastErr);
}

async function callOpenAI(messages, json) {
  const model = process.env.OPENAI_MODEL || "gpt-5-mini";
  const body = { model, messages: [{ role: "system", content: SYSTEM }, ...messages], max_completion_tokens: 6000 };
  if (/^(gpt-5|o\d)/.test(model)) body.reasoning_effort = "low";
  if (json) body.response_format = { type: "json_object" };
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify(body),
  });
  const d = await r.json();
  if (!r.ok) throw new Error((d.error && d.error.message) || "OpenAI hatası");
  return d.choices?.[0]?.message?.content || "";
}

async function callAnthropic(messages) {
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model, max_tokens: 4096, system: SYSTEM, messages }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error((d.error && d.error.message) || "Anthropic hatası");
  return (d.content || []).map((b) => b.text || "").join("");
}

module.exports = async (req, res) => {
  const p = provider();
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "GET" && req.query && req.query.ping === "kvkk2026" && p === "gemini") {
    try { const t = await callGemini([{ role: "user", content: "Sadece 'tamam' yaz." }]); return res.status(200).json({ ping: "ok", text: t.slice(0, 80) }); }
    catch (e) { return res.status(200).json({ ping: "fail", error: String(e.message || e).slice(0, 300) }); }
  }
  if (req.method === "GET") return res.status(200).json({ ai: !!p, provider: p });
  if (req.method !== "POST") return res.status(405).json({ error: "Yalnızca POST" });
  if (!p) return res.status(503).json({ error: "Yapay zekâ anahtarı tanımlı değil." });
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  const messages = Array.isArray(body && body.messages) ? body.messages : [];
  const clean = messages
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-12)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 12000) }));
  if (!clean.length || clean[clean.length - 1].role !== "user") return res.status(400).json({ error: "Geçersiz istek." });
  const total = clean.reduce((n, m) => n + m.content.length, 0);
  if (total > 40000) return res.status(413).json({ error: "Metin çok uzun, kısaltıp tekrar deneyin." });
  try {
    const json = !!(body && body.json);
    const text = p === "gemini" ? await callGemini(clean, json) : p === "openai" ? await callOpenAI(clean, json) : await callAnthropic(clean);
    if (!text.trim()) return res.status(502).json({ error: "Boş yanıt geldi, tekrar deneyin." });
    return res.status(200).json({ text, provider: p });
  } catch (e) {
    return res.status(502).json({ error: "Yapay zekâ servisi yanıt vermedi: " + String(e.message || e).slice(0, 200) });
  }
};
