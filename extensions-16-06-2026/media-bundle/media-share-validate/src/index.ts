import { defineEndpoint } from '@directus/extensions-sdk';

const CLIENT_JS = `
(function () {
  var app = document.getElementById('app');
  var SHARE_ID = app.dataset.shareId;
  var BASE = '/media-share-validate';

  function init() {
    fetch(BASE + '/' + SHARE_ID)
      .then(function (res) {
        return res.json().then(function (data) { return { status: res.status, data: data }; });
      })
      .then(function (r) {
        if (r.status === 404) return showError('not_found');
        if (r.status === 403) return showError('expired');
        if (!r.data.requiresPassword) {
          showViewer(r.data.fileId, r.data.fileType);
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
        if (r.data.fileId) showViewer(r.data.fileId, r.data.fileType);
      })
      .catch(function () {
        errEl.textContent = 'An unexpected error occurred.';
        errEl.style.display = 'block';
        btn.disabled = false;
        input.disabled = false;
        btn.innerHTML = '<span>View File</span>';
      });
  }

  function showViewer(fileId, fileType) {
    document.body.classList.add('viewer');
    var isImage = fileType && fileType.startsWith('image/');
    var isVideo = fileType && fileType.startsWith('video/');
    var fileUrl = BASE + '/' + SHARE_ID + '/file';

    var mediaHtml;
    if (isImage) {
      mediaHtml =
        '<div class="viewer-loading" id="img-loading"><div class="spinner"></div><p>Loading…</p></div>' +
        '<div class="viewer-error" id="img-error" style="display:none"><p>Failed to load image.</p></div>' +
        '<img id="viewer-img" src="' + fileUrl + '" alt="Shared file" style="display:none" />';
    } else if (isVideo) {
      mediaHtml =
        '<div class="viewer-loading" id="vid-loading"><div class="spinner"></div><p>Loading…</p></div>' +
        '<div class="viewer-error" id="vid-error" style="display:none"><p>Failed to load video.</p></div>' +
        '<video id="viewer-vid" controls preload="metadata" style="display:none">' +
          '<source src="' + fileUrl + '" type="' + fileType + '" />' +
        '</video>';
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
      ? '<div class="dl-group" id="dl-group">' +
          '<button class="btn btn-purple" id="dl-toggle">Download &#9662;</button>' +
          '<div class="dl-menu" id="dl-menu">' +
            '<button data-fmt="png">PNG</button>' +
            '<button data-fmt="jpg">JPG</button>' +
            '<button data-fmt="webp">WebP</button>' +
            '<button data-fmt="tiff">TIFF</button>' +
          '</div>' +
        '</div>'
      : '<button class="btn btn-purple" id="dl-btn">Download</button>';

    var actionsVisible = !isImage && !isVideo;
    app.innerHTML =
      '<div class="viewer-card">' +
        mediaHtml +
        '<div class="actions" id="actions" style="' + (actionsVisible ? '' : 'display:none') + '">' +
          downloadHtml +
          '<button class="btn btn-dark" id="edit-btn">Edit in Directus</button>' +
        '</div>' +
      '</div>';

    document.getElementById('edit-btn').addEventListener('click', function () {
      window.open('/admin/media-library/' + fileId, '_blank');
    });

    if (isImage) {
      var img = document.getElementById('viewer-img');
      img.onload = function () {
        document.getElementById('img-loading').style.display = 'none';
        img.style.display = 'block';
        document.getElementById('actions').style.display = 'flex';
      };
      img.onerror = function () {
        document.getElementById('img-loading').style.display = 'none';
        document.getElementById('img-error').style.display = 'block';
      };

      document.getElementById('dl-toggle').addEventListener('click', function (e) {
        e.stopPropagation();
        document.getElementById('dl-menu').classList.toggle('open');
      });
      document.getElementById('dl-menu').addEventListener('click', function (e) {
        var btn = e.target.closest('button[data-fmt]');
        if (btn) doDownload(btn.dataset.fmt);
      });
      document.addEventListener('click', function (e) {
        var group = document.getElementById('dl-group');
        if (group && !group.contains(e.target)) {
          document.getElementById('dl-menu').classList.remove('open');
        }
      });
    } else if (isVideo) {
      var vid = document.getElementById('viewer-vid');
      vid.onloadedmetadata = function () {
        document.getElementById('vid-loading').style.display = 'none';
        vid.style.display = 'block';
        document.getElementById('actions').style.display = 'flex';
      };
      vid.onerror = function () {
        document.getElementById('vid-loading').style.display = 'none';
        document.getElementById('vid-error').style.display = 'block';
      };
      document.getElementById('dl-btn').addEventListener('click', function () { doDownload(); });
    } else {
      document.getElementById('dl-btn').addEventListener('click', function () { doDownload(); });
    }
  }

  function doDownload(format) {
    var menu = document.getElementById('dl-menu');
    if (menu) menu.classList.remove('open');
    var params = new URLSearchParams({ download: 'true' });
    if (format) params.set('format', format);
    var a = document.createElement('a');
    a.href = BASE + '/' + SHARE_ID + '/file?' + params;
    a.setAttribute('download', '');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  init();
})();
`;

