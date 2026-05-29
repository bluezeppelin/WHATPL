/**
 * coverUrl에서 대표 색상 [r, g, b]를 추출합니다.
 * 내부적으로 canvas를 사용하므로, 외부 이미지(S3/CloudFront)에서 호출 시
 * 해당 버킷에 CORS 정책이 필요합니다.
 *
 * S3 버킷 CORS 예시:
 * [{ "AllowedOrigins": ["https://프론트도메인", "http://localhost:5173"],
 *    "AllowedMethods": ["GET"], "AllowedHeaders": ["*"] }]
 *
 * 동작 순서:
 *   1) S3/CloudFront에서 직접 추출 (버킷 CORS 설정 시 가장 빠름)
 *   2) 실패하면 백엔드 동일 출처 프록시(/api/image-proxy)로 폴백
 *      → S3 CORS가 없어도 색 추출이 동작함
 *
 * 두 경로 모두 실패하면 null을 반환하며, PlayerBar는 기본 배경으로 fallback합니다.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

// 주어진 이미지 src를 로드해 대표 색 [r, g, b]를 반환. 실패 시 null.
function loadAndExtract(src) {
  return new Promise((resolve) => {
    const img = new Image();
    // crossOrigin 설정 없이 canvas에 drawImage하면 tainted canvas 오류 발생
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const SIZE = 12;
        const canvas = document.createElement('canvas');
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, SIZE, SIZE);
        const data = ctx.getImageData(0, 0, SIZE, SIZE).data;

        let r = 0, g = 0, b = 0, count = 0;
        for (let i = 0; i < data.length; i += 4) {
          const alpha = data[i + 3];
          if (alpha < 10) continue; // 투명 픽셀 제외
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          count++;
        }
        if (count === 0) { resolve(null); return; }
        let ar = r / count, ag = g / count, ab = b / count;
        // 채도 부스트: 평균값에서 멀어지는 방향으로 각 채널을 증폭
        const mean = (ar + ag + ab) / 3;
        const BOOST = 1.8;
        ar = Math.min(255, Math.max(0, mean + (ar - mean) * BOOST));
        ag = Math.min(255, Math.max(0, mean + (ag - mean) * BOOST));
        ab = Math.min(255, Math.max(0, mean + (ab - mean) * BOOST));
        resolve([Math.round(ar), Math.round(ag), Math.round(ab)]);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export async function extractCoverColor(coverUrl) {
  if (!coverUrl || coverUrl.startsWith('data:')) return null;

  // 1차: S3/CloudFront 직접 추출.
  // 캐시 분리용 쿼리 파라미터 — 일반 <img>가 crossorigin 없이 먼저 캐싱한
  // 응답을 재사용하면 canvas가 tainted 되어 실패함. URL을 다르게 만들어
  // CORS 헤더가 포함된 응답을 별도 캐시 엔트리에 저장하도록 강제.
  const corsUrl = coverUrl + (coverUrl.includes('?') ? '&' : '?') + '_cors=1';
  const direct = await loadAndExtract(corsUrl);
  if (direct) return direct;

  // 2차 폴백: 백엔드 프록시(동일 출처)를 통해 추출.
  // S3 버킷에 CORS가 없을 때도 동작. 프록시는 우리 버킷 객체만 허용함.
  const proxyUrl = `${API_BASE}/api/image-proxy?url=${encodeURIComponent(coverUrl)}`;
  return loadAndExtract(proxyUrl);
}
