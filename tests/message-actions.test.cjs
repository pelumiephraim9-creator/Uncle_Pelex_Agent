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


test('General Agent awaits user persistence and pins each turn to its original chat', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  const turn = html.slice(html.indexOf('async function turn(text,shown,img,el){'), html.indexOf('async function sendTyped(){'));
  assert.match(turn, /await authReadyPromise/);
  assert.match(turn, /await queueHistorySave\('user',_ct,_ct,historyContext,userMessageId\)/);
  assert.match(turn, /if\(!userSaved\.ok\)\{/);
  assert.match(turn, /I could not safely save your message, so I did not send it to the agent/);
  assert.ok(turn.indexOf("await queueHistorySave('user'") < turn.indexOf('askAgentRetry(text)'));
  assert.match(turn, /historyContext=\{chatId:curChatId,userId:curUser\.id/);
  assert.match(html, /function queueHistorySave\(role,content,chatTitle,context,messageId,attachments\)/);
  assert.match(html, /async function saveMsg\(role,content,context,messageId,attachments\)/);
  assert.match(html, /insert\(\{id:id,chat_id:cid,user_id:uid,role:role,content:body\}\)/);
  assert.match(html, /pelex_chat_pending_v2/);
  assert.match(html, /async function flushPendingMessages/);
  assert.doesNotMatch(html, /async async function flushPendingMessages/);
  assert.match(html, /storeChatAttachments\(attachments,uid,cid,id\)/);
  assert.match(html, /__pelexChatMessage:1/);
  assert.match(html, /pendingChatFor\(id,curUser\.id\)/);
  assert.match(html, /signedChatImages\(parsed\.attachments\)/);
  assert.match(html, /await queueHistorySave\('user',imageLabel,q,historyContext,userMessageId,datas\)/);
  assert.match(html, /I could not safely save this image, so I did not send it to the agent/);
  assert.match(html, /select\('id,role,content,created_at'\)\.eq\('chat_id',id\)/);
  assert.match(html, /line\.replace\(\/\\\\\(\[\*_\x60~\]\)\/g,'\$1'\)/);
});

test('General Agent archive scope and modal controls have no known runtime or label defects', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  assert.doesNotMatch(html, /loadNotes\(ws\(\)\)/);
  assert.match(html, /loadNotes\(wsId\(\)\)/);
  assert.match(html, /document\.querySelectorAll\('\.pvmodal'\)\.forEach/);
  assert.match(html, /for="pSubj"/);
  assert.match(html, /for="pBody"/);
  assert.match(html, /devShortcut/);
});

test('audited Pelex add-on loads and keeps its business records project-scoped', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  const addon = fs.readFileSync('pelex_addons_runtime.js', 'utf8');
  new vm.Script(addon);
  assert.match(html, /<script src="\/pelex_addons_runtime\.js\?v=1"><\/script>/);
  assert.match(addon, /window\.pxReadDocument=pxReadDocument/);
  assert.match(addon, /window\.pxOpenSlipCapture/);
  assert.match(addon, /p_project:projectId/);
  assert.match(addon, /business_types/);
  assert.match(addon, /\.eq\('project_id',projectId\(\)\)/);
  assert.doesNotMatch(addon, /list_audit/);
  assert.doesNotMatch(addon, /\.select\('id'\)\.eq\('workspace_id',wsId\(\)\)\.order\('created_at'/);
});

test('existing connector cards map to the backend connector catalogue slugs', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  assert.match(html, /var aliases=\{gcalendar:'google-calendar',gsheets:'google-sheets',gmeet:'google-meet'\}/);
  assert.match(html, /sb\.from\('connectors'\)\.select\('slug,status,group_name,needs'\)/);
});
