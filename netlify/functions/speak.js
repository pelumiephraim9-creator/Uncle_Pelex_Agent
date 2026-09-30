// Text -> natural speech via ElevenLabs. The API key stays here on the server (Netlify env var ELEVENLABS_API_KEY).
const json = (code, obj) => ({ statusCode: code, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) });

exports.handler = async (event) => {
  try {
    const { text } = JSON.parse(event.body || '{}');
    if (!text) return json(400, { error: 'No text received' });
    const voiceId = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'; // default voice: "Rachel"
    const r = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + voiceId, {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg'
      },
      body: JSON.stringify({
        text: text.slice(0, 2000),
        model_id: 'eleven_turbo_v2_5',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 }
      })
    });
    if (!r.ok) {
      let msg = 'Voice generation failed';
      try { const j = await r.json(); msg = (j.detail && (j.detail.message || j.detail)) || msg; } catch (e) {}
      return json(r.status, { error: msg });
    }
    const buf = Buffer.from(await r.arrayBuffer());
    return json(200, { audio: buf.toString('base64') });
  } catch (err) {
    return json(500, { error: err.message });
  }
};
