import { Link } from 'react-router-dom';
import styles from './InfoPage.module.css';

export default function Privacy() {
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>개인정보처리방침</h1>
          <p className={styles.subtitle}>최종 업데이트: 2026년 1월</p>
        </header>

        <div className={styles.notice}>
          WHATPL은 회원의 개인정보를 소중히 여기며, 수집한 정보는 서비스 제공 목적으로만
          사용합니다. 회원가입 시 본 방침에 동의한 것으로 간주됩니다.
        </div>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>제1조 수집하는 개인정보 항목</h2>
          <p className={styles.body}>
            WHATPL은 회원가입 및 서비스 제공을 위해 아래 정보를 수집합니다.
          </p>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>항목</th>
                  <th>필수 여부</th>
                  <th>비고</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>아이디 (loginId)</td>
                  <td>필수</td>
                  <td>로그인 및 회원 식별에 사용</td>
                </tr>
                <tr>
                  <td>비밀번호</td>
                  <td>필수</td>
                  <td>bcrypt 암호화 후 저장, 원문 미보관</td>
                </tr>
                <tr>
                  <td>이메일</td>
                  <td>필수</td>
                  <td>아이디 찾기 및 비밀번호 재설정에 사용</td>
                </tr>
                <tr>
                  <td>이름</td>
                  <td>필수</td>
                  <td>아이디 찾기에 사용</td>
                </tr>
                <tr>
                  <td>생년월일</td>
                  <td>필수</td>
                  <td>연도·월·일 형식으로 저장</td>
                </tr>
                <tr>
                  <td>휴대폰 번호</td>
                  <td>필수</td>
                  <td>010-XXXX-XXXX 형식으로 저장</td>
                </tr>
                <tr>
                  <td>프로필 이미지</td>
                  <td>선택</td>
                  <td>서비스 내 프로필 표시에 사용</td>
                </tr>
                <tr>
                  <td>좋아하는 장르</td>
                  <td>선택</td>
                  <td>개인화 기능 제공에 사용</td>
                </tr>
                <tr>
                  <td>크리에이터명 (artistName)</td>
                  <td>선택</td>
                  <td>Creator 전환 시 아티스트명으로 사용</td>
                </tr>
                <tr>
                  <td>Creator 신청 메시지</td>
                  <td>선택</td>
                  <td>Creator 전환 신청 시 수집, 심사에 사용</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>제2조 개인정보 수집 목적</h2>
          <ul className={styles.list}>
            <li>회원 식별 및 로그인 처리</li>
            <li>아이디 찾기 및 비밀번호 재설정</li>
            <li>사용자 프로필 관리 (이름, 이미지, 장르 설정 등)</li>
            <li>음원 업로드, 재생, 좋아요, 플레이리스트 등 개인화 기능 제공</li>
            <li>Creator 신청 및 승인 처리</li>
            <li>팔로우 기반 알림 발송 (팔로우한 Creator의 새 업로드 등)</li>
            <li>서비스 운영 및 부정 이용 방지</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>제3조 비밀번호 처리</h2>
          <p className={styles.body}>
            비밀번호는 평문으로 저장하지 않습니다. 회원가입 및 비밀번호 변경 시 bcrypt 알고리즘을
            통해 암호화된 형태로 저장하며, 서비스 운영자도 원래 비밀번호를 확인할 수 없습니다.
            비밀번호 분실 시에는 재설정 기능을 통해 새 비밀번호를 지정할 수 있습니다.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>제4조 개인정보 보관 및 이용</h2>
          <ul className={styles.list}>
            <li>
              수집된 개인정보는 WHATPL 서비스 내 저장소에 보관되며, 서비스 제공 및 계정 관리
              목적으로만 사용됩니다.
            </li>
            <li>
              업로드된 음원 파일과 이미지는 서비스 서버에 저장되며, 해당 서비스 내에서만
              사용됩니다.
            </li>
            <li>
              수집된 개인정보는 제3자에게 제공되지 않습니다.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>제5조 개인정보 표시 제한</h2>
          <ul className={styles.list}>
            <li>
              관리자 페이지와 서비스 화면에서는 서비스 운영에 필요한 정보만 표시하며,
              비밀번호와 같은 민감정보는 화면에 노출하지 않습니다.
            </li>
            <li>
              프로필 이미지는 서비스 내 사용자 식별 및 프로필 표시를 위해 사용됩니다.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>제6조 이용자의 권리</h2>
          <p className={styles.body}>
            회원은 마이페이지에서 이름, 이메일, 생년월일, 휴대폰 번호, 프로필 이미지,
            좋아하는 장르, 크리에이터명을 직접 수정하거나 삭제할 수 있습니다.
            기타 개인정보 관련 문의는 고객센터를 이용해 주세요.
          </p>
        </section>

        <div className={styles.related}>
          <Link to="/terms" className={styles.relatedLink}>이용약관 보기</Link>
          <Link to="/support" className={styles.relatedLink}>문의하기</Link>
        </div>
      </div>
    </div>
  );
}
