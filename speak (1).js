// TEXT TO SPEECH (ElevenLabs). Contract with index.html: POST { text, voice, speed, language } -> { audio: <base64 mp3> }
// Netlify env vars: ELEVENLABS_API_KEY (required). Optional: ELEVEN_VOICE_FEMALE, ELEVEN_VOICE_MALE, ELEVEN_MODEL, ALLOWED_ORIGIN
const J = (code, obj) => ({ statusCode: code, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(obj) });

const DEFAULT_VOICES = { female: '21m00Tcm4TlvDq8ikWAM', male: 'pNInz6obpgDQGcFmaJgB' };
// Models that understand the language_code option
const LANG_ENFORCE = ['eleven_flash_v2_5', 'eleven_turbo_v2_5'];
// Languages the fast model covers; anything else is tried on Eleven v3
const FLASH_LANGS = ['en','ja','zh','de','hi','fr','ko','pt','it','es','id','nl','tr','fil','pl','sv','bg','ro','ar','cs','el','fi','hr','ms','sk','da','ta','uk','ru','hu','no','vi'];

async function once(key, voiceId, model, body) {
  const payload = Object.assign({}, body, { model_id: model });
  if (LANG_ENFORCE.indexOf(model) === -1) delete payload.language_code;
  const r = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + voiceId + '?output_format=mp3_44100_128', {
    method: 'POST',
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify(payload)
  });
  if (r.ok) return { ok: true, buf: Buffer.from(await r.arrayBuffer()) };
  let msg = '', code = '';
  try { const j = await r.json(); const d = j.detail || {}; msg = typeof d === 'string' ? d : (d.message || ''); code = String(d.status || d.code || ''); } catch (e) {}
  return { ok: false, status: r.status, msg, code };
}

exports.handler = async (event) => {
  try {
    if (typeof fetch !== 'function') return J(500, { error: 'This server needs Node 18 or newer' });
    if (event.httpMethod !== 'POST') return J(405, { error: 'POST only' });
    const allowed = process.env.ALLOWED_ORIGIN, origin = (event.headers && (event.headers.origin || event.headers.Origin)) || '';
    if (allowed && origin && origin !== allowed) return J(403, { error: 'Origin not allowed' });
    const KEY = process.env.ELEVENLABS_API_KEY;
    if (!KEY) return J(500, { error: 'Voice is not set up yet (ELEVENLABS_API_KEY is missing)' });

    const { text, voice, speed, language } = JSON.parse(event.body || '{}');
    const clean = String(text || '').trim().slice(0, 1000);
    if (!clean) return J(400, { error: 'No text received' });

    const female = process.env.ELEVEN_VOICE_FEMALE || DEFAULT_VOICES.female;
    const male = process.env.ELEVEN_VOICE_MALE || DEFAULT_VOICES.male;
    const voiceId = voice === 'male' ? male : voice === 'female' ? female : (/^[A-Za-z0-9]{15,30}$/.test(voice || '') ? voice : female);
    const lang = String(language || 'en').toLowerCase().slice(0, 8);
    const first = process.env.ELEVEN_MODEL || (FLASH_LANGS.indexOf(lang) > -1 ? 'eleven_flash_v2_5' : 'eleven_v3');
    const body = {
      text: clean,
      voice_settings: { speed: Math.min(1.2, Math.max(0.7, parseFloat(speed) || 1)) },
      language_code: lang
    };

    // Attempt 1: chosen voice and model
    let res = await once(KEY, voiceId, first, body);
    // Attempt 2: the model is not available on this plan, so use the widely available one
    if (!res.ok && [400, 404, 422].indexOf(res.status) > -1 && /model/i.test(res.msg + res.code)) {
      res = await once(KEY, voiceId, 'eleven_multilingual_v2', body);
    }
    // Attempt 3: free accounts cannot use "library" voices through the API, so use a voice the account owns
    if (!res.ok && [400, 402, 403, 404].indexOf(res.status) > -1) {
      try {
        const lr = await fetch('https://api.elevenlabs.io/v1/voices', { headers: { 'xi-api-key': KEY } });
        const lj = lr.ok ? await lr.json() : { voices: [] };
        const own = (lj.voices || []).filter((v) => v.voice_id !== voiceId && ['premade', 'generated', 'cloned'].indexOf(String(v.category || '').toLowerCase()) > -1);
        const want = voice === 'male' ? 'male' : 'female';
        const pick = own.find((v) => v.labels && v.labels.gender === want) || own[0];
        if (pick) res = await once(KEY, pick.voice_id, first === 'eleven_v3' ? 'eleven_multilingual_v2' : first, body);
      } catch (e) {}
    }
    if (res.ok) return J(200, { audio: res.buf.toString('base64') });

    if (res.status === 401) return J(401, { error: 'The ElevenLabs key is not valid or is missing permissions. Create a new key and update ELEVENLABS_API_KEY.' });
    if (res.status === 429 || /quota|limit/i.test(res.code + res.msg)) return J(429, { error: 'The voice limit has been reached for now. Try again later.' });
    return J(res.status || 502, { error: res.msg || ('Voice request failed (' + res.status + ')') });
  } catch (err) {
    return J(500, { error: err.message });
  }
};
