const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
class Element {
  constructor(tag) { this.tag = tag; this.children = []; this.attrs = {}; }
  appendChild(node) { if (node.tag === 'fragment') { for (const c of [...node.children]) this.appendChild(c); return node; } this.children.push(node); node.parent = this; return node; }
  append(...nodes) { nodes.forEach(n => this.appendChild(n)); }
  insertBefore(node) { if (node.tag === 'fragment') { this.children.unshift(...node.children); } else this.children.unshift(node); }
  setAttribute(k,v) { this.attrs[k] = v; }
  querySelector(selector) { return this.children.find(c => c.className === selector.slice(1)) || null; }
  querySelectorAll() { return []; }
  remove() { this.parent.children = this.parent.children.filter(c => c !== this); }
  focus() { this.focused = true; }
}
function setup() {
  const copies = [], shares = [], requests = [];
  const ctx = {
    window: {replayPelexMessage: async (...args) => requests.push(args)},
    navigator: {clipboard: {writeText: async text => copies.push(text)}, share: async data => shares.push(data)},
    document: {createElement: tag => new Element(tag), createDocumentFragment: () => new Element('fragment')}
  };
  vm.runInNewContext(fs.readFileSync('assets/message-actions.js', 'utf8'),ctx);
  return {ctx, copies, shares, requests, attach: ctx.window.pelexMessageActions};
}
function control(node, name) { return node.querySelector('.msgactions').children.find(c => c.attrs['aria-label'] === name); }
test('user controls copy, share, reload and edit the exact message with attachments', async () => {
  const {attach, copies, shares, requests} = setup();
  const node = new Element('div');
  attach(node, 'Explain this photo', 'me', 'https://images.test/photo.png');
  for (const label of ['Copy','Reload','Share','Edit']) assert.ok(control(node,label));
  await control(node,'Copy').onclick(); assert.match(copies[0], /Explain this photo/);
  await control(node,'Share').onclick(); assert.match(shares[0].text, /https:\/\/images.test\/photo.png/);
  await control(node,'Reload').onclick(); assert.equal(requests[0][1], 'https://images.test/photo.png');
  await control(node,'Edit').onclick();
  const editor = node.querySelector('.message-editor'); editor.children[0].value = 'Read the sign';
  await editor.children[1].onclick();
  assert.equal(requests[1][0], 'Read the sign'); assert.equal(requests[1][1], 'https://images.test/photo.png');
  assert.equal(node.querySelector('.message-editor'), null);
});
test('restored replies reload their preceding user request; generated images use their retry callback', async () => {
  const {attach, requests} = setup();
  const user = new Element('div'); attach(user,'Draw a car','me');
  const task = new Element('div'); task.previousElementSibling = user;
  const reply = new Element('div'); reply.previousElementSibling = task;
  attach(reply,'Here is the answer');
  await control(reply,'Reload').onclick(); assert.equal(requests[0][0], 'Draw a car');
  let retries = 0;
  const image = new Element('div'); attach(image,'Here is your image.',null,'data:image/png;base64,abc',async () => { retries++; });
  await control(image,'Reload').onclick(); assert.equal(retries,1);
});
test('failed actions show feedback and restore button availability; share cancellation stays quiet', async () => {
  const {attach,ctx} = setup();
  ctx.navigator.share = async () => { throw Object.assign(new Error('cancelled'), {name:'AbortError'}); };
  const node = new Element('div'); attach(node,'Hello','me');
  await control(node,'Share').onclick();
  assert.equal(control(node,'Share').disabled,false);
  assert.equal(node.querySelector('.msgactions').children.at(-1).textContent,'');
  ctx.window.replayPelexMessage = async () => { throw new Error('Offline'); };
  await control(node,'Reload').onclick();
  assert.equal(control(node,'Reload').disabled,false);
  assert.equal(node.querySelector('.msgactions').children.at(-1).textContent,'Offline');
});


test('General Chat persists chat and message ownership and normalizes escaped Markdown', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  assert.match(html, /insert\(\{title:title,project_id:projectId,user_id:curUser\.id\}\)/);
  assert.match(html, /insert\(\{chat_id:cid,user_id:curUser\.id,role:role,content:body\}\)/);
  assert.match(html, /\.eq\('user_id',curUser\.id\).*\.eq\('role',role\)/);
  assert.match(html, /line\.replace\(\/\\\\\(\[\*_\x60~\]\)\/g,'\$1'\)/);
});
