'use strict';

const stats = {
  totalRequests: 0,
  totalErrors: 0,
  methods: { GET: 0, POST: 0, PATCH: 0, DELETE: 0, PUT: 0 },
  statusGroups: { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 },
  responseTimes: [],          // last 1000, for avg calculation
  recentTimestamps: [],       // all requests in last 5 min
  recentErrorTimestamps: [],  // 4xx+5xx in last 5 min
  recent5xxTimestamps: [],    // 5xx only, for DEGRADED status
  recentRequests: [],         // last 20 log entries
  lastRequestAt: null,
  lastErrorAt: null,
};

let requestsSinceCleanup = 0;

function maybeCleanup() {
  requestsSinceCleanup++;
  if (requestsSinceCleanup < 100) return;
  requestsSinceCleanup = 0;
  const cutoff = Date.now() - 5 * 60 * 1000;
  stats.recentTimestamps = stats.recentTimestamps.filter(t => t > cutoff);
  stats.recentErrorTimestamps = stats.recentErrorTimestamps.filter(t => t > cutoff);
  stats.recent5xxTimestamps = stats.recent5xxTimestamps.filter(t => t > cutoff);
}

function recordRequest({ method, path, statusCode, durationMs }) {
  const now = Date.now();

  stats.totalRequests++;

  const m = ['GET', 'POST', 'PATCH', 'DELETE', 'PUT'].includes(method) ? method : 'GET';
  stats.methods[m]++;

  if (statusCode >= 500) {
    stats.statusGroups['5xx']++;
    stats.totalErrors++;
    stats.lastErrorAt = new Date(now).toISOString();
    stats.recentErrorTimestamps.push(now);
    stats.recent5xxTimestamps.push(now);
  } else if (statusCode >= 400) {
    stats.statusGroups['4xx']++;
    stats.totalErrors++;
    stats.lastErrorAt = new Date(now).toISOString();
    stats.recentErrorTimestamps.push(now);
  } else if (statusCode >= 300) {
    stats.statusGroups['3xx']++;
  } else {
    stats.statusGroups['2xx']++;
  }

  stats.lastRequestAt = new Date(now).toISOString();
  stats.recentTimestamps.push(now);

  stats.responseTimes.push(durationMs);
  if (stats.responseTimes.length > 1000) stats.responseTimes.shift();

  stats.recentRequests.push({
    timestamp: new Date(now).toISOString(),
    method,
    path,
    statusCode,
    durationMs,
  });
  if (stats.recentRequests.length > 20) stats.recentRequests.shift();

  maybeCleanup();
}

module.exports = { stats, recordRequest };
