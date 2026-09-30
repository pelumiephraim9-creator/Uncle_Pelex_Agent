# Uncle Pelex Agent 1.0

The live chat website for the Uncle Pelex AI Agent: a conversational assistant with text chat, live voice conversation, image understanding, and document/PDF reading.

## Structure

- `index.html` - the full front-end (chat UI, logo intro animation, voice recording, image/document attach flow). Plain HTML/CSS/JS, no build step.
- `netlify.toml` - tells Netlify where the serverless functions live.
- `netlify/functions/transcribe.js` - converts recorded speech to text using Groq Whisper (`whisper-large-v3-turbo`).
- `netlify/functions/vision.js` - understands uploaded images using Groq's vision model (`qwen/qwen3.8-27b`).
- `netlify/functions/speak.js` - converts the agent's text reply into natural speech using ElevenLabs, with a silent fallback to the browser's built-in voice if that ever fails.

## How it's wired together

The front end talks to the actual AI agent (the "brain") through a webhook hosted on Render, set near the top of `index.html` as `WEBHOOK_URL`. The three Netlify functions above are separate helpers for voice-in, vision, and voice-out, and each needs its own API key set as an environment variable in Netlify's site settings (never hard-coded in the files):

- `GROQ_API_KEY` - used by `transcribe.js` and `vision.js`
- `ELEVENLABS_API_KEY` - used by `speak.js`
- `ELEVENLABS_VOICE_ID` - optional, picks a specific ElevenLabs voice; defaults to a standard voice if not set

## Deploying

This repo is meant to be connected directly to Netlify (Site settings -> Build & deploy -> Link repository), so every push here triggers a new deploy automatically, instead of manually dragging a zip file in.

## Status

Working: text chat, live voice conversation (speech in and spoken reply out), image upload with an optional description, document/PDF upload and summarizing, logo intro animation.

Pending: Trello integration, general data entry, flight cost and driving-distance calculation, flight booking on a client's behalf, a proper backend/auth layer (Supabase), Paystack billing, and a few UI items (persistent pricing tab, signup flow with skip option).
