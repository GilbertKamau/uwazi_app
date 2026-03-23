// Metrics Controller
// Aggregates integrity signals for admin-only metrics views.
// Logic mirrors signals/aggregation.py - group-only aggregation, never on individuals.

const fs = require('fs').promises;
const path = require('path');

const DATA_PATH = path.join(__dirname, '../../data/signals.json');
const TREND_DELTA = 0.1;
const BASELINE_WINDOWS = 7;
const ALLOWED_SOURCES = ['form', 'api', 'import'];
const MAX_NOTE_LENGTH = 280;
const MAX_EVENT_ID_LENGTH = 64;
const MAX_DAYS_PAST = 365;
const MAX_MINUTES_FUTURE = 10;
const crypto = require('crypto');

const SIGNAL_TYPES = [
  { key: 'suspicious_timing_pattern', description: 'Submissions clustered in unlikely time windows.' },
  { key: 'repeated_unusual_submissions', description: 'Multiple unusual submissions within a short period.' },
  { key: 'sudden_score_spikes', description: 'Abrupt increases in scores beyond typical variance.' },
  { key: 'multiple_submissions_same_device', description: 'High volume of submissions from a single device.' },
];

function parseIso8601(timestamp) {
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) throw new Error('Invalid timestamp');
  return date;
}

function windowKey(timestamp, window) {
  const d = new Date(timestamp);
  if (window === 'day') return d.toISOString().slice(0, 10);
  if (window === 'week') {
    const day = d.getUTCDay();
    const weekStart = new Date(d);
    weekStart.setUTCDate(d.getUTCDate() - (day === 0 ? 6 : day - 1));
    return weekStart.toISOString().slice(0, 10);
  }
  throw new Error("Window must be 'day' or 'week'");
}

function computeTrend(count, baseline) {
  if (baseline <= 0) return count > 0 ? 'up' : 'steady';
  if (count > baseline * (1 + TREND_DELTA)) return 'up';
  if (count < baseline * (1 - TREND_DELTA)) return 'down';
  return 'steady';
}

function evaluateNormality(count, baseline, threshold = 2.0, minCountForReview = 3) {
  if (baseline <= 0) return count >= minCountForReview ? 'Needs Review' : 'Normal';
  return count > baseline * threshold ? 'Needs Review' : 'Normal';
}

function aggregateSignals(signals, window = 'day') {
  const counts = {};
  const windows = new Set();
  const types = new Set();

  for (const record of signals) {
    const signalType = record.type;
    const timestampRaw = record.timestamp;
    if (!signalType || !timestampRaw) continue;
    try {
      const ts = parseIso8601(timestampRaw);
      const wk = windowKey(ts, window);
      const key = `${wk}|${signalType}`;
      counts[key] = (counts[key] || 0) + 1;
      windows.add(wk);
      types.add(signalType);
    } catch {
      continue;
    }
  }

  const sortedWindows = [...windows].sort();
  const sortedTypes = [...types].sort();
  const results = [];

  for (const signalType of sortedTypes) {
    const series = sortedWindows.map((wk) => [wk, counts[`${wk}|${signalType}`] || 0]);
    for (let i = 0; i < series.length; i++) {
      const [windowKeyVal, count] = series[i];
      const history = series.slice(Math.max(0, i - BASELINE_WINDOWS), i).map(([, v]) => v);
      const baseline = history.length ? history.reduce((a, b) => a + b, 0) / history.length : 0;
      const trend = computeTrend(count, baseline);
      const status = evaluateNormality(count, baseline);
      results.push({
        window: windowKeyVal,
        type: signalType,
        count,
        baseline: Math.round(baseline * 100) / 100,
        trend,
        status,
      });
    }
  }

  return results;
}

// GET /api/metrics/signal-types - List allowed signal types (admin only)
const getSignalTypes = async (req, res) => {
  try {
    res.status(200).json(
      SIGNAL_TYPES.map((st) => ({ key: st.key, description: st.description }))
    );
  } catch (error) {
    console.error('Error fetching signal types:', error);
    res.status(500).json({ error: 'Failed to fetch signal types' });
  }
};

