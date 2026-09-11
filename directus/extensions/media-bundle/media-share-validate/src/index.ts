import { defineEndpoint } from '@directus/extensions-sdk';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';
import { renderPrintJpeg } from '../../shared/printAsset';
import { resolveDisplayFilename } from '../../media-library/src/utils/zipDownloadShared';

const CLIENT_JS = `
(function () {
  var app = document.getElementById('app');
  var SHARE_ID = app.dataset.shareId;
  var BASE = '/media-share-validate';

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatFileSizeMb(bytes) {
    if (bytes == null || !isFinite(bytes) || bytes < 0) return null;
    var mb = bytes / (1024 * 1024);
    if (mb >= 1) return mb.toFixed(mb >= 10 ? 1 : 2) + ' MB';
    if (mb >= 0.01) return mb.toFixed(2) + ' MB';
    var kb = bytes / 1024;
    if (kb >= 1) return kb.toFixed(0) + ' KB';
    return bytes + ' B';
  }

  function formatDimensions(width, height) {
    if (width > 0 && height > 0) return width + ' × ' + height + ' px';
    return null;
  }

  var MIME_TO_EXT = {
    'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/gif': 'gif',
    'image/webp': 'webp', 'image/avif': 'avif', 'image/svg+xml': 'svg', 'image/tiff': 'tiff',
    'image/bmp': 'bmp', 'image/heic': 'heic', 'image/heif': 'heif',
    'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm', 'video/ogg': 'ogv',
    'video/x-msvideo': 'avi', 'video/x-matroska': 'mkv',
    'audio/mpeg': 'mp3', 'audio/wav': 'wav', 'audio/ogg': 'ogg', 'audio/mp4': 'm4a',
    'application/pdf': 'pdf', 'text/plain': 'txt', 'text/csv': 'csv'
  };

  function extFromMime(mime) {
    if (!mime) return '';
    var m = String(mime).toLowerCase().split(';')[0];
    if (MIME_TO_EXT[m]) return MIME_TO_EXT[m];
    var slash = m.lastIndexOf('/');
    if (slash >= 0) {
      var sub = m.slice(slash + 1).replace(/^x-/, '');
      if (sub && sub !== 'octet-stream' && /^[a-z0-9]+$/i.test(sub)) return sub;
    }
    return '';
  }

  function resolveDisplayFilename(meta) {
    var candidates = [meta.generatedFilename, meta.title, meta.filename]
      .map(function (v) { return (v || '').trim(); })
      .filter(Boolean);

    function isUuidName(name) {
      var base = name.replace(/\\.[^.]+$/, '');
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(base);
    }

    candidates = candidates.filter(function (name) { return !isUuidName(name); });
    var withExt = null;
    for (var i = 0; i < candidates.length; i++) {
      if (/\\.([a-z0-9]{1,8})$/i.test(candidates[i])) {
        withExt = candidates[i];
        break;
      }
    }
    if (withExt) return withExt;

    var base = candidates[0] || (meta.filename || '').trim();
    if (!base || isUuidName(base)) return '';
    base = base.replace(/\\.[^.]+$/, '');
    var ext = extFromMime(meta.fileType);
    return ext ? base + '.' + ext : base;
  }

  function buildFileInfoHtml(meta) {
    var displayName = resolveDisplayFilename(meta);
    if (!displayName && meta.filesize == null && !meta.width && !meta.height) return '';

    var details = [];
    var sizeLabel = formatFileSizeMb(meta.filesize);
    var dimensionsLabel = formatDimensions(meta.width, meta.height);
    if (sizeLabel) details.push(sizeLabel);
    if (dimensionsLabel) details.push(dimensionsLabel);

    var html = '<div class="viewer-fileinfo">';
    if (displayName) {
      html += '<p class="viewer-filename">' + escapeHtml(displayName) + '</p>';
    }
    if (details.length) {
      html += '<p class="viewer-filemeta">' + escapeHtml(details.join(' · ')) + '</p>';
    }
    html += '</div>';
    return html;
  }

  function updateFileInfoDimensions(width, height) {
    if (!(width > 0 && height > 0)) return;
    var dimensionsLabel = formatDimensions(width, height);
    if (!dimensionsLabel) return;

    var infoEl = document.querySelector('.viewer-fileinfo');
    if (!infoEl) return;

    var metaEl = infoEl.querySelector('.viewer-filemeta');
    if (metaEl && metaEl.textContent.indexOf('×') !== -1) return;

    if (!metaEl) {
      metaEl = document.createElement('p');
      metaEl.className = 'viewer-filemeta';
      infoEl.appendChild(metaEl);
    }

    var parts = metaEl.textContent ? metaEl.textContent.split(' · ').filter(Boolean) : [];
    if (parts.indexOf(dimensionsLabel) === -1) parts.push(dimensionsLabel);
    metaEl.textContent = parts.join(' · ');
  }

  function init() {
    fetch(BASE + '/' + SHARE_ID)
      .then(function (res) {
        return res.json().then(function (data) { return { status: res.status, data: data }; });
      })
      .then(function (r) {
        if (r.status === 404) return showError('not_found');
        if (r.status === 403) return showError('expired');
        if (!r.data.requiresPassword) {
          showViewer(r.data);
        } else {
          showGate();
        }
      })
      .catch(function () { showError('network'); });
  }

  function showError(reason) {
    var msgs = {
      not_found: 'This share link is invalid or does not exist.',
      expired: 'This share link has expired.',
      network: 'Could not reach the server. Please try again.',
    };
    app.innerHTML =
      '<div class="error-card">' +
        '<div class="icon">&#9888;</div>' +
        '<h2>Access Denied</h2>' +
        '<p>' + (msgs[reason] || 'Something went wrong.') + '</p>' +
      '</div>';
  }

  function showGate() {
    app.innerHTML =
      '<div class="card">' +
        '<h2>Protected File</h2>' +
        '<p class="sub">Enter the password to view this shared file.</p>' +
        '<input id="pw" type="password" placeholder="Password" autocomplete="current-password" />' +
        '<button class="primary" id="submit-btn"><span>View File</span></button>' +
        '<p class="error" id="pw-error" style="display:none"></p>' +
      '</div>';
    document.getElementById('submit-btn').addEventListener('click', submitPassword);
    document.getElementById('pw').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') submitPassword();
    });
  }

  function submitPassword() {
    var input = document.getElementById('pw');
    var btn = document.getElementById('submit-btn');
    var errEl = document.getElementById('pw-error');
    var pw = input.value;
    if (!pw) return;

    btn.disabled = true;
    input.disabled = true;
    errEl.style.display = 'none';
    btn.innerHTML = '<span class="btn-spinner"></span>';

    fetch(BASE + '/' + SHARE_ID, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw }),
    })
      .then(function (res) {
        return res.json().then(function (data) { return { status: res.status, data: data }; });
      })
      .then(function (r) {
        if (r.status === 404) return showError('not_found');
        if (r.status === 403) return showError('expired');
        if (r.status === 401) {
          errEl.textContent = 'Incorrect password. Please try again.';
          errEl.style.display = 'block';
          btn.disabled = false;
          input.disabled = false;
          btn.innerHTML = '<span>View File</span>';
          input.value = '';
          return;
        }
        if (r.data.fileId) showViewer(r.data);
      })
      .catch(function () {
        errEl.textContent = 'An unexpected error occurred.';
        errEl.style.display = 'block';
        btn.disabled = false;
        input.disabled = false;
        btn.innerHTML = '<span>View File</span>';
      });
  }

  function setDownloadButtonBusy(busy) {
    var btn = document.getElementById('dl-btn');
    if (!btn) return;
    if (busy) {
      if (!btn.dataset.defaultLabel) btn.dataset.defaultLabel = btn.textContent || 'Download';
      btn.disabled = true;
      btn.innerHTML = '<span class="btn-spinner"></span> Downloading…';
      btn.classList.add('is-busy');
      return;
    }
    btn.disabled = false;
    btn.textContent = btn.dataset.defaultLabel || 'Download';
    btn.classList.remove('is-busy');
  }

  function showViewer(meta) {
    document.body.classList.add('viewer');
    var fileId = meta.fileId;
    var fileType = meta.fileType;
    var isImage = fileType && fileType.startsWith('image/');
    var isVideo = fileType && fileType.startsWith('video/');
    var isSvg = fileType === 'image/svg+xml' || (meta.filename && /\.svg$/i.test(meta.filename));
    var fileUrl = BASE + '/' + SHARE_ID + '/file';

    var mediaHtml;
    if (isImage) {
      mediaHtml =
        '<div class="viewer-image-wrap' + (isSvg ? ' is-svg' : '') + '">' +
          '<div class="viewer-loading" id="img-loading"><div class="spinner"></div><p>Loading…</p></div>' +
          '<div class="viewer-error" id="img-error" style="display:none"><p>Failed to load image.</p></div>' +
          '<img id="viewer-img" src="' + fileUrl + '" alt="Shared file" style="display:none" />' +
        '</div>';
    } else if (isVideo) {
      mediaHtml =
        '<div class="viewer-media-wrap">' +
          '<div class="viewer-loading" id="vid-loading"><div class="spinner"></div><p>Loading…</p></div>' +
          '<div class="viewer-error" id="vid-error" style="display:none"><p>Failed to load video.</p></div>' +
          '<video id="viewer-vid" controls preload="auto" playsinline src="' + fileUrl + '"></video>' +
        '</div>';
    } else {
      mediaHtml =
        '<div class="doc-card">' +
          '<svg class="doc-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>' +
            '<polyline points="14 2 14 8 20 8"/>' +
            '<line x1="16" y1="13" x2="8" y2="13"/>' +
            '<line x1="16" y1="17" x2="8" y2="17"/>' +
            '<polyline points="10 9 9 9 8 9"/>' +
          '</svg>' +
          '<p class="doc-type">' + (fileType || 'Unknown type') + '</p>' +
        '</div>';
    }

    var downloadHtml = isImage
      ? '<button class="btn btn-purple" id="dl-btn">Download</button>'
      : '<button class="btn btn-purple" id="dl-btn">Download</button>';

    var actionsVisible = !isImage && !isVideo;
    var fileInfoHtml = buildFileInfoHtml(meta);
    app.innerHTML =
      '<div class="viewer-card">' +
        mediaHtml +
        fileInfoHtml +
        '<div id="share-download-root"></div>' +
        '<div class="actions" id="actions" style="' + (actionsVisible ? '' : 'display:none') + '">' +
          downloadHtml +
          '<button class="btn btn-dark" id="edit-btn">Edit in Directus</button>' +
        '</div>' +
      '</div>';

    document.getElementById('edit-btn').addEventListener('click', function () {
      window.open('/admin/media-library/' + fileId, '_blank');
    });

    function wireDownloadButton() {
      var btn = document.getElementById('dl-btn');
      if (!btn) return;
      btn.addEventListener('click', function () {
        if (btn.disabled) return;
        if (window._shareDownloadApi) {
          window._shareDownloadApi.openDownloadModal();
          return;
        }
        doDownload(meta);
      });
    }

    if (isImage) {
      var img = document.getElementById('viewer-img');
      img.onload = function () {
        document.getElementById('img-loading').style.display = 'none';
        img.style.display = 'block';
        document.getElementById('actions').style.display = 'flex';
        if (!meta.width || !meta.height) {
          updateFileInfoDimensions(img.naturalWidth, img.naturalHeight);
        }
      };
      img.onerror = function () {
        document.getElementById('img-loading').style.display = 'none';
        document.getElementById('img-error').style.display = 'block';
      };

      var mountEl = document.getElementById('share-download-root');
      try {
        if (window.ShareViewerDownload && mountEl) {
          window._shareDownloadApi = window.ShareViewerDownload.mountShareDownload(
            mountEl,
            SHARE_ID,
            meta,
            { onDownloadBusy: setDownloadButtonBusy }
          );
        }
      } catch (err) {
        console.error('[share-viewer] failed to mount download modal', err);
        window._shareDownloadApi = null;
      }
      wireDownloadButton();
    } else if (isVideo) {
      var vid = document.getElementById('viewer-vid');
      var vidLoading = document.getElementById('vid-loading');
      var vidError = document.getElementById('vid-error');
      var vidRevealed = false;

      function finishVideoLoading(failed) {
        if (vidRevealed) return;
        vidRevealed = true;
        vidLoading.style.display = 'none';
        vid.style.visibility = 'visible';
        if (failed) {
          vidError.style.display = 'block';
        } else {
          vidError.style.display = 'none';
          if (!meta.width || !meta.height) {
            updateFileInfoDimensions(vid.videoWidth, vid.videoHeight);
          }
        }
        document.getElementById('actions').style.display = 'flex';
      }

      function videoFailed() {
        return !!(vid.error && vid.error.code !== 0);
      }

      function videoReadyEnough() {
        return vid.readyState >= 1 || vid.videoWidth > 0;
      }

      function onVideoProgress() {
        if (videoFailed()) finishVideoLoading(true);
        else if (videoReadyEnough()) finishVideoLoading(false);
      }

      vid.addEventListener('loadedmetadata', onVideoProgress);
      vid.addEventListener('loadeddata', onVideoProgress);
      vid.addEventListener('canplay', onVideoProgress);
      vid.addEventListener('playing', function () { finishVideoLoading(false); });
      vid.addEventListener('error', function () { finishVideoLoading(true); });
      vid.addEventListener('stalled', function () {
        setTimeout(function () {
          if (!vidRevealed && videoFailed()) finishVideoLoading(true);
        }, 1500);
      });

      var pollCount = 0;
      var pollTimer = setInterval(function () {
        pollCount += 1;
        if (vidRevealed) {
          clearInterval(pollTimer);
          return;
        }
        onVideoProgress();
        if (pollCount >= 24) {
          clearInterval(pollTimer);
          finishVideoLoading(videoFailed());
        }
      }, 500);

      wireDownloadButton();
    } else {
      document.getElementById('dl-btn').addEventListener('click', function () {
        if (document.getElementById('dl-btn').disabled) return;
        doDownload(meta);
      });
    }
  }

  function doDownload(meta) {
    var btn = document.getElementById('dl-btn');
    if (!btn || btn.disabled) return;

    setDownloadButtonBusy(true);
    var params = new URLSearchParams({ download: 'true' });
    fetch(BASE + '/' + SHARE_ID + '/file?' + params)
      .then(function (res) {
        if (!res.ok) throw new Error('Download failed');
        return res.blob();
      })
      .then(function (blob) {
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        var name = resolveDisplayFilename(meta);
        if (name) a.setAttribute('download', name);
        else a.setAttribute('download', '');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      })
      .catch(function () {
        alert('Download failed. Please try again.');
      })
      .finally(function () {
        setDownloadButtonBusy(false);
      });
  }

  init();
})();
`;

