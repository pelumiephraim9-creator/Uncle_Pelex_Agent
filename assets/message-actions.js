/* Shared controls for new, restored, text, and image chat messages. */
(function () {
  'use strict';
  var paths = {
    Copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
    Reload: '<path d="M20 7v5h-5M20 12a8 8 0 1 0-2 5M20 7l-3-2"/>',
    Share: '<path d="M12 15V3m-4 4 4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>',
    Edit: '<path d="m15 4 5 5M4 20l5-1L20 8a3.5 3.5 0 0 0-5-5L4 14z"/>'
  };
  async function copy(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try { await navigator.clipboard.writeText(text); return; } catch (_) {}
    }
    var field = document.createElement('textarea');
    field.value = text; field.style.position = 'fixed'; field.style.opacity = '0';
    document.body.appendChild(field); field.select();
    try { if (!document.execCommand('copy')) throw new Error('Copy unavailable. Select the message text to copy it.'); }
    finally { field.remove(); }
  }
  window.pelexMessageActions = function (node, text, cls, image, retry) {
    if (cls && cls !== 'me') return;
    var previous = node.previousElementSibling;
    while (previous && !previous.pelexMessage) previous = previous.previousElementSibling;
    var request = cls === 'me' ? { text: text, image: image } : previous && previous.pelexMessage.request;
    node.pelexMessage = { request: request };
    var row = node.querySelector('.msgactions');
    if (!row) { row = document.createElement('div'); row.className = 'msgactions'; node.appendChild(row); }
    // Keep feedback and export controls; replace the older copy/retry controls.
    row.querySelectorAll('button[aria-label="Copy"],button[aria-label="Retry"]').forEach(function (b) { b.remove(); });
    var status = document.createElement('span'); status.className = 'fb'; status.setAttribute('role', 'status');
    var controls = document.createDocumentFragment();
    function button(label, action) {
      var b = document.createElement('button'); b.type = 'button'; b.title = label; b.setAttribute('aria-label', label);
      b.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths[label] + '</svg>';
      b.onclick = async function () { b.disabled = true; status.textContent = ''; try { await action(); } catch (e) { if (e.name !== 'AbortError') status.textContent = e.message || 'Please try again.'; } finally { b.disabled = false; } };
      controls.appendChild(b); return b;
    }
    var shareText = text + (image ? '\n' + (Array.isArray(image) ? image : [image]).filter(function (src) { return /^https:\/\//i.test(src); }).join('\n') : '');
    button('Copy', async function () { await copy(shareText); status.textContent = 'Copied'; });
    var reload = button('Reload', async function () {
      if (retry) return retry();
      if (!request) return;
      return window.replayPelexMessage(request.text, request.image);
    });
    reload.disabled = !retry && !request;
    button('Share', async function () {
      if (navigator.share) await navigator.share({ text: shareText });
      else { await copy(shareText); status.textContent = 'Copied for sharing'; }
    });
    button('Edit', function () {
      if (node.querySelector('.message-editor')) return;
      var editor = document.createElement('div'); editor.className = 'message-editor';
      var field = document.createElement('textarea'); field.value = text; field.setAttribute('aria-label', 'Edit message');
      var send = document.createElement('button'); send.type = 'button'; send.textContent = 'Send as new request';
      var cancel = document.createElement('button'); cancel.type = 'button'; cancel.textContent = 'Cancel'; cancel.onclick = function () { editor.remove(); };
      send.onclick = async function () {
        var value = field.value.trim(); if (!value) { field.focus(); return; }
        send.disabled = true;
        try { await window.replayPelexMessage(value, cls === 'me' ? image : undefined); editor.remove(); }
        catch (e) { status.textContent = e.message || 'Please try again.'; }
        finally { send.disabled = false; }
      };
      editor.append(field, send, cancel); node.appendChild(editor); field.focus();
    });
    row.insertBefore(controls, row.firstChild); row.appendChild(status);
  };
})();
