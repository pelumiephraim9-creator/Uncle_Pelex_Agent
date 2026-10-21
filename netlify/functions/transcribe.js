// Voice -> text via Groq Whisper. The API key stays here on the server (Netlify env var GROQ_API_KEY).
const json = (code, obj) => ({ statusCode: code, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) });

exports.handler = async (event) => {
  try {
    const { audio, mime } = JSON.parse(event.body || '{}');
    if (!audio) return json(400, { error: 'No audio received' });
    const buf = Buffer.from(audio, 'base64');
    const ext = mime && mime.includes('mp4') ? 'mp4' : 'webm';
    const fd = new FormData();
    fd.append('file', new Blob([buf], { type: mime || 'audio/webm' }), 'speech.' + ext);
    fd.append('model', 'whisper-large-v3-turbo');
    fd.append('response_format', 'json');
    const r = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + process.env.GROQ_API_KEY },
      body: fd
    });
    const j = await r.json();
    if (!r.ok) return json(r.status, { error: (j.error && j.error.message) || 'Transcription failed' });
    return json(200, { text: (j.text || '').trim() });
  } catch (err) {
    return json(500, { error: err.message });
  }
};
