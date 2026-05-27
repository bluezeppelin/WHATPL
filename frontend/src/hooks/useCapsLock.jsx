import { useState, useCallback } from 'react';

// 비밀번호 입력창의 Caps Lock 상태 감지용 — KeyboardEvent.getModifierState 기반
export function useCapsLock() {
  const [on, setOn] = useState(false);
  const handler = useCallback((e) => {
    if (typeof e.getModifierState === 'function') {
      setOn(e.getModifierState('CapsLock'));
    }
  }, []);
  const reset = useCallback(() => setOn(false), []);
  return { on, handler, reset };
}

const warningStyle = {
  marginTop: '4px',
  fontSize: '12px',
  color: '#E8B341',
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  lineHeight: 1.4,
};

export function CapsLockWarning({ on }) {
  if (!on) return null;
  return (
    <p style={warningStyle}>
      <span aria-hidden="true">⚠</span> Caps Lock이 켜져 있습니다.
    </p>
  );
}
