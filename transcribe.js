// Speech to text via ElevenLabs Scribe. Contract with index.html: POST { audio: <base64>, mime } -> { text }
// Env vars (Netlify): ELEVENLABS_API_KEY (required), ELEVEN_STT_MODEL (optional), ALLOWED_ORIGIN (optional)
const json = (code, obj) => ({ statusCode: code, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) });

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return json(405, { error: 'POST only' });
    const allowed = process.env.ALLOWED_ORIGIN;
    const origin = (event.headers && (event.headers.origin || event.headers.Origin)) || '';
    if (allowed && origin && origin !== allowed) return json(403, { error: 'Origin not allowed' });
    if (!process.env.ELEVENLABS_API_KEY) return json(500, { error: 'Voice is not configured yet' });

    const { audio, mime, language } = JSON.parse(event.body || '{}');
    if (!audio) return json(400, { error: 'No audio received' });
    const type = mime || 'audio/webm';
    const bytes = Buffer.from(audio, 'base64');
    if (bytes.length > 8 * 1024 * 1024) return json(413, { error: 'Recording is too long' });

    const form = new FormData();
    form.append('model_id', process.env.ELEVEN_STT_MODEL || 'scribe_v1');
    if (language) form.append('language_code', String(language).slice(0, 8));
    form.append('file', new Blob([bytes], { type }), type.indexOf('mp4') > -1 ? 'voice.mp4' : 'voice.webm');

    const r = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY },
      body: form
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return json(r.status, { error: (j.detail && j.detail.message) || 'Transcription failed (' + r.status + ')' });
    return json(200, { text: (j.text || '').trim() });
  } catch (err) {
    return json(500, { error: err.message });
  }
};
