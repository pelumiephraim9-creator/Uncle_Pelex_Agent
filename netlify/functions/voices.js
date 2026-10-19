// Text to speech via ElevenLabs. Contract with index.html: POST { text, voice, speed } -> { audio: <base64 mp3> }
// Env vars (Netlify): ELEVENLABS_API_KEY (required), ELEVEN_VOICE_FEMALE, ELEVEN_VOICE_MALE, ELEVEN_MODEL, ALLOWED_ORIGIN (optional)
const json = (code, obj) => ({ statusCode: code, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) });

// Default ElevenLabs premade voices; replace with your own voice IDs through the env vars.
const VOICES = {
  female: process.env.ELEVEN_VOICE_FEMALE || '21m00Tcm4TlvDq8ikWAM',
  male: process.env.ELEVEN_VOICE_MALE || 'pNInz6obpgDQGcFmaJgB'
};

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return json(405, { error: 'POST only' });
    const allowed = process.env.ALLOWED_ORIGIN;
    const origin = (event.headers && (event.headers.origin || event.headers.Origin)) || '';
    if (allowed && origin && origin !== allowed) return json(403, { error: 'Origin not allowed' });
    if (!process.env.ELEVENLABS_API_KEY) return json(500, { error: 'Voice is not configured yet' });

    const { text, voice, speed, language } = JSON.parse(event.body || '{}');
    const clean = String(text || '').trim().slice(0, 1000); // cap keeps credit use bounded
    if (!clean) return json(400, { error: 'No text received' });

    const voiceId = VOICES[voice] || (/^[A-Za-z0-9]{15,30}$/.test(voice || '') ? voice : VOICES.female);
    const spd = Math.min(1.2, Math.max(0.7, parseFloat(speed) || 1)); // ElevenLabs allows 0.7 to 1.2

    // Flash v2.5 covers 32 languages. Anything else (Hausa, Swahili, Yoruba, Igbo...) is tried on the broader v3 model.
    const FLASH = ['en','ja','zh','de','hi','fr','ko','pt','it','es','id','nl','tr','fil','pl','sv','bg','ro','ar','cs','el','fi','hr','ms','sk','da','ta','uk','ru','hu','no','vi'];
    const lang = String(language || 'en').toLowerCase().slice(0, 8);
    const model = process.env.ELEVEN_MODEL || (FLASH.indexOf(lang) > -1 ? 'eleven_flash_v2_5' : 'eleven_v3');
    const body = {
      text: clean,
      model_id: model,
      voice_settings: { speed: spd }
    };
    if (language) body.language_code = lang;

    const r = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + voiceId + '?output_format=mp3_44100_128', {
      method: 'POST',
      headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify(body)
    });
    if (!r.ok) {
      let msg = 'Voice request failed (' + r.status + ')';
      try { const j = await r.json(); if (j.detail && j.detail.message) msg = j.detail.message; } catch (e) {}
      return json(r.status, { error: msg });
    }
    const buf = Buffer.from(await r.arrayBuffer());
    return json(200, { audio: buf.toString('base64') });
  } catch (err) {
    return json(500, { error: err.message });
  }
};
