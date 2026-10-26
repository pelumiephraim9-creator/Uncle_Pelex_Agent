# Restore production image generation

The supplied n8n export uses a supported final response:

```json
{ "image": "data:image/jpeg;base64,[image data]", "provider": "cloudflare" }
```

The website accepts that shape. Returning the workflow export itself, a prompt, or a workflow acknowledgement does not deliver an image.

The supplied export has `active: false`. Publish or activate the image workflow in n8n before using its production webhook. An editor test can succeed while the production webhook remains unavailable. Use the production URL ending in `/webhook/pelex-image`, rather than `/webhook-test/pelex-image`, in the site's image webhook configuration. Use the production URL shown by n8n if the installation has a different URL prefix.

The supplied Cloudflare node URL contains `YOUR_ACCOUNT_ID`. If that is also present in the actual workflow, replace it in n8n with the correct account identifier and select the existing Cloudflare header credential. If the placeholder was only used to redact the export, leave the actual working URL as configured. The backup provider is used if this node fails, so failure of both providers still prevents an image response.

The webhook's header-auth credential must expect `X-Pelex-Image-Key`, matching the website function. Manage credential values in the service dashboards; do not paste them into source files, chat, screenshots, or command history.

Test through the production webhook and confirm the execution reaches **Respond image**, with a non-empty image data URL. A successful editor node execution alone does not confirm the webhook response. If the execution reaches **Respond error**, inspect the failed provider nodes in n8n. Keep **Respond image** configured to return JSON, not the workflow definition or a prompt. Deploy the website changes, sign in, and test a new image request in chat.

The endpoint now distinguishes a missing production webhook (`IMAGE_WEBHOOK_NOT_FOUND`), rejected header authentication (`IMAGE_WEBHOOK_AUTH`), an editor-only URL (`IMAGE_TEST_WEBHOOK`), and a response containing no image (`IMAGE_RESPONSE_MISSING`). These errors identify the failing boundary without exposing credentials. Chat-history network failures are a separate connection problem and do not prove a schema migration is needed.
