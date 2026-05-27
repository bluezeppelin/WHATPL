import { useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './InfoPage.module.css';

const FAQS = [
  {
    category: '계정',
    items: [
      {
        q: '아이디를 잊어버렸어요.',
        a: '로그인 화면의 아이디 찾기 기능을 이용해 가입 정보를 확인할 수 있습니다.',
      },
      {
        q: '비밀번호를 잊어버렸어요.',
        a: '비밀번호 재설정 기능을 통해 새 비밀번호로 변경할 수 있습니다.',
      },
      {
        q: '회원 정보를 변경하고 싶어요.',
        a: '로그인 후 마이페이지에서 이름, 이메일, 생년월일, 휴대폰 번호, 프로필 이미지, 좋아하는 장르를 수정할 수 있습니다.',
      },
    ],
  },
  {
    category: 'Creator',
    items: [
      {
        q: 'Creator는 어떻게 신청하나요?',
        a: '마이페이지에서 Creator 전환을 신청할 수 있으며, 관리자 승인 후 Creator 기능을 이용할 수 있습니다.',
      },
      {
        q: 'Creator가 되면 무엇을 할 수 있나요?',
        a: '자신의 음악을 업로드하고 관리할 수 있습니다.',
      },
      {
        q: 'Creator 신청 결과는 어떻게 확인하나요?',
        a: '관리자가 신청을 처리하면 서비스 내 알림으로 결과를 안내합니다. 마이페이지에서도 신청 현황을 확인할 수 있습니다.',
      },
    ],
  },
  {
    category: '음악 이용',
    items: [
      {
        q: '음악을 플레이리스트에 추가할 수 있나요?',
        a: '원하는 트랙을 선택해 나만의 플레이리스트에 추가할 수 있습니다.',
      },
      {
        q: '좋아요한 음악은 어디서 확인하나요?',
        a: '마이페이지 또는 홈 화면에서 좋아요한 트랙을 확인할 수 있습니다.',
      },
      {
        q: '기본 플레이리스트는 삭제할 수 없나요?',
        a: '기본 플레이리스트는 삭제할 수 없습니다. 이름 변경은 가능하며, 직접 만든 플레이리스트는 자유롭게 삭제할 수 있습니다.',
      },
    ],
  },
  {
    category: '계정 및 콘텐츠 관리',
    items: [
      {
        q: '부적절한 콘텐츠는 어떻게 처리되나요?',
        a: '관리자가 서비스 운영 기준에 따라 콘텐츠를 제한하거나 삭제할 수 있습니다.',
      },
      {
        q: '계정이 제한될 수 있나요?',
        a: '서비스 이용 기준을 위반한 경우 관리자가 계정을 제한할 수 있습니다.',
      },
      {
        q: '내가 업로드한 트랙을 삭제하고 싶어요.',
        a: '마이페이지 → 내 트랙에서 삭제 요청을 할 수 있습니다. 관리자 검토 후 처리되며, 결과는 알림으로 안내됩니다.',
      },
    ],
  },
];

export default function Support() {
  const [openIdx, setOpenIdx] = useState({});

  function toggle(catI, itemI) {
    const key = `${catI}-${itemI}`;
    setOpenIdx(prev => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>고객센터</h1>
          <p className={styles.subtitle}>WHATPL 이용 중 자주 묻는 질문을 확인할 수 있습니다.</p>
        </header>

        {FAQS.map((cat, catI) => (
          <section key={cat.category} className={styles.section}>
            <h2 className={styles.sectionTitle}>{cat.category} 관련</h2>
            <div className={styles.faqList}>
              {cat.items.map((item, itemI) => {
                const key = `${catI}-${itemI}`;
                const isOpen = !!openIdx[key];
                return (
                  <div key={itemI} className={styles.faqItem}>
                    <button
                      className={styles.faqQ}
                      onClick={() => toggle(catI, itemI)}
                      aria-expanded={isOpen}
                    >
                      <span className={styles.faqQLabel}>Q</span>
                      <span className={styles.faqQText}>{item.q}</span>
                      <span className={`${styles.faqArrow} ${isOpen ? styles.faqArrowOpen : ''}`}>▾</span>
                    </button>
                    {isOpen && (
                      <div className={styles.faqA}>
                        <span className={styles.faqALabel}>A</span>
                        <span className={styles.faqAText}>{item.a}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        <div className={styles.related}>
          <Link to="/terms" className={styles.relatedLink}>이용약관</Link>
          <Link to="/privacy" className={styles.relatedLink}>개인정보처리방침</Link>
        </div>
      </div>
    </div>
  );
}
