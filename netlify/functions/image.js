// Pelex image creation — Netlify Function.
//
// Required Netlify environment variables:
// SUPABASE_URL
// SUPABASE_ANON_KEY
// SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_KEY)
// IMAGE_WEBHOOK_URL
// X_Pelex_Image_Key (or IMAGE_KEY)
//
// Optional:
// IMAGE_FREE_DAILY (default: 3)
//
// Requires public.consume_image_quota(uuid, date, integer)
// to be installed in Supabase.

const J = (statusCode, payload) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  },
  body: JSON.stringify(payload),
});

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

// Accept image assets from common workflow response shapes, never prose or Markdown.
function imageAsset(value, depth = 0) {
  if (depth > 5 || value == null) return null;
  if (typeof value === 'string') {
    const candidate = value.trim();
    if (/^[\[{]/.test(candidate)) {
      try { return imageAsset(JSON.parse(candidate), depth + 1); } catch { return null; }
    }
    const markdown = candidate.match(/^!\[[^\]]*\]\((https:\/\/[^\s)]+)\)$/);
    if (markdown) return imageAsset(markdown[1], depth + 1);
    if (/^data:image\/(?:png|jpeg|webp|gif|avif);base64,[A-Za-z0-9+/\r\n]+={0,2}$/i.test(candidate)) return candidate;
    if (/^https:\/\//i.test(candidate)) {
      try {
        const url = new URL(candidate);
        if (url.username || url.password || /(^|\.)(?:placeholder\.com|placehold\.co|placehold\.it|example\.com|example\.test)$/i.test(url.hostname)) return null;
        return url.href;
      } catch { return null; }
    }
    // Only recognizable image bytes can be treated as raw base64.
    if (/^[A-Za-z0-9+/\r\n]+={0,2}$/.test(candidate) && candidate.length > 32) {
      const bytes = Buffer.from(candidate, 'base64');
      const mime = bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? 'image/png'
        : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 ? 'image/jpeg'
        : /^GIF8[79]a/.test(bytes.subarray(0, 6).toString()) ? 'image/gif'
        : bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP' ? 'image/webp' : null;
      if (mime) return `data:${mime};base64,${candidate}`;
    }
    return null;
  }
  if (Array.isArray(value)) {
    for (const item of value) { const image = imageAsset(item, depth + 1); if (image) return image; }
  } else if (typeof value === 'object') {
    for (const key of ['image', 'image_url', 'imageUrl', 'imageURL', 'url', 'b64_json', 'base64', 'images', 'result', 'data', 'output', 'json', 'body', 'response', 'binary', 'file']) {
      const image = imageAsset(value[key], depth + 1); if (image) return image;
    }
  }
  return null;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      ...J(405, { error: 'Use POST.' }),
      headers: {
        ...J(405, {}).headers,
        Allow: 'POST',
      },
    };
  }

  const E = typeof Netlify !== 'undefined' ? new Proxy({}, { get: (_, name) => Netlify.env.get(name) }) : process.env;

  const SU = (E.SUPABASE_URL || '').replace(/\/+$/, '');
  const AK = E.SUPABASE_ANON_KEY;
  const SK = E.SUPABASE_SECRET_KEY || E.SUPABASE_SERVICE_KEY;
  let HU = E.IMAGE_WEBHOOK_URL;
  const IK = E.X_Pelex_Image_Key || E.IMAGE_KEY;

  if (!SU || !AK || !SK || !HU || !IK) {
    return J(503, {
      error: 'Image creation is not switched on yet.',
    });
  }

  // n8n editor listeners are temporary. Use the same workflow's production
  // route even when an older site configuration still contains its test URL.
  try {
    const webhook = new URL(HU);
    if (webhook.protocol !== 'https:' || webhook.username || webhook.password) {
      return J(503, { error: 'The image service requires a valid HTTPS webhook URL.', code: 'IMAGE_WEBHOOK_INVALID' });
    }
    webhook.pathname = webhook.pathname.replace(/\/webhook-test(?=\/)/, '/webhook');
    HU = webhook.href;
  } catch {
    return J(503, { error: 'The image service webhook URL is invalid.', code: 'IMAGE_WEBHOOK_INVALID' });
  }

  // Require a bearer token from the signed-in user.
  const headers = event.headers || {};

  const authorization =
    headers.authorization || headers.Authorization || '';

  const tokenMatch = String(authorization).match(/^Bearer\s+(.+)$/i);
  const token = tokenMatch ? tokenMatch[1].trim() : '';

  if (!token) {
    return J(401, {
      error: 'Please sign in to create images.',
    });
  }

  // Validate request JSON.
  let body;

  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return J(400, {
      error: 'Invalid request body.',
    });
  }

  const prompt =
    typeof body.prompt === 'string'
      ? body.prompt.trim().slice(0, 500)
      : '';

  if (prompt.length < 3) {
    return J(400, {
      error: 'Describe the image you want.',
    });
  }

  // Verify the user's access token with Supabase Auth.
  let uid;

  try {
    const userResponse = await fetch(`${SU}/auth/v1/user`, {
      headers: {
        apikey: AK,
        Authorization: `Bearer ${token}`,
      },
    });

    if (!userResponse.ok) {
      return J(401, {
        error: 'Please sign in again.',
      });
    }

    const user = await readJson(userResponse);
    uid = user && user.id;

    const validUuid =
      typeof uid === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uid);

    if (!validUuid) {
      return J(401, {
        error: 'Please sign in again.',
      });
    }
  } catch {
    return J(502, {
      error: 'Could not check your account. Please try again.',
    });
  }

  // Privileged credentials remain on the server.
  const serviceHeaders = {
    apikey: SK,
    Authorization: `Bearer ${SK}`,
    'Content-Type': 'application/json',
  };

  const day = new Date().toISOString().slice(0, 10);

  const parsedLimit = Number.parseInt(
    E.IMAGE_FREE_DAILY || '3',
    10
  );

  const limit =
    Number.isInteger(parsedLimit) && parsedLimit >= 0
      ? parsedLimit
      : 3;

  // Check premium status. Fail closed if Supabase cannot verify it.
  let isPremium = false;

  try {
    const premiumResponse = await fetch(
      `${SU}/rest/v1/image_premium?user_id=eq.${encodeURIComponent(uid)}&select=user_id&limit=1`,
      {
        headers: serviceHeaders,
      }
    );

    if (!premiumResponse.ok) {
      return J(502, {
        error: 'Could not check your image access. Please try again.',
      });
    }

    const premiumRows = await readJson(premiumResponse);

    if (!Array.isArray(premiumRows)) {
      return J(502, {
        error: 'Could not check your image access. Please try again.',
      });
    }

    isPremium = premiumRows.length > 0;
  } catch {
    return J(502, {
      error: 'Could not check your image access. Please try again.',
    });
  }

  // Friendly pre-check. The atomic quota function remains authoritative.
  if (!isPremium) {
    try {
      const usageResponse = await fetch(
        `${SU}/rest/v1/image_usage?user_id=eq.${encodeURIComponent(uid)}&day=eq.${encodeURIComponent(day)}&select=used&limit=1`,
        {
          headers: serviceHeaders,
        }
      );

      if (!usageResponse.ok) {
        return J(502, {
          error: 'Could not check your image limit. Please try again.',
        });
      }

      const usageRows = await readJson(usageResponse);

      if (!Array.isArray(usageRows)) {
        return J(502, {
          error: 'Could not check your image limit. Please try again.',
        });
      }

      const used =
        usageRows.length > 0 &&
        Number.isInteger(usageRows[0].used)
          ? usageRows[0].used
          : 0;

      if (used >= limit) {
        return J(429, {
          error: `You have used your ${limit} free images for today. Activate the Personal or Business bot for more.`,
          remaining: 0,
        });
      }
    } catch {
      return J(502, {
        error: 'Could not check your image limit. Please try again.',
      });
    }
  }

  // Call your existing n8n image service.
  let imageResponse;

  try {
    imageResponse = await fetch(HU, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Pelex-Image-Key': IK,
      },
      body: JSON.stringify({
        prompt,
      }),
    });
  } catch {
    return J(502, {
      error: 'The image service did not answer. Please try again.',
    });
  }

  if (!imageResponse.ok) {
    if (imageResponse.status === 404) {
      return J(502, {
        error: 'The production image webhook was not found. Publish or activate the image workflow and check its production webhook URL.',
        code: 'IMAGE_WEBHOOK_NOT_FOUND',
      });
    }
    if (imageResponse.status === 401 || imageResponse.status === 403) {
      return J(502, {
        error: 'The image workflow rejected the server connection. Check that its header authentication matches the website image service configuration.',
        code: 'IMAGE_WEBHOOK_AUTH',
      });
    }
    return J(502, {
      error: 'The image service is busy right now. Please try again in a moment.',
    });
  }

  // Read the generated image from the n8n response.
  let image = null;

  const contentType = String(
    imageResponse.headers.get('content-type') || ''
  ).toLowerCase();

  try {
    if (contentType.startsWith('image/')) {
      const mime = contentType.split(';')[0];

      image =
        `data:${mime};base64,` +
        Buffer.from(
          await imageResponse.arrayBuffer()
        ).toString('base64');
    } else {
      // Webhooks may return JSON, a JSON string, or a plain image URL.
      const payload = typeof imageResponse.text === 'function'
        ? await imageResponse.text() : await readJson(imageResponse);
      image = imageAsset(payload);
    }
  } catch {
    return J(502, {
      error: 'I could not read the image service response. Please try again.',
    });
  }

  if (!image) {
    return J(502, {
      error: 'The image workflow returned no usable image. It must return the generated image as image bytes or JSON with an image URL, rather than a prompt or a workflow acknowledgement.',
      code: 'IMAGE_RESPONSE_MISSING',
    });
  }

  let remaining = null;

  // Atomically record successful free image usage.
  if (!isPremium) {
    try {
      const quotaResponse = await fetch(
        `${SU}/rest/v1/rpc/consume_image_quota`,
        {
          method: 'POST',
          headers: serviceHeaders,
          body: JSON.stringify({
            p_user_id: uid,
            p_day: day,
            p_limit: limit,
          }),
        }
      );

      if (!quotaResponse.ok) {
        return J(502, {
          error: 'Could not record your image usage. Please try again.',
        });
      }

      const quotaResult = await readJson(quotaResponse);

      const usedAfter =
        typeof quotaResult === 'number'
          ? quotaResult
          : Number(quotaResult);

      // SQL returns 0 when the quota has been reached.
      if (
        !Number.isInteger(usedAfter) ||
        usedAfter < 1 ||
        usedAfter > limit
      ) {
        return J(429, {
          error: `You have used your ${limit} free images for today. Activate the Personal or Business bot for more.`,
          remaining: 0,
        });
      }

      remaining = Math.max(0, limit - usedAfter);
    } catch {
      return J(502, {
        error: 'Could not record your image usage. Please try again.',
      });
    }
  }

  return J(200, {
    image,
    remaining,
  });
};