const PAGE_CSS = `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: sans-serif; background: #f5f5f5; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
.spinner { width: 36px; height: 36px; border: 3px solid rgba(102,68,255,0.2); border-top-color: #6644FF; border-radius: 50%; animation: spin 0.6s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.card { background: #fff; border-radius: 8px; box-shadow: 0 2px 12px rgba(0,0,0,.1); padding: 40px; width: 100%; max-width: 400px; }
.card h2 { font-size: 22px; font-weight: 600; color: #1a1a1a; margin-bottom: 8px; }
.card p.sub { font-size: 14px; color: #666; margin-bottom: 24px; }
.card input { width: 100%; padding: 10px 14px; font-size: 15px; border: 1px solid #ddd; border-radius: 6px; outline: none; transition: border-color .2s; }
.card input:focus { border-color: #6644FF; }
.card input:disabled { background: #f9f9f9; color: #aaa; }
.card button.primary { margin-top: 12px; width: 100%; padding: 11px; font-size: 15px; font-weight: 600; color: #fff; background: #6644FF; border: none; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: background .2s; }
.card button.primary:hover:not(:disabled) { background: #5039CC; }
.card button.primary:disabled { background: #aaa; cursor: not-allowed; }
.card .error { margin-top: 14px; font-size: 13px; color: #d32f2f; text-align: center; }
.btn-spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,.4); border-top-color: #fff; border-radius: 50%; animation: spin .6s linear infinite; display: inline-block; }
.error-card { background: #fff; border-radius: 8px; box-shadow: 0 2px 12px rgba(0,0,0,.1); padding: 48px 40px; width: 100%; max-width: 400px; text-align: center; }
.error-card .icon { font-size: 40px; color: #d32f2f; margin-bottom: 16px; }
.error-card h2 { font-size: 22px; font-weight: 600; color: #1a1a1a; margin-bottom: 12px; }
.error-card p { font-size: 15px; color: #555; line-height: 1.5; }
body.viewer { background: #1a1a1a; }
.viewer-card { display: flex; flex-direction: column; align-items: center; gap: 20px; padding: 24px; max-width: 90vw; }
#share-download-root { position: absolute; width: 0; height: 0; overflow: visible; }
.viewer-image-wrap { position: relative; display: inline-flex; align-items: center; justify-content: center; max-width: 100%; }
.viewer-image-wrap.is-svg { background: #fff; padding: 20px; border-radius: 6px; box-shadow: 0 4px 24px rgba(0,0,0,.5); }
.viewer-image-wrap.is-svg .viewer-loading { color: #666; }
.viewer-image-wrap.is-svg .viewer-loading .spinner { border-color: rgba(102,68,255,0.2); border-top-color: #6644FF; }
.viewer-image-wrap.is-svg .viewer-error { color: #c62828; }
.viewer-card img { max-width: 100%; max-height: 80vh; border-radius: 6px; object-fit: contain; box-shadow: 0 4px 24px rgba(0,0,0,.5); }
.viewer-image-wrap.is-svg img { box-shadow: none; border-radius: 0; }
.viewer-filename { margin: 0; max-width: min(860px, 90vw); font-size: 14px; font-weight: 600; color: #f0f0f0; text-align: center; word-break: break-word; line-height: 1.4; }
.viewer-fileinfo { display: flex; flex-direction: column; align-items: center; gap: 4px; max-width: min(860px, 90vw); }
.viewer-filemeta { margin: 0; font-size: 13px; font-weight: 400; color: #aaa; text-align: center; line-height: 1.4; }
.actions { display: flex; gap: 12px; align-items: center; }
.btn { padding: 10px 22px; font-size: 14px; font-weight: 600; border: none; border-radius: 6px; cursor: pointer; transition: background .2s; color: #fff; display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
.btn-purple { background: #6644FF; } .btn-purple:hover:not(:disabled) { background: #5039CC; }
.btn-purple:disabled, .btn-purple.is-busy { background: #9B8AD9; cursor: not-allowed; opacity: 0.92; }
.btn-dark { background: #333; } .btn-dark:hover { background: #444; }
.dl-group { position: relative; }
.dl-menu { position: absolute; bottom: calc(100% + 6px); left: 0; background: #fff; border: 1px solid #ddd; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,.15); overflow: hidden; min-width: 120px; z-index: 10; display: none; }
.dl-menu.open { display: block; }
.dl-menu button { display: block; width: 100%; padding: 9px 16px; font-size: 14px; font-weight: 500; color: #1a1a1a; background: none; border: none; text-align: left; cursor: pointer; }
.dl-menu button:hover { background: #f0ecff; color: #6644FF; }
.viewer-error { color: #f88; font-size: 14px; }
.viewer-loading { color: #ccc; font-size: 14px; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.viewer-loading .spinner { border-color: rgba(255,255,255,.2); border-top-color: #fff; }
.viewer-media-wrap { position: relative; display: flex; align-items: center; justify-content: center; width: min(860px, 90vw); max-width: 100%; }
.viewer-media-wrap .viewer-loading,
.viewer-media-wrap .viewer-error { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 2; }
#viewer-vid { display: block; visibility: visible; width: 100%; max-width: 100%; max-height: 75vh; border-radius: 6px; box-shadow: 0 4px 24px rgba(0,0,0,.5); background: #000; }
.doc-card { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 40px 48px; background: #2a2a2a; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,.4); min-width: 260px; }
.doc-icon { width: 72px; height: 72px; color: #aaa; }
.doc-type { margin: 0; font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: .05em; }
`;