// GET /api/metrics/stats - Aggregated stats by window (admin only)
const getStats = async (req, res) => {
  try {
    const window = (req.query.window || 'day').toLowerCase();
    if (window !== 'day' && window !== 'week') {
      return res.status(400).json({ error: "window must be 'day' or 'week'" });
    }

    let signals = [];
    try {
      const raw = await fs.readFile(DATA_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return res.status(500).json({ error: 'Signals file must contain a JSON array' });
      }
      signals = parsed;
    } catch (err) {
      if (err.code === 'ENOENT') {
        return res.status(200).json([]);
      }
      throw err;
    }

    const stats = aggregateSignals(signals, window);
    res.status(200).json(stats);
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
};

// POST /api/signals - Submit a new integrity signal (Public)
const submitSignal = async (req, res) => {
  try {
    const payload = req.body;
    const errors = [];

    // Basic Validation
    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ error: 'Payload must be a JSON object.' });
    }

    const signalType = payload.type;
    const allowedKeys = SIGNAL_TYPES.map((st) => st.key);
    if (!signalType || typeof signalType !== 'string') {
      errors.push('Signal type is required.');
    } else if (!allowedKeys.includes(signalType)) {
      errors.push(`Signal type '${signalType}' is not allowed.`);
    }

    const timestampRaw = payload.timestamp || new Date().toISOString();
    let timestamp;
    try {
      timestamp = new Date(timestampRaw);
      if (isNaN(timestamp.getTime())) throw new Error();
      
      const now = new Date();
      const pastBound = new Date();
      pastBound.setDate(now.getDate() - MAX_DAYS_PAST);
      const futureBound = new Date();
      futureBound.setMinutes(now.getMinutes() + MAX_MINUTES_FUTURE);

      if (timestamp < pastBound) errors.push('Timestamp is too far in the past.');
      if (timestamp > futureBound) errors.push('Timestamp is too far in the future.');
    } catch {
      errors.push('Timestamp must be valid ISO-8601.');
    }

    const { context, source, version } = payload;
    if (context && typeof context !== 'object') {
      errors.push('Context must be an object when provided.');
    } else if (context) {
      if (context.note && (typeof context.note !== 'string' || context.note.length > MAX_NOTE_LENGTH)) {
        errors.push(`Context note must be a string up to ${MAX_NOTE_LENGTH} characters.`);
      }
      if (context.eventId && (typeof context.eventId !== 'string' || context.eventId.length > MAX_EVENT_ID_LENGTH)) {
        errors.push(`Context eventId must be a string up to ${MAX_EVENT_ID_LENGTH} characters.`);
      }
    }

    if (source && (!typeof source === 'string' || !ALLOWED_SOURCES.includes(source))) {
      errors.push('Source is not allowed.');
    }

    if (version !== undefined && (!Number.isInteger(version) || version < 1)) {
      errors.push('Version must be an integer >= 1.');
    }

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    // Normalization
    const normalized = {
      signalId: payload.signalId || crypto.randomUUID(),
      type: signalType,
      timestamp: timestamp.toISOString().replace(/\.\d{3}/, ''), // Matching Python's microsecond=0
      context: context || {},
      source: source || 'api',
      version: version || 1,
    };

    // Storage
    let signals = [];
    const dir = path.dirname(DATA_PATH);
    try {
      await fs.mkdir(dir, { recursive: true });
      const raw = await fs.readFile(DATA_PATH, 'utf-8');
      signals = JSON.parse(raw);
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
    
    signals.push(normalized);
    await fs.writeFile(DATA_PATH, JSON.stringify(signals, null, 2), 'utf-8');

    res.status(201).json({ ok: true, signal: normalized });
  } catch (error) {
    console.error('Error submitting signal:', error);
    res.status(500).json({ error: 'Failed to submit signal', details: error.message });
  }
};

module.exports = {
  getSignalTypes,
  getStats,
  submitSignal,
};
