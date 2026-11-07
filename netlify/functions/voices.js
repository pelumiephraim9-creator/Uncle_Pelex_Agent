// VOICE LIST (ElevenLabs). Contract with index.html: GET -> { voices: [{ id, name, hint }] }
// Netlify env vars: ELEVENLABS_API_KEY (required; the key needs "Voices: read"), ALLOWED_ORIGIN (optional)
const J = (code, obj, extra) => ({ statusCode: code, headers: Object.assign({ 'Content-Type': 'application/json' }, extra || { 'Cache-Control': 'no-store' }), body: JSON.stringify(obj) });

exports.handler = async (event) => {
  try {
    if (typeof fetch !== 'function') return J(500, { error: 'This server needs Node 18 or newer' });
    const allowed = process.env.ALLOWED_ORIGIN, origin = (event.headers && (event.headers.origin || event.headers.Origin)) || '';
    if (allowed && origin && origin !== allowed) return J(403, { error: 'Origin not allowed' });
    if (!process.env.ELEVENLABS_API_KEY) return J(500, { error: 'Voice is not set up yet (ELEVENLABS_API_KEY is missing)' });
    const r = await fetch('https://api.elevenlabs.io/v1/voices', { headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY } });
    if (!r.ok) return J(r.status, { error: 'Could not list voices (' + r.status + ')' });
    const j = await r.json();
    // Only voices a free account can really use: premade, generated or cloned (library voices are paid-only through the API)
    const voices = (j.voices || [])
      .filter((v) => ['premade', 'generated', 'cloned'].indexOf(String(v.category || '').toLowerCase()) > -1)
      .map((v) => ({
        id: v.voice_id,
        name: String(v.name || '').split(/[-\u2013(]/)[0].trim(),
        hint: [v.labels && v.labels.gender, v.labels && v.labels.accent].filter(Boolean).join(' \u00b7 ')
      }))
      .filter((v) => v.id && v.name)
      .slice(0, 14);
    return J(200, { voices }, { 'Cache-Control': 'public, max-age=3600' });
  } catch (err) {
    return J(500, { error: err.message });
  }
};
