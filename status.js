// HEALTH CHECK. Open https://YOUR-SITE/.netlify/functions/status in a browser.
// Shows whether voice and image reading are set up and whether the keys really work. It never shows a key.
const J = (code, obj) => ({ statusCode: code, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(obj, null, 2) });
const get = async (url, headers) => {
  const ac = new AbortController(); const t = setTimeout(() => ac.abort(), 7000);
  try { const r = await fetch(url, { headers, signal: ac.signal }); const j = await r.json().catch(() => ({})); return { status: r.status, j }; }
  catch (e) { return { status: 0, j: {}, err: e.name === 'AbortError' ? 'timed out' : e.message }; }
  finally { clearTimeout(t); }
};
const why = (j) => { const d = j && (j.detail || j.error); return typeof d === 'string' ? d : (d && d.message) || ''; };

exports.handler = async () => {
  if (typeof fetch !== 'function') return J(500, { error: 'This server needs Node 18 or newer', node: process.version });
  const out = { node: process.version, elevenlabs: { keySet: !!process.env.ELEVENLABS_API_KEY }, groq: { keySet: !!process.env.GROQ_API_KEY }, todo: [] };

  if (out.elevenlabs.keySet) {
    const u = await get('https://api.elevenlabs.io/v1/user/subscription', { 'xi-api-key': process.env.ELEVENLABS_API_KEY });
    out.elevenlabs.status = u.status;
    if (u.status === 200) {
      out.elevenlabs.keyWorks = true;
      out.elevenlabs.plan = u.j.tier;
      if (u.j.character_limit) out.elevenlabs.charactersLeft = Math.max(0, u.j.character_limit - (u.j.character_count || 0));
      if (out.elevenlabs.charactersLeft === 0) out.todo.push('ElevenLabs has no characters left this month. Voice will resume when the quota resets, or upgrade the plan.');
    } else if (u.status === 401) {
      // A restricted key can be valid yet lack the permission to read the subscription, so test the voice list too
      const v = await get('https://api.elevenlabs.io/v1/voices', { 'xi-api-key': process.env.ELEVENLABS_API_KEY });
      out.elevenlabs.keyWorks = v.status === 200;
      out.elevenlabs.message = why(u.j);
      if (!out.elevenlabs.keyWorks) out.todo.push('The ElevenLabs key was rejected. Create a new key in ElevenLabs (allow Text to Speech, Speech to Text and Voices read), put it in ELEVENLABS_API_KEY, then redeploy.');
    } else {
      out.elevenlabs.keyWorks = false; out.elevenlabs.message = u.err || why(u.j);
      out.todo.push('Could not reach ElevenLabs (' + (u.err || u.status) + ').');
    }
  } else out.todo.push('Add ELEVENLABS_API_KEY in Netlify > Site configuration > Environment variables, then redeploy. Voice cannot work without it.');

  if (out.groq.keySet) {
    const m = await get('https://api.groq.com/openai/v1/models', { Authorization: 'Bearer ' + process.env.GROQ_API_KEY });
    out.groq.status = m.status; out.groq.keyWorks = m.status === 200;
    const want = process.env.VISION_MODEL || 'qwen/qwen3.8-27b';
    out.groq.visionModel = want;
    if (m.status === 200) {
      const ids = (m.j.data || []).map((x) => x.id);
      out.groq.visionModelAvailable = ids.indexOf(want) > -1;
      if (!out.groq.visionModelAvailable) out.todo.push('Groq does not list ' + want + ' for this account. Image reading will use its backup models automatically.');
    } else out.todo.push('The Groq key was rejected (' + (m.err || m.status) + '). Create a new key and update GROQ_API_KEY, then redeploy.');
  } else out.todo.push('Add GROQ_API_KEY in Netlify environment variables, then redeploy. Image reading cannot work without it.');

  out.ready = { speak: !!out.elevenlabs.keyWorks, listen: !!out.elevenlabs.keyWorks, images: !!out.groq.keyWorks };
  if (!out.todo.length) out.todo.push('Everything is set up.');
  return J(200, out);
};
