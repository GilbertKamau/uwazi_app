// Evidence file storage (Supabase Storage).
//
// Uses the service key, which bypasses row-level security - it must only ever
// live in the server environment. If it is not configured, uploads are
// reported as unavailable instead of silently pretending to succeed.

const { createClient } = require('@supabase/supabase-js');
const config = require('../config/env');

const BUCKET = config.evidenceBucket;

let client = null;
if (config.supabaseUrl && config.supabaseServiceKey) {
  client = createClient(config.supabaseUrl, config.supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
} else {
  // eslint-disable-next-line no-console
  console.warn('[storage] SUPABASE_SERVICE_KEY not set - evidence uploads are disabled.');
}

const isEnabled = () => client !== null;

// Prefix every public URL of an evidence object starts with.
const publicPrefix = () =>
  config.supabaseUrl ? `${config.supabaseUrl}/storage/v1/object/public/${BUCKET}/` : null;

// True only for URLs that point at our own evidence bucket. Used to stop clients
// attaching arbitrary third-party URLs (tracking pixels, phishing links) as
// "evidence" that the site would then render.
const isOwnStorageUrl = (url) => {
  const prefix = publicPrefix();
  return typeof url === 'string' && prefix !== null && url.startsWith(prefix);
};

const safeName = (name) =>
  String(name || 'file')
    .replace(/[\\/]+/g, '_')
    .replace(/\s+/g, '_')
    .replace(/[^\w.\-]+/g, '_')
    .slice(-120);

// Uploads multer memory files. Returns { urls, failed } where `failed` lists the
// original names that could not be stored.
async function uploadFiles(files) {
  const urls = [];
  const failed = [];
  if (!files || files.length === 0) return { urls, failed };
  if (!client) return { urls, failed: files.map((f) => f.originalname) };

  const stamp = Date.now();
  for (const [i, file] of files.entries()) {
    const objectPath = `evidence/${stamp}-${i}-${safeName(file.originalname)}`;
    const { error } = await client.storage.from(BUCKET).upload(objectPath, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });
    if (error) {
      // eslint-disable-next-line no-console
      console.error('[storage] upload failed:', error.message);
      failed.push(file.originalname);
      continue;
    }
    const { data } = client.storage.from(BUCKET).getPublicUrl(objectPath);
    urls.push(data.publicUrl);
  }
  return { urls, failed };
}

// Best-effort removal of objects given their public URLs.
async function removeByUrls(urls) {
  const prefix = publicPrefix();
  if (!client || !prefix) return;
  const paths = (urls || []).filter(isOwnStorageUrl).map((u) => decodeURIComponent(u.slice(prefix.length)));
  if (paths.length === 0) return;
  const { error } = await client.storage.from(BUCKET).remove(paths);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[storage] cleanup failed:', error.message);
  }
}

module.exports = { isEnabled, isOwnStorageUrl, uploadFiles, removeByUrls, BUCKET };
