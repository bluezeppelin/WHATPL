import { Link } from 'react-router-dom';
import styles from './InfoPage.module.css';

export default function Terms() {
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>이용약관</h1>
          <p className={styles.subtitle}>최종 업데이트: 2026년 1월</p>
        </header>

        <div className={styles.notice}>
          본 약관은 WHATPL 서비스 이용에 관한 기본 안내입니다. 회원가입 시 본 약관에 동의한 것으로
          간주됩니다.
        </div>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>제1조 서비스 소개</h2>
          <p className={styles.body}>
            WHATPL은 사용자가 음악을 감상하고, Creator로 전환하여 직접 제작한 트랙을 업로드하며,
            나만의 플레이리스트로 음악을 관리할 수 있는 음악 커뮤니티 서비스입니다. 일반 회원은
            음악 감상, 플레이리스트 관리, 좋아요, 크리에이터 팔로우 등의 기능을 이용할 수 있으며,
            Creator 회원은 이에 더해 트랙 업로드 및 관리 기능을 이용할 수 있습니다.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>제2조 회원 가입 및 계정 관리</h2>
          <ul className={styles.list}>
            <li>
              회원가입은 아이디, 비밀번호, 이메일, 이름, 생년월일, 휴대폰 번호를 입력하여 진행합니다.
              프로필 이미지, 좋아하는 장르, 크리에이터명은 선택 사항입니다.
            </li>
            <li>
              회원은 자신의 계정 정보를 안전하게 관리할 책임이 있으며, 비밀번호 변경 시
              현재 비밀번호 확인이 필요합니다.
            </li>
            <li>
              하나의 이메일 주소로 하나의 계정만 가입할 수 있습니다.
            </li>
            <li>
              아이디 찾기와 비밀번호 재설정은 가입 시 등록한 이름 또는 아이디와 이메일 주소를
              통해 처리할 수 있습니다.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>제3조 Creator 회원</h2>
          <ul className={styles.list}>
            <li>
              일반 회원은 마이페이지에서 Creator 전환 신청을 할 수 있으며, 관리자 검토 후
              승인 또는 거절 처리됩니다.
            </li>
            <li>
              Creator 회원은 본인이 직접 제작했거나 사용 권한이 있는 음원만 업로드해야 합니다.
            </li>
            <li>
              타인의 저작권을 침해하는 음원, 이미지, 설명은 업로드할 수 없습니다.
            </li>
            <li>
              Creator 회원은 업로드한 트랙의 삭제를 관리자에게 요청할 수 있으며,
              관리자 검토 후 처리됩니다.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>제4조 콘텐츠 정책</h2>
          <ul className={styles.list}>
            <li>
              부적절한 제목, 설명, 이미지, 음원 또는 타인을 불쾌하게 하는 콘텐츠를
              업로드할 수 없습니다.
            </li>
            <li>
              다른 회원의 계정, 음원, 플레이리스트 기능을 악용하거나 서비스 운영을
              방해해서는 안 됩니다.
            </li>
            <li>
              서비스 내 재생, 좋아요, 팔로우 등의 기능을 비정상적인 방법으로 조작하는 행위를
              금지합니다.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>제5조 서비스 운영 및 제한</h2>
          <ul className={styles.list}>
            <li>
              관리자는 운영 정책에 따라 부적절한 음원을 삭제 처리하거나 계정을 비활성화할 수
              있습니다.
            </li>
            <li>
              관리자가 트랙을 삭제하거나 계정을 제한하는 경우, 해당 Creator 또는 회원에게
              알림으로 안내합니다.
            </li>
            <li>
              WHATPL은 안정적인 서비스 운영을 위해 필요한 경우 콘텐츠 노출, 계정 상태,
              업로드 권한을 제한할 수 있습니다.
            </li>
            <li>
              Creator 신청, 음원 삭제 요청, 계정 관리 등은 관리자 검토를 거쳐 처리될 수
              있습니다.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>제6조 서비스 변경 및 중단</h2>
          <p className={styles.body}>
            WHATPL은 서비스 개선을 위해 기능을 변경하거나 일시적으로 중단할 수 있습니다.
            중요한 변경 사항이 있는 경우 서비스 내 공지 또는 알림을 통해 안내합니다.
          </p>
        </section>

        <div className={styles.related}>
          <Link to="/privacy" className={styles.relatedLink}>개인정보처리방침 보기</Link>
          <Link to="/support" className={styles.relatedLink}>문의하기</Link>
        </div>
      </div>
    </div>
  );
}
