const express = require('express');
const router = express.Router();
const { getObjectByUrl } = require('../lib/s3');

// 앨범 커버 색 추출용 "동일 출처" 이미지 프록시.
//
// PlayerBar는 현재 곡 커버에서 대표 색을 뽑아 바 색을 바꾼다. 이때 canvas로
// 픽셀을 읽으려면 이미지가 동일 출처이거나, S3가 CORS 헤더(Access-Control-
// Allow-Origin)를 줘야 한다. S3 버킷에 CORS가 설정돼 있으면 프론트는 S3에서
// 직접 추출하고, 실패하면 이 엔드포인트로 폴백한다.
//
// SSRF 방지: getObjectByUrl이 우리 버킷/배포 도메인의 객체만 허용한다.
router.get('/', async (req, res) => {
  const { url } = req.query;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'url 쿼리 파라미터가 필요합니다.' });
  }

  try {
    const obj = await getObjectByUrl(url);
    if (!obj) {
      return res.status(403).json({ error: '허용되지 않은 이미지 URL입니다.' });
    }
    res.set('Content-Type', obj.contentType || 'application/octet-stream');
    res.set('Cache-Control', 'public, max-age=86400');
    obj.body.on('error', () => { if (!res.headersSent) res.status(502).end(); });
    obj.body.pipe(res);
  } catch (err) {
    res.status(502).json({ error: '이미지를 가져오지 못했습니다.' });
  }
});

module.exports = router;