const PAGE_CSS = `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: sans-serif; background: #f5f5f5; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
.spinner { width: 36px; height: 36px; border: 3px solid rgba(102,68,221,0.2); border-top-color: #6644dd; border-radius: 50%; animation: spin 0.6s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.card { background: #fff; border-radius: 8px; box-shadow: 0 2px 12px rgba(0,0,0,.1); padding: 40px; width: 100%; max-width: 400px; }
.card h2 { font-size: 22px; font-weight: 600; color: #1a1a1a; margin-bottom: 8px; }
.card p.sub { font-size: 14px; color: #666; margin-bottom: 24px; }
.card input { width: 100%; padding: 10px 14px; font-size: 15px; border: 1px solid #ddd; border-radius: 6px; outline: none; transition: border-color .2s; }
.card input:focus { border-color: #6644dd; }
.card input:disabled { background: #f9f9f9; color: #aaa; }
.card button.primary { margin-top: 12px; width: 100%; padding: 11px; font-size: 15px; font-weight: 600; color: #fff; background: #6644dd; border: none; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: background .2s; }
.card button.primary:hover:not(:disabled) { background: #5533cc; }
.card button.primary:disabled { background: #aaa; cursor: not-allowed; }
.card .error { margin-top: 14px; font-size: 13px; color: #d32f2f; text-align: center; }
.btn-spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,.4); border-top-color: #fff; border-radius: 50%; animation: spin .6s linear infinite; display: inline-block; }
.error-card { background: #fff; border-radius: 8px; box-shadow: 0 2px 12px rgba(0,0,0,.1); padding: 48px 40px; width: 100%; max-width: 400px; text-align: center; }
.error-card .icon { font-size: 40px; color: #d32f2f; margin-bottom: 16px; }
.error-card h2 { font-size: 22px; font-weight: 600; color: #1a1a1a; margin-bottom: 12px; }
.error-card p { font-size: 15px; color: #555; line-height: 1.5; }
body.viewer { background: #1a1a1a; }
.viewer-card { display: flex; flex-direction: column; align-items: center; gap: 20px; padding: 24px; max-width: 90vw; }
.viewer-card img { max-width: 100%; max-height: 80vh; border-radius: 6px; object-fit: contain; box-shadow: 0 4px 24px rgba(0,0,0,.5); }
.actions { display: flex; gap: 12px; align-items: center; }
.btn { padding: 10px 22px; font-size: 14px; font-weight: 600; border: none; border-radius: 6px; cursor: pointer; transition: background .2s; color: #fff; }
.btn-purple { background: #6644dd; } .btn-purple:hover { background: #5533cc; }
.btn-dark { background: #333; } .btn-dark:hover { background: #444; }
.dl-group { position: relative; }
.dl-menu { position: absolute; bottom: calc(100% + 6px); left: 0; background: #fff; border: 1px solid #ddd; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,.15); overflow: hidden; min-width: 120px; z-index: 10; display: none; }
.dl-menu.open { display: block; }
.dl-menu button { display: block; width: 100%; padding: 9px 16px; font-size: 14px; font-weight: 500; color: #1a1a1a; background: none; border: none; text-align: left; cursor: pointer; }
.dl-menu button:hover { background: #f0ecff; color: #6644dd; }
.viewer-error { color: #f88; font-size: 14px; }
.viewer-loading { color: #ccc; font-size: 14px; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.viewer-loading .spinner { border-color: rgba(255,255,255,.2); border-top-color: #fff; }
#viewer-vid { max-width: 100%; max-height: 75vh; width: 860px; border-radius: 6px; box-shadow: 0 4px 24px rgba(0,0,0,.5); background: #000; }
.doc-card { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 40px 48px; background: #2a2a2a; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,.4); min-width: 260px; }
.doc-icon { width: 72px; height: 72px; color: #aaa; }
.doc-type { margin: 0; font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: .05em; }
`;

function renderPage(shareId: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Shared File</title>
  <style>${PAGE_CSS}</style>
</head>
<body>
  <div id="app" data-share-id="${shareId}"><div class="spinner"></div></div>
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

  async function getFileType(fileId: string, schema: any): Promise<string | null> {
    const filesService = new ItemsService('directus_files', {
      schema,
      accountability: { admin: true } as any,
    });
    try {
      const file = await filesService.readOne(fileId, { fields: ['type'] });
      return file?.type ?? null;
    } catch {
      return null;
    }
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
            <a href="${shareUrl}" style="display:inline-block;padding:11px 24px;background:#6644dd;color:#fff;text-decoration:none;border-radius:6px;font-size:15px;font-weight:600;">View File</a>
            <p style="margin-top:24px;font-size:12px;color:#999;">Or copy this link:<br/><a href="${shareUrl}" style="color:#6644dd;">${shareUrl}</a></p>
          </div>
        `,
      });

      return res.json({ ok: true, sent: emails.length });
    } catch (err: any) {
      console.error('[media-share-validate] /notify error', err?.message ?? err);
      return res.status(500).json({ error: 'Failed to send email.' });
    }
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
      const fileType = await getFileType(record.file, schema);
      return res.status(200).json({ requiresPassword: false, fileId: record.file, fileType });
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

    const fileType = await getFileType(record.file, schema);
    return res.status(200).json({ fileId: record.file, fileType });
  });

  // File proxy — supports ?download=true and ?format=png|jpg|webp|tiff
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

      const format = req.query.format as string | undefined;
      const transformation = format ? ({ transformationParams: { format } } as any) : undefined;

      const { stream, stat, file } = await assetsService.getAsset(record.file, transformation);

      const disposition = req.query.download === 'true' ? 'attachment' : 'inline';
      const ext = format ? `.${format}` : '';
      const filename = format
        ? file.filename_download.replace(/\.[^.]+$/, ext)
        : file.filename_download;

      res.setHeader('Content-Type', format ? `image/${format === 'jpg' ? 'jpeg' : format}` : file.type);
      res.setHeader('Content-Disposition', `${disposition}; filename="${filename}"`);
      if (!format && stat.size) res.setHeader('Content-Length', stat.size);

      stream.pipe(res);
    } catch {
      return res.status(404).json({ error: 'file_not_found' });
    }
  });
});
