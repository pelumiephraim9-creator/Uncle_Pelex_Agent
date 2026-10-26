/* Shared task activity. Stages reflect client requests, never invented model work. */
(function () {
  'use strict';
  var tasks = [], host, list, toggle, announcement;
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text) n.textContent = text; return n; }
  function mount() {
    if (host) return;
    host = el('section', 'task-center'); host.setAttribute('aria-label', 'Task activity');
    toggle = el('button', 'task-toggle', 'Task activity'); toggle.type = 'button'; toggle.setAttribute('aria-expanded', 'false'); toggle.setAttribute('aria-controls', 'pelex-task-list');
    list = el('div', 'task-list'); list.id = 'pelex-task-list'; list.hidden = true;
    var heading = el('div', 'task-heading', 'Activity this session');
    var clear = el('button', 'task-clear', 'Clear finished'); clear.type = 'button';
    clear.onclick = function () { tasks = tasks.filter(function (t) { if (t.state === 'running') return true; t.nodes.forEach(function (n) { n.remove(); }); return false; }); update(); };
    heading.appendChild(clear); list.appendChild(heading);
    announcement = el('span', 'task-sr'); announcement.setAttribute('role', 'status'); announcement.setAttribute('aria-live', 'polite');
    toggle.onclick = function () { list.hidden = !list.hidden; toggle.setAttribute('aria-expanded', String(!list.hidden)); };
    host.append(toggle, list, announcement); document.body.appendChild(host);
  }
  function card(t) {
    var box = el('details', 'task-card'); box.open = true;
    box.appendChild(el('summary')); box.appendChild(el('ol', 'task-steps')); return box;
  }
  function paint(t) {
    t.nodes.forEach(function (box) {
      box.dataset.state = t.state;
      var summary = box.querySelector('summary'); summary.replaceChildren();
      summary.append(el('span', 'task-dot'), el('span', 'task-title', t.title), el('span', 'task-time', t.state === 'running' ? Math.floor((Date.now() - t.start) / 1000) + 's' : t.state === 'done' ? 'Done' : 'Failed'));
      var steps = box.querySelector('ol'); steps.replaceChildren();
      t.steps.forEach(function (s, i) { var row = el('li', '', s); row.dataset.state = i < t.steps.length - 1 ? 'done' : t.state; steps.appendChild(row); });
    });
  }
  function update() {
    var count = tasks.filter(function (t) { return t.state === 'running'; }).length;
    toggle.textContent = count ? count + (count === 1 ? ' task running' : ' tasks running') : 'Task activity';
    toggle.dataset.running = String(count > 0); host.hidden = !tasks.length;
  }
  function begin(title, container) {
    mount();
    var t = { title: title, start: Date.now(), state: 'running', steps: ['Task started'], nodes: [] };
    tasks.push(t); var box = card(t); t.nodes.push(box); list.appendChild(box);
    if (container) { var inline = card(t); inline.classList.add('task-inline'); container.appendChild(inline); t.nodes.push(inline); container.scrollTop = container.scrollHeight; }
    // Keep session activity bounded without retaining prompts or responses.
    if (tasks.length > 30) { var old = tasks.findIndex(function (x) { return x !== t && x.state !== 'running'; }); if (old >= 0) { tasks[old].nodes.forEach(function (n) { n.remove(); }); tasks.splice(old, 1); } }
    function stage(text) { if (t.state !== 'running') return; if (t.steps[t.steps.length - 1] !== text) t.steps.push(text); paint(t); announcement.textContent = title + ': ' + text; }
    function finish(state, text) { if (t.state !== 'running') return; stage(text); t.state = state; paint(t); update(); }
    paint(t); update();
    return { step: stage, done: function (text) { finish('done', text || 'Task complete'); }, fail: function (text) { finish('failed', text || 'Task failed. Please try again.'); } };
  }
  window.PelexTasks = { begin: begin };
  setInterval(function () { tasks.forEach(function (t) { if (t.state === 'running') paint(t); }); }, 1000);

  // Observe backend requests shared by the app's pages, including user mutations.
  var originalFetch = window.fetch.bind(window);
  window.fetch = async function (resource, options) {
    var url = new URL(typeof resource === 'string' || resource instanceof URL ? resource : resource.url, location.href);
    var method = String(options && options.method || resource.method || 'GET').toUpperCase();
    var owned = options && options.pelexTask;
    var descriptors = {
      image: ['Generate image', 'Waiting for the image service'],
      vision: ['Read attached images', 'Waiting for image analysis'],
      transcribe: ['Transcribe recording', 'Converting speech to text'],
      speak: ['Prepare voice reply', 'Waiting for speech audio']
    };
    var name = url.pathname.split('/').pop();
    var desc = url.origin === location.origin && url.pathname.startsWith('/.netlify/functions/') && method === 'POST' && descriptors[name];
    if (!desc && method !== 'GET' && method !== 'HEAD' && /\/rest\/v1\//.test(url.pathname) && !/\/(chats|messages)(\/|$)/.test(url.pathname)) {
      var titles = { scheduled_tasks: 'Update scheduled task', pitch_profiles: 'Save Pitch Agent profile', pitch_drafts: 'Update application draft', pitch_link_checks: 'Submit Pitch Agent request', projects: 'Update project' };
      desc = [titles[name] || 'Account task', 'Waiting for account service'];
    }
    var task = owned || (desc && begin(desc[0]));
    if (owned) { options = Object.assign({}, options); delete options.pelexTask; }
    if (!task) return originalFetch(resource, options);
    if (desc && !owned) task.step(desc[1]);
    try {
      var response = await originalFetch(resource, options);
      if (!owned) {
        // Do not mark a response complete until its body arrives. Never render backend data.
        await response.clone().arrayBuffer();
        if (response.ok) task.done('Response received');
        else task.fail('Request failed (' + response.status + '). Please try again.');
      }
      return response;
    } catch (error) { if (!owned) task.fail('Connection interrupted. Please try again.'); throw error; }
  };
})();
