const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync('index.html', 'utf8');
const backend = fs.readFileSync('netlify/functions/image.js', 'utf8');
const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN3sAAAAASUVORK5CYII=';

function service(payload, legacy = false) {
  const calls = [];
  const env = {
    SUPABASE_URL: 'https://accounts.example.test', SUPABASE_ANON_KEY: 'test-only-anon',
    IMAGE_WEBHOOK_URL: 'https://workflow.example.test',
    [legacy ? 'SUPABASE_SERVICE_KEY' : 'SUPABASE_SECRET_KEY']: 'test-only-service',
    [legacy ? 'IMAGE_KEY' : 'X_Pelex_Image_Key']: 'test-only-image'
  };
  const ctx = { exports: {}, process: { env }, Buffer, URL, fetch: async (url, opts) => {
    calls.push({ url, opts });
    let data;
    if (url.endsWith('/auth/v1/user')) data = { id: '12345678-1234-4234-8234-123456789abc' };
    else if (url.includes('/image_premium?')) data = [];
    else if (url.includes('/image_usage?')) data = [{ used: 0 }];
    else if (url.endsWith('/rpc/consume_image_quota')) data = 1;
    else if (url === env.IMAGE_WEBHOOK_URL) data = payload;
    else throw new Error('Unexpected request');
    return { ok: true, headers: { get: () => 'application/json' }, json: async () => data };
  }};
  vm.runInNewContext(backend, ctx);
  return { ctx, calls, handler: ctx.exports.handler };
}
const event = { httpMethod: 'POST', headers: { authorization: 'Bearer test-only-session' }, body: JSON.stringify({ prompt: 'A man in a blue car' }) };

test('direct image requests route to generation; prompt-writing requests stay in chat', () => {
  const source = html.slice(html.indexOf('function isImageRequest('), html.indexOf('async function turn('));
  const ctx = {}; vm.runInNewContext(source, ctx);
  for (const text of ['GENERATE IMAGE OF A MAN HOLDING A CAR KEY', 'Can you please create an image of a cat?', 'Draw a sunset', 'I want an image of a car', 'Design a logo for my shop']) assert.equal(ctx.isImageRequest(text), true, text);
  for (const text of ['Write a prompt to generate an image', 'Generate a prompt for an image', 'Create a website with images', 'Explain image generation', 'Draw up a plan']) assert.equal(ctx.isImageRequest(text), false, text);
});

test('image assets are extracted from nested workflow responses and short URLs', () => {
  const { ctx } = service({});
  for (const payload of [{image: png}, [{json: 'ignored', output: {data: [{b64_json: png.split(',')[1]}]}}], {data: [{url: 'https://images.test/a.png'}]}]) assert.ok(ctx.imageAsset(payload));
  for (const payload of [{output: 'Here is a detailed image prompt: ' + 'x'.repeat(200)}, {output: '![image](https://via.placeholder.com/600x400)'}, {image: 'https://via.placeholder.com/600x400'}, {url: 'javascript:alert(1)'}, {url: 'https://user:password@images.test/a.png'}]) assert.equal(ctx.imageAsset(payload), null);
});

test('both environment naming conventions deliver an image and record quota', async () => {
  for (const legacy of [false, true]) {
    const {handler, calls} = service({data: [{url: 'https://images.test/a.png'}]}, legacy);
    const response = await handler(event);
    assert.equal(response.statusCode, 200);
    assert.equal(JSON.parse(response.body).image, 'https://images.test/a.png');
    assert.equal(JSON.parse(response.body).remaining, 2);
    assert.ok(calls.some(c => c.url.endsWith('/rpc/consume_image_quota')));
  }
});

test('prose-only workflow responses fail without consuming image quota', async () => {
  const {handler, calls} = service({output: 'Here is your generated image: ' + 'a description '.repeat(30)});
  const response = await handler(event);
  assert.equal(response.statusCode, 502);
  assert.ok(!calls.some(c => c.url.endsWith('/rpc/consume_image_quota')));
});

test('missing sign-in remains blocked before backend work', async () => {
  const {handler, calls} = service({image: png});
  assert.equal((await handler({...event, headers: {}})).statusCode, 401);
  assert.equal(calls.length, 0);
});

function imageClient(failure) {
  const stages = [], messages = [], requests = [];
  class Image { set src(value) { if (value) queueMicrotask(() => failure === 'decode' ? this.onerror() : this.onload()); } }
  const ctx = {
    Image, Promise, setTimeout, clearTimeout,
    dbOk: () => true, chat: {}, add: (...args) => messages.push(args), ensureChat: async () => {}, saveMsg: () => {},
    PelexTasks: {begin: () => ({step: s => stages.push(s), done: s => stages.push('DONE: ' + s), fail: s => stages.push('FAILED: ' + s)})},
    sb: {auth: {getSession: async () => ({data: {session: {access_token: 'test-session'}}})}},
    fetch: async (url, opts) => { requests.push(url); return {ok: failure !== 'backend', json: async () => failure === 'backend' ? {error: 'No usable image'} : {image: png, remaining: 2}}; }
  };
  const start = html.indexOf('async function makeImage(');
  vm.runInNewContext(html.slice(start, html.indexOf('\nwindow.generatePelexImage=', start)), ctx);
  return {ctx, stages, messages, requests};
}

test('frontend confirms image decode before displaying success', async () => {
  const {ctx, stages, messages, requests} = imageClient();
  await ctx.makeImage('Generate a cat image');
  assert.deepEqual(requests, ['/.netlify/functions/image']);
  assert.ok(messages.some(m => m[2] === png));
  assert.equal(stages.at(-1), 'DONE: Generated image displayed');
});

test('backend and broken image failures leave visible failure activity', async () => {
  for (const failure of ['backend', 'decode']) {
    const {ctx, stages, messages} = imageClient(failure);
    await ctx.makeImage('Generate a cat image');
    assert.match(stages.at(-1), /^FAILED:/);
    assert.ok(!stages.some(s => s.startsWith('DONE:')));
    assert.ok(!messages.some(m => m[2] === png));
  }
});

test('all inline application scripts parse', () => {
  const scripts = html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi);
  for (const [, attrs, source] of scripts) {
    if (/src=|application\/ld\+json/.test(attrs)) continue;
    new vm.Script(source);
  }
});