function browserVideoContentType(contentType: string | null | undefined, filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (contentType === 'video/quicktime' || ext === 'mov') return 'video/mp4';
  if (contentType?.startsWith('video/')) return contentType;
  if (ext === 'mp4' || ext === 'm4v') return 'video/mp4';
  if (ext === 'webm') return 'video/webm';
  if (ext === 'ogv' || ext === 'ogg') return 'video/ogg';
  return contentType || 'application/octet-stream';
}

function parseByteRange(rangeHeader: string | undefined, size: number) {
  if (!rangeHeader || !/^bytes=/.test(rangeHeader) || size <= 0) return null;

  const [startStr, endStr] = rangeHeader.replace(/bytes=/, '').split('-');
  let start = startStr ? parseInt(startStr, 10) : 0;
  let end = endStr ? parseInt(endStr, 10) : size - 1;

  if (Number.isNaN(start) || start < 0) start = 0;
  if (Number.isNaN(end) || end >= size) end = size - 1;
  if (start > end) return null;

  return { start, end, chunkSize: end - start + 1 };
}

async function pipeStreamRange(
  stream: Readable,
  res: any,
  start: number,
  end: number,
) {
  let offset = 0;

  for await (const chunk of stream) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    const chunkStart = offset;
    const chunkEnd = offset + buf.length - 1;
    offset += buf.length;

    if (chunkEnd < start) continue;
    if (chunkStart > end) break;

    const sliceStart = Math.max(0, start - chunkStart);
    const sliceEnd = Math.min(buf.length, end - chunkStart + 1);
    res.write(buf.subarray(sliceStart, sliceEnd));
  }

  res.end();
}

