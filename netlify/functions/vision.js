// IMAGE UNDERSTANDING (Groq). Contract with index.html: POST { images: [dataUrl, ...up to 4] (or image), prompt } -> { text }
// Netlify env vars: GROQ_API_KEY (required). Optional: VISION_MODEL
const J = (code, obj) => ({ statusCode: code, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(obj) });

exports.handler = async (event) => {
  try {
    if (typeof fetch !== 'function') return J(500, { error: 'This server needs Node 18 or newer' });
    if (event.httpMethod !== 'POST') return J(405, { error: 'POST only' });
    const allowed = process.env.ALLOWED_ORIGIN, origin = (event.headers && (event.headers.origin || event.headers.Origin)) || '';
    if (allowed && origin && origin !== allowed) return J(403, { error: 'Origin not allowed' });
    const KEY = process.env.GROQ_API_KEY;
    if (!KEY) return J(500, { error: 'Image reading is not set up yet (GROQ_API_KEY is missing)' });
    if ((event.body || '').length > 5.5 * 1024 * 1024) return J(413, { error: 'Those images are too large together. Try fewer or smaller images.' });

    const { image, images, prompt } = JSON.parse(event.body || '{}');
    const list = (Array.isArray(images) && images.length ? images : (image ? [image] : []))
      .filter((u) => typeof u === 'string' && /^(data:image\/|https:\/\/)/.test(u)).slice(0, 4);
    if (!list.length) return J(400, { error: 'No image received' });

    // Current Groq vision model first, then backups in case one is retired
    const models = [process.env.VISION_MODEL, 'qwen/qwen3.8-27b', 'qwen/qwen3.6-27b', 'meta-llama/llama-4-scout-17b-16e-instruct']
      .filter((m, i, a) => m && a.indexOf(m) === i);
    const content = [{ type: 'text', text: String(prompt || 'Describe this image and explain what matters in it.').slice(0, 2000) }]
      .concat(list.map((u) => ({ type: 'image_url', image_url: { url: u } })));

    let last = { status: 502, message: 'Image analysis failed' };
    for (const model of models) {
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, max_tokens: 900, messages: [{ role: 'user', content }] })
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok) {
        let text = String((j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '');
        text = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
        return J(200, { text: text || 'I could not read anything from that image.' });
      }
      const message = (j.error && j.error.message) || ('Image analysis failed (' + r.status + ')');
      last = { status: r.status, message };
      if (r.status === 401) return J(401, { error: 'The Groq key is not valid. Create a new key and update GROQ_API_KEY.' });
      if (r.status === 429) return J(429, { error: 'Image reading is busy right now. Try again in a minute.' });
      if (r.status === 413) return J(413, { error: 'Those images are too large. Try fewer or smaller images.' });
      // otherwise (model missing or retired) try the next model
    }
    return J(last.status, { error: last.message });
  } catch (err) {
    return J(500, { error: err.message });
  }
};
