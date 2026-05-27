'use strict';
const { recordRequest } = require('../lib/serverStats');

function statsMiddleware(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    // originalUrl에서 쿼리스트링 제거 (민감정보 포함 가능)
    const path = req.originalUrl.split('?')[0];
    // 너무 긴 경로 잘라내기
    const safePath = path.length > 200 ? path.slice(0, 200) : path;
    recordRequest({
      method: req.method,
      path: safePath,
      statusCode: res.statusCode,
      durationMs: Date.now() - start,
    });
  });
  next();
}

module.exports = statsMiddleware;
