// Lists the ElevenLabs voices on the account so the Voice page can show named voices.
// Contract with index.html: GET -> { voices: [{ id, name, hint }] }
// Env vars (Netlify): ELEVENLABS_API_KEY (required; the key needs the "Voices: read" permission), ALLOWED_ORIGIN (optional)
const json = (code, obj, extra) => ({ statusCode: code, headers: Object.assign({ 'Content-Type': 'application/json' }, extra || {}), body: JSON.stringify(obj) });

exports.handler = async (event) => {
  try {
    const allowed = process.env.ALLOWED_ORIGIN;
    const origin = (event.headers && (event.headers.origin || event.headers.Origin)) || '';
    if (allowed && origin && origin !== allowed) return json(403, { error: 'Origin not allowed' });
    if (!process.env.ELEVENLABS_API_KEY) return json(500, { error: 'Voice is not configured yet' });
    const r = await fetch('https://api.elevenlabs.io/v1/voices', { headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY } });
    if (!r.ok) return json(r.status, { error: 'Could not list voices (' + r.status + ')' });
    const j = await r.json();
    const voices = (j.voices || []).map((v) => ({
      id: v.voice_id,
      name: String(v.name || '').split(/[-\u2013(]/)[0].trim(),
      hint: [v.labels && v.labels.gender, v.labels && v.labels.accent].filter(Boolean).join(' \u00b7 ')
    })).filter((v) => v.id && v.name).slice(0, 14);
    return json(200, { voices }, { 'Cache-Control': 'public, max-age=3600' });
  } catch (err) {
    return json(500, { error: err.message });
  }
};
