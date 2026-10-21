// SPEECH TO TEXT (ElevenLabs Scribe). Contract with index.html: POST { audio: <base64>, mime, language } -> { text }
// Netlify env vars: ELEVENLABS_API_KEY (required). Optional: ELEVEN_STT_MODEL, ALLOWED_ORIGIN
const J = (code, obj) => ({ statusCode: code, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(obj) });

function fileName(mime) {
  const m = String(mime || '').toLowerCase();
  if (m.indexOf('mp4') > -1 || m.indexOf('aac') > -1 || m.indexOf('m4a') > -1) return 'voice.mp4';
  if (m.indexOf('ogg') > -1) return 'voice.ogg';
  if (m.indexOf('wav') > -1) return 'voice.wav';
  if (m.indexOf('mpeg') > -1 || m.indexOf('mp3') > -1) return 'voice.mp3';
  return 'voice.webm';
}

async function once(key, model, bytes, type, language) {
  const form = new FormData();
  form.append('model_id', model);
  form.append('tag_audio_events', 'false');
  form.append('diarize', 'false');
  if (language) form.append('language_code', String(language).slice(0, 8));
  form.append('file', new Blob([bytes], { type }), fileName(type));
  const r = await fetch('https://api.elevenlabs.io/v1/speech-to-text', { method: 'POST', headers: { 'xi-api-key': key }, body: form });
  const j = await r.json().catch(() => ({}));
  if (r.ok) return { ok: true, text: String(j.text || '').trim() };
  const d = j.detail || {};
  return { ok: false, status: r.status, msg: typeof d === 'string' ? d : (d.message || ''), code: String(d.status || d.code || '') };
}

exports.handler = async (event) => {
  try {
    if (typeof fetch !== 'function' || typeof FormData !== 'function') return J(500, { error: 'This server needs Node 18 or newer' });
    if (event.httpMethod !== 'POST') return J(405, { error: 'POST only' });
    const allowed = process.env.ALLOWED_ORIGIN, origin = (event.headers && (event.headers.origin || event.headers.Origin)) || '';
    if (allowed && origin && origin !== allowed) return J(403, { error: 'Origin not allowed' });
    const KEY = process.env.ELEVENLABS_API_KEY;
    if (!KEY) return J(500, { error: 'Voice is not set up yet (ELEVENLABS_API_KEY is missing)' });

    const { audio, mime, language } = JSON.parse(event.body || '{}');
    if (!audio) return J(400, { error: 'No audio received' });
    const bytes = Buffer.from(audio, 'base64');
    if (!bytes.length) return J(400, { error: 'The recording was empty' });
    if (bytes.length > 8 * 1024 * 1024) return J(413, { error: 'The recording is too long' });
    const type = mime || 'audio/webm';

    // scribe_v1 is deprecated by ElevenLabs, so scribe_v2 comes first and v1 stays as a backup
    const models = [process.env.ELEVEN_STT_MODEL || 'scribe_v2', 'scribe_v1'].filter((m, i, a) => a.indexOf(m) === i);
    let res;
    for (const m of models) {
      res = await once(KEY, m, bytes, type, language);
      if (res.ok) return J(200, { text: res.text });
      if (res.status === 401 || res.status === 429) break; // another model will not help
    }
    if (res.status === 401) return J(401, { error: 'The ElevenLabs key is not valid or is missing the speech-to-text permission.' });
    if (res.status === 429) return J(429, { error: 'The voice limit has been reached for now. Try again later.' });
    return J(res.status || 502, { error: res.msg || ('Transcription failed (' + res.status + ')') });
  } catch (err) {
    return J(500, { error: err.message });
  }
};
