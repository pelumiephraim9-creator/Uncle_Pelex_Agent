// Pelex image creation — Netlify Function.
//
// Required Netlify environment variables:
// SUPABASE_URL
// SUPABASE_ANON_KEY
// SUPABASE_SERVICE_KEY
// IMAGE_WEBHOOK_URL
// IMAGE_KEY
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

  const E = process.env;

  const SU = (E.SUPABASE_URL || '').replace(/\/+$/, '');
  const AK = E.SUPABASE_ANON_KEY;
  const SK = E.SUPABASE_SERVICE_KEY;
  const HU = E.IMAGE_WEBHOOK_URL;
  const IK = E.IMAGE_KEY;

  if (!SU || !AK || !SK || !HU || !IK) {
    return J(503, {
      error: 'Image creation is not switched on yet.',
    });
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
      const result = await readJson(imageResponse);

      const candidate =
        result &&
        (
          result.image ||
          (result.result && result.result.image) ||
          result.b64_json ||
          result.data ||
          result.output
        );

      if (
        typeof candidate === 'string' &&
        candidate.length > 100
      ) {
        if (candidate.startsWith('data:image/')) {
          image = candidate;
        } else if (/^[A-Za-z0-9+/]+={0,2}$/.test(candidate)) {
          image = `data:image/png;base64,${candidate}`;
        } else {
          // Preserve compatibility with workflows that return image URLs.
          image = candidate;
        }
      }
    }
  } catch {
    return J(502, {
      error: 'I could not read the image service response. Please try again.',
    });
  }

  if (!image) {
    return J(502, {
      error: 'I could not create that image. Please try again.',
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
