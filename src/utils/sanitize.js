// Text hygiene helpers. React escapes output, but we still strip control
// characters and normalise whitespace before persisting so stored data stays
// clean for non-browser consumers (exports, admin tools, logs).

// Strip C0/C1 control characters, keeping tab (09), newline (0A), CR (0D).
function cleanText(value) {
  if (typeof value !== 'string') return value;
  let out = '';
  for (const ch of value) {
    const code = ch.codePointAt(0);
    const isControl =
      (code <= 0x1f && code !== 0x09 && code !== 0x0a && code !== 0x0d) ||
      (code >= 0x7f && code <= 0x9f);
    if (!isControl) out += ch;
  }
  return out.trim();
}

function isSafeHttpUrl(value) {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

module.exports = { cleanText, isSafeHttpUrl };
