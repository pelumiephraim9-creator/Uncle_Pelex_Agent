// Image understanding via Groq (vision-capable model).
const json = (code, obj) => ({ statusCode: code, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) });

exports.handler = async (event) => {
  try {
    const { image, prompt } = JSON.parse(event.body || '{}');
    if (!image) return json(400, { error: 'No image received' });
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + process.env.GROQ_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.VISION_MODEL || 'qwen/qwen3.8-27b',
        max_tokens: 900,
        messages: [{ role: 'user', content: [
          { type: 'text', text: prompt || 'Describe this image and explain what matters in it.' },
          { type: 'image_url', image_url: { url: image } }
        ] }]
      })
    });
    const j = await r.json();
    if (!r.ok) return json(r.status, { error: (j.error && j.error.message) || 'Image analysis failed' });
    return json(200, { text: j.choices[0].message.content });
  } catch (err) {
    return json(500, { error: err.message });
  }
};
