const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const UPLOADS_DIR = path.join(__dirname, '../uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

function getBaseUrl(req) {
  if (!req) return 'http://195.35.20.150:8000';
  const protocol = req.secure || req.headers?.['x-forwarded-proto'] === 'https' ? 'https' : 'http';
  const host = (req.get ? req.get('host') : (req.headers?.host)) || '195.35.20.150:8000';
  return `${protocol}://${host}`;
}

function saveBase64Media(rawStr, req = null, prefix = 'doc') {
  if (!rawStr || typeof rawStr !== 'string') return null;
  const trimmed = rawStr.trim();
  if (!trimmed) return null;

  if (trimmed.includes('/uploads/')) {
    const parts = trimmed.split('/uploads/');
    const baseUrl = getBaseUrl(req);
    return `${baseUrl}/uploads/${parts[1]}`;
  }

  if (trimmed.startsWith('data:') || trimmed.includes(';base64,') || trimmed.startsWith('JVBERi0') || trimmed.startsWith('JVBERi')) {
    try {
      let ext = 'pdf';
      let rawData = trimmed;
      const matches = trimmed.match(/^data:([A-Za-z0-9-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const mime = matches[1].toLowerCase();
        if (mime.includes('pdf')) ext = 'pdf';
        else if (mime.includes('png')) ext = 'png';
        else if (mime.includes('jpeg') || mime.includes('jpg')) ext = 'jpg';
        else if (mime.includes('webp')) ext = 'webp';
        else if (mime.includes('mp4')) ext = 'mp4';
        else if (mime.includes('quicktime') || mime.includes('mov')) ext = 'mov';
        else if (mime.includes('word') || mime.includes('doc')) ext = 'docx';
        rawData = matches[2];
      } else if (trimmed.startsWith('JVBERi')) {
        ext = 'pdf';
        rawData = trimmed;
      }
      const buffer = Buffer.from(rawData, 'base64');
      const filename = `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}.${ext}`;
      fs.writeFileSync(path.join(UPLOADS_DIR, filename), buffer);
      return `${getBaseUrl(req)}/uploads/${filename}`;
    } catch (err) {
      console.error('saveBase64Media error:', err.message);
      return trimmed;
    }
  }

  return trimmed;
}

// Download remote temporary file (e.g. from tmpfiles.org) and save permanently to server
async function ensurePermanentDocUrl(urlStr, req = null, prefix = 'doc') {
  if (!urlStr || typeof urlStr !== 'string') return urlStr;
  const clean = urlStr.trim();
  if (!clean) return clean;

  // If Base64
  if (clean.startsWith('data:') || clean.includes(';base64,')) {
    return saveBase64Media(clean, req, prefix);
  }

  // If local uploads path
  if (clean.includes('/uploads/')) {
    const parts = clean.split('/uploads/');
    return `${getBaseUrl(req)}/uploads/${parts[1]}`;
  }

  if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
    return clean;
  }

  // Check if it's a temporary file host (e.g., tmpfiles.org)
  const isTemporaryHost = clean.includes('tmpfiles.org') || clean.includes('temp-file') || clean.includes('tmpfile');
  if (!isTemporaryHost) {
    return clean;
  }

  try {
    let downloadUrl = clean;
    // tmpfiles.org direct link format requires /dl/
    if (clean.includes('tmpfiles.org/') && !clean.includes('tmpfiles.org/dl/')) {
      downloadUrl = clean.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
    }

    let parsedExt = 'pdf';
    try {
      const u = new URL(downloadUrl);
      const extMatch = path.extname(u.pathname);
      if (extMatch && extMatch.length > 1) {
        parsedExt = extMatch.replace('.', '').toLowerCase();
      }
    } catch (e) {}

    const filename = `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}.${parsedExt}`;
    const targetPath = path.join(UPLOADS_DIR, filename);

    const buffer = await new Promise((resolve, reject) => {
      const client = downloadUrl.startsWith('https') ? https : http;
      const request = client.get(downloadUrl, (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          const redirectUrl = response.headers.location.startsWith('http') 
            ? response.headers.location 
            : new URL(response.headers.location, downloadUrl).toString();
          const redirClient = redirectUrl.startsWith('https') ? https : http;
          redirClient.get(redirectUrl, (redirRes) => {
            if (redirRes.statusCode !== 200) {
              return reject(new Error(`Failed to download redirect: status ${redirRes.statusCode}`));
            }
            const chunks = [];
            redirRes.on('data', chunk => chunks.push(chunk));
            redirRes.on('end', () => resolve(Buffer.concat(chunks)));
          }).on('error', reject);
          return;
        }

        if (response.statusCode !== 200) {
          return reject(new Error(`Failed to download: status ${response.statusCode}`));
        }
        const chunks = [];
        response.on('data', chunk => chunks.push(chunk));
        response.on('end', () => resolve(Buffer.concat(chunks)));
      });
      request.on('error', reject);
      request.setTimeout(12000, () => {
        request.destroy();
        reject(new Error('Download timeout'));
      });
    });

    if (buffer && buffer.length > 0) {
      fs.writeFileSync(targetPath, buffer);
      const permanentUrl = `${getBaseUrl(req)}/uploads/${filename}`;
      return permanentUrl;
    }
  } catch (err) {
    console.warn(`Could not cache temporary file (${clean}):`, err.message);
  }

  return clean;
}

// Synchronous wrapper to avoid breaking sync flows, starts download in background if async
function normalizeDocSync(rawVal, req = null, prefix = 'doc') {
  if (!rawVal || typeof rawVal !== 'string') return rawVal;
  const clean = rawVal.trim();
  if (clean.startsWith('data:') || clean.includes(';base64,')) {
    return saveBase64Media(clean, req, prefix);
  }
  if (clean.includes('/uploads/')) {
    const parts = clean.split('/uploads/');
    return `${getBaseUrl(req)}/uploads/${parts[1]}`;
  }
  // If tmpfiles, trigger cache
  if (clean.includes('tmpfiles.org')) {
    ensurePermanentDocUrl(clean, req, prefix).catch(() => {});
  }
  return clean;
}

module.exports = {
  UPLOADS_DIR,
  getBaseUrl,
  saveBase64Media,
  ensurePermanentDocUrl,
  normalizeDocSync
};
