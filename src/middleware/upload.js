// Multipart evidence upload (multer, in-memory - nothing touches disk on
// Railway). Filters by declared MIME type, then verifies the real file
// signature so a renamed executable can't pass as an image.

const multer = require('multer');

const MAX_FILES = 10;
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB each

const ALLOWED = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

// Leading bytes (offset, hex) that each allowed type must start with.
const SIGNATURES = {
  'image/jpeg': [[0, 'ffd8ff']],
  'image/png': [[0, '89504e470d0a1a0a']],
  'image/gif': [[0, '474946383761'], [0, '474946383961']],
  'image/webp': [[0, '52494646']], // + "WEBP" at offset 8, checked below
  'video/mp4': [[4, '66747970']], // "ftyp"
  'video/quicktime': [[4, '66747970']],
  'video/webm': [[0, '1a45dfa3']],
  'application/pdf': [[0, '25504446']], // "%PDF"
  'application/msword': [[0, 'd0cf11e0a1b11ae1']],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [[0, '504b0304']],
};

const hasSignature = (file) => {
  const sigs = SIGNATURES[file.mimetype];
  if (!sigs) return false;
  const buf = file.buffer;
  const ok = sigs.some(([offset, hex]) => {
    const want = Buffer.from(hex, 'hex');
    return buf.length >= offset + want.length && buf.subarray(offset, offset + want.length).equals(want);
  });
  if (ok && file.mimetype === 'image/webp') {
    return buf.length >= 12 && buf.subarray(8, 12).toString('ascii') === 'WEBP';
  }
  return ok;
};

const uploader = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: MAX_FILES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED.has(file.mimetype)) return cb(null, true);
    const err = new Error(`File type ${file.mimetype} is not supported`);
    err.status = 400;
    return cb(err, false);
  },
});

// Route middleware: accepts `evidence` files, then rejects any whose bytes do
// not match their declared type.
const uploadEvidence = [
  uploader.array('evidence', MAX_FILES),
  (req, res, next) => {
    const bad = (req.files || []).find((f) => !hasSignature(f));
    if (bad) {
      return res
        .status(400)
        .json({ error: `${bad.originalname} does not look like a valid ${bad.mimetype} file` });
    }
    return next();
  },
];

// multer reports size / count problems as MulterError; turn them into 4xx.
// eslint-disable-next-line no-unused-vars
const uploadErrorHandler = (err, _req, res, next) => {
  if (err instanceof multer.MulterError) {
    const tooBig = err.code === 'LIMIT_FILE_SIZE';
    return res.status(tooBig ? 413 : 400).json({
      error: tooBig ? `Each file must be under ${MAX_BYTES / 1024 / 1024} MB` : `Upload error: ${err.message}`,
    });
  }
  return next(err);
};

module.exports = { uploadEvidence, uploadErrorHandler, MAX_FILES, MAX_BYTES };