function buildTransformationFromQuery(query: Record<string, unknown>) {
  const params: Record<string, unknown> = {};
  if (query.format) params.format = String(query.format);
  if (query.width) params.width = Number(query.width);
  if (query.height) params.height = Number(query.height);
  if (query.fit) params.fit = String(query.fit);
  if (query.quality) params.quality = Number(query.quality);
  if (query.withoutEnlargement === 'true') params.withoutEnlargement = true;
  return Object.keys(params).length ? { transformationParams: params } : undefined;
}

function resolveViewerAsset(name: string): string | null {
  const bundleDir = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(bundleDir, name),
    join(bundleDir, '..', name),
    join(process.cwd(), 'extensions/media-bundle/dist', name),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return readFileSync(candidate, 'utf8');
  }
  return null;
}

function resolveViewerDownloadJs(): string | null {
  return resolveViewerAsset('viewer-download.js');
}

function renderPage(shareId: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Shared File</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,400,0,0&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/media-share-validate/view/viewer-download.css" />
  <style>${PAGE_CSS}</style>
</head>
<body>
  <div id="app" data-share-id="${shareId}"><div class="spinner"></div></div>
  <script src="/media-share-validate/view/viewer-download.js"></script>
  <script src="/media-share-validate/view/app.js"></script>
</body>
</html>`;
}

export default defineEndpoint((router, { services, getSchema, database }) => {
  const { ItemsService, AssetsService, MailService } = services;

  async function getShareRecord(shareId: string, schema: any) {
    const itemsService = new ItemsService('media_share_link', {
      schema,
      accountability: { admin: true } as any,
    });

    let record: any;
    try {
      record = await itemsService.readOne(shareId);
    } catch {
      return null;
    }

    if (!record || record.status !== 'published') return null;

    if (record.expired_date) {
      const now = new Date();
      const expiry = new Date(record.expired_date);
      if (now > expiry) return 'expired';
    }

    return record;
  }

  async function getFileMeta(fileId: string, schema: any) {
    const filesService = new ItemsService('directus_files', {
      schema,
      accountability: { admin: true } as any,
    });
    try {
      const file = await filesService.readOne(fileId, {
        fields: [
          'type',
          'filename_download',
          'filename_disk',
          'title',
          'generated_filename',
          'filesize',
          'width',
          'height',
          'media_sizes_cm',
        ],
      });
      return {
        fileId,
        fileType: file?.type ?? null,
        filename: resolveDisplayFilename({
          id: fileId,
          type: file?.type ?? null,
          filename_download: file?.filename_download ?? null,
          filename_disk: file?.filename_disk ?? null,
          title: file?.title ?? null,
          generated_filename: file?.generated_filename ?? null,
        }),
        title: file?.title ?? null,
        generatedFilename: file?.generated_filename ?? null,
        filesize: file?.filesize ?? null,
        width: file?.width ?? null,
        height: file?.height ?? null,
        media_sizes_cm: file?.media_sizes_cm ?? null,
      };
    } catch {
      return {
        fileId,
        fileType: null,
        filename: null,
        filesize: null,
        width: null,
        height: null,
        media_sizes_cm: null,
      };
    }
  }

  async function buildSharePayload(record: any, schema: any) {
    return getFileMeta(record.file, schema);
  }

  // Send share link via email
  router.post('/notify', async (req, res) => {
    const { shareUrl, emails } = req.body as { shareUrl?: string; emails?: string[] };

    if (!shareUrl || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ error: 'shareUrl and emails[] are required' });
    }

    try {
      const schema = await getSchema();
      const mailer = new MailService({ schema, knex: database });

      await mailer.send({
        to: emails,
        subject: 'A file has been shared with you',
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fff;border-radius:8px;">
            <h2 style="font-size:20px;font-weight:600;color:#1a1a1a;margin:0 0 12px;">A file has been shared with you</h2>
            <p style="font-size:15px;color:#555;margin:0 0 24px;">Click the button below to access the shared file.</p>
            <a href="${shareUrl}" style="display:inline-block;padding:11px 24px;background:#6644FF;color:#fff;text-decoration:none;border-radius:6px;font-size:15px;font-weight:600;">View File</a>
            <p style="margin-top:24px;font-size:12px;color:#999;">Or copy this link:<br/><a href="${shareUrl}" style="color:#6644FF;">${shareUrl}</a></p>
          </div>
        `,
      });

      return res.json({ ok: true, sent: emails.length });
    } catch (err: any) {
      console.error('[media-share-validate] /notify error', err?.message ?? err);
      return res.status(500).json({ error: 'Failed to send email.' });
    }
  });

  router.get('/view/viewer-download.css', (_req, res) => {
    const css = resolveViewerAsset('viewer-download.css');
    if (!css) {
      return res.status(503).type('text/css').send('/* viewer-download.css not built */');
    }
    res.setHeader('Content-Type', 'text/css; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.send(css);
  });

  router.get('/view/viewer-download.js', (_req, res) => {
    const js = resolveViewerDownloadJs();
    if (!js) {
      return res.status(503).type('application/javascript').send('console.error("[share-viewer] viewer-download.js not built");');
    }
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.send(js);
  });

  // Shared client-side JS (served as external script to satisfy CSP 'self')
  router.get('/view/app.js', (_req, res) => {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.send(CLIENT_JS);
  });

  // Public viewer page — no Directus login required
  router.get('/view/:shareId', (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(renderPage(req.params.shareId));
  });

  // Pre-check: is password required?
  router.get('/:shareId', async (req, res) => {
    const { shareId } = req.params;
    const schema = await getSchema();
    const record = await getShareRecord(shareId, schema);

    if (!record) return res.status(404).json({ error: 'not_found' });
    if (record === 'expired') return res.status(403).json({ error: 'expired' });

    if (!record.password) {
      const payload = await buildSharePayload(record, schema);
      return res.status(200).json({ requiresPassword: false, ...payload });
    }

    return res.status(200).json({ requiresPassword: true });
  });

  // Password validation
  router.post('/:shareId', async (req, res) => {
    const { shareId } = req.params;
    const { password } = req.body;

    const schema = await getSchema();
    const record = await getShareRecord(shareId, schema);

    if (!record) return res.status(404).json({ error: 'not_found' });
    if (record === 'expired') return res.status(403).json({ error: 'expired' });

    if (password !== record.password) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return res.status(401).json({ error: 'wrong_password' });
    }

    const payload = await buildSharePayload(record, schema);
    return res.status(200).json(payload);
  });

  // Print download for shared files (no auth — validated by share link)
  router.post('/:shareId/print', async (req, res) => {
    const { shareId } = req.params;
    const schema = await getSchema();
    const record = await getShareRecord(shareId, schema);

    if (!record || record === 'expired') {
      return res.status(403).json({ error: 'forbidden' });
    }

    try {
      const widthCm = Number(req.body?.widthCm);
      const heightCm = Number(req.body?.heightCm);
      if (!Number.isFinite(widthCm) || !Number.isFinite(heightCm) || widthCm <= 0 || heightCm <= 0) {
        return res.status(400).json({ error: 'invalid_print_size' });
      }

      const assetsService = new AssetsService({
        schema,
        accountability: { admin: true } as any,
      });

      const { stream, file } = await assetsService.getAsset(record.file);
      const { buffer, filename } = await renderPrintJpeg(
        { stream: stream as Readable, file },
        widthCm,
        heightCm,
        record.file,
      );

      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Content-Disposition', `attachment; filename="${filename.replace(/"/g, '')}"`);
      res.setHeader('Content-Length', String(buffer.byteLength));
      return res.status(200).send(buffer);
    } catch (err: any) {
      if (err?.status === 400 || err?.message === 'not_raster_image') {
        return res.status(400).json({ error: 'not_raster_image' });
      }
      console.error('[media-share-validate] print failed:', err);
      return res.status(500).json({ error: 'print_failed', message: err?.message ?? 'Print failed' });
    }
  });

  // File proxy — supports full asset transform query params
  router.get('/:shareId/file', async (req, res) => {
    const { shareId } = req.params;
    const schema = await getSchema();
    const record = await getShareRecord(shareId, schema);

    if (!record || record === 'expired') {
      return res.status(403).json({ error: 'forbidden' });
    }

    try {
      const assetsService = new AssetsService({
        schema,
        accountability: { admin: true } as any,
      });

      const transformation = buildTransformationFromQuery(req.query as Record<string, unknown>);
      const format = req.query.format as string | undefined;

      const { stream, stat, file } = await assetsService.getAsset(record.file, transformation as any);

      const isDownload =
        req.query.download === 'true' ||
        req.query.download === '' ||
        req.query.download != null;
      const disposition = isDownload ? 'attachment' : 'inline';

      let filename = file.filename_download;
      if (format) {
        filename = file.filename_download.replace(/\.[^.]+$/, `.${format}`);
      }

      let contentType = file.type;
      if (format) {
        contentType = format === 'jpg' ? 'image/jpeg' : `image/${format}`;
      } else if (String(file.type ?? '').startsWith('video/')) {
        contentType = browserVideoContentType(file.type, filename);
      }

      const fileSize = stat?.size ?? 0;
      const range = parseByteRange(req.headers.range as string | undefined, fileSize);

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `${disposition}; filename="${filename}"`);
      res.setHeader('Accept-Ranges', 'bytes');

      if (range && fileSize > 0 && !transformation) {
        res.status(206);
        res.setHeader('Content-Range', `bytes ${range.start}-${range.end}/${fileSize}`);
        res.setHeader('Content-Length', String(range.chunkSize));
        await pipeStreamRange(stream as Readable, res, range.start, range.end);
        return;
      }

      if (!transformation && fileSize) res.setHeader('Content-Length', String(fileSize));

      stream.pipe(res);
    } catch {
      return res.status(404).json({ error: 'file_not_found' });
    }
  });
});
