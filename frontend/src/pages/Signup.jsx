import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { checkLoginId, checkArtistName, signup } from '../api/auth';
import { useCapsLock, CapsLockWarning } from '../hooks/useCapsLock';
import styles from './Signup.module.css';
import { GENRES as BASE_GENRES } from '../constants/genres';

const GENRES = ['', ...BASE_GENRES];

const INITIAL_FORM = {
  loginId: '', password: '', passwordConfirm: '', email: '',
  name: '', favoriteGenre: '', artistName: '',
};

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 101 }, (_, i) => String(CURRENT_YEAR - i));
const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));

const TERMS_TEXT = `WHATPL은 사용자가 저작권 문제가 없는 음악을 감상하고, Creator로 전환하여 직접 제작한 트랙을 업로드할 수 있는 음악 공유 서비스입니다.

회원은 서비스 이용 시 다음 사항을 준수해야 합니다.

1. 타인의 저작권을 침해하는 음원, 이미지, 설명을 업로드할 수 없습니다.
2. 본인이 직접 제작했거나 사용 권한이 있는 음원만 업로드해야 합니다.
3. 부적절한 제목, 설명, 이미지, 음원 또는 타인을 불쾌하게 하는 콘텐츠를 업로드할 수 없습니다.
4. 다른 회원의 계정, 음원, 플레이리스트 기능을 악용하거나 서비스 운영을 방해해서는 안 됩니다.
5. 관리자는 운영 정책에 따라 부적절한 음원을 삭제 처리하거나 계정을 비활성화할 수 있습니다.
6. Creator 신청, 음원 삭제 요청, 계정 관리 등은 관리자 검토를 거쳐 처리될 수 있습니다.
7. 회원은 자신의 계정 정보를 관리할 책임이 있으며, 비밀번호 변경 시 현재 비밀번호 확인이 필요합니다.
8. WHATPL은 안정적인 서비스 운영을 위해 필요한 경우 콘텐츠 노출, 계정 상태, 업로드 권한을 제한할 수 있습니다.

회원은 위 내용을 확인하고 WHATPL 서비스 이용약관에 동의합니다.`;

const PRIVACY_TEXT = `WHATPL은 회원가입, 로그인, 계정 관리, Creator 신청, 음악 업로드 및 서비스 제공을 위해 필요한 개인정보를 수집합니다.

1. 수집 항목
아이디, 비밀번호, 이름, 이메일, 생년월일, 휴대폰 번호, 좋아하는 장르, 크리에이터명, 프로필 이미지

2. 수집 목적
- 회원 식별 및 로그인
- 계정 정보 관리 및 아이디 찾기, 비밀번호 초기화
- Creator 신청 및 승인 관리
- 음원 업로드 및 플레이리스트, 좋아요, 구독 등 개인화 기능 제공
- 서비스 운영 및 부정 이용 방지

3. 보관 및 이용
수집된 개인정보는 WHATPL 서비스 제공과 계정 관리를 위해 사용되며, 서비스 운영에 필요한 범위 내에서 보관됩니다.

4. 비밀번호 처리
비밀번호는 평문으로 저장하지 않고 암호화된 형태로 저장됩니다.

5. 개인정보 표시 제한
관리자 페이지와 서비스 화면에서는 필요한 정보만 표시하며, 비밀번호와 같은 민감정보는 화면에 노출하지 않습니다.

6. 프로필 이미지
회원이 프로필 이미지를 업로드한 경우, 해당 이미지는 서비스 내 사용자 식별 및 프로필 표시를 위해 사용될 수 있습니다.

회원은 위 개인정보 수집 및 이용에 동의합니다.`;

export default function Signup() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL_FORM);
  const [idStatus, setIdStatus] = useState(null);
  const [artistNameStatus, setArtistNameStatus] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [signupDone, setSignupDone] = useState(false);
  const pwCaps = useCapsLock();
  const pwConfirmCaps = useCapsLock();

  const [birthYear, setBirthYear] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthDay, setBirthDay] = useState('');
  const [phoneMid, setPhoneMid] = useState('');
  const [phoneLast, setPhoneLast] = useState('');

  const [profileFile, setProfileFile] = useState(null);
  const [profilePreview, setProfilePreview] = useState('');

  const [termsAgreed, setTermsAgreed] = useState(false);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  function handleGoToLogin() { navigate('/login'); }

  useEffect(() => {
    if (!signupDone) return;
    const timer = setTimeout(() => navigate('/login'), 5000);
    return () => clearTimeout(timer);
  }, [signupDone]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleProfileFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setProfileFile(file);
    setProfilePreview(URL.createObjectURL(file));
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (name === 'loginId') setIdStatus(null);
    if (name === 'artistName') setArtistNameStatus(null);
  }

  async function handleCheckId() {
    if (!form.loginId.trim()) return;
    setIdStatus('checking');
    try {
      const { available } = await checkLoginId(form.loginId.trim());
      setIdStatus(available ? 'available' : 'taken');
    } catch { setIdStatus(null); }
  }

  async function handleCheckArtistName() {
    if (!form.artistName.trim()) return;
    setArtistNameStatus('checking');
    try {
      const { available } = await checkArtistName(form.artistName.trim());
      setArtistNameStatus(available ? 'available' : 'taken');
    } catch { setArtistNameStatus(null); }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (idStatus !== 'available') { setError(t('signup.id_check_error')); return; }
    if (form.password !== form.passwordConfirm) { setError(t('signup.password_mismatch')); return; }
    if (form.artistName.trim() && artistNameStatus !== 'available') { setError(t('signup.artist_check_error')); return; }

    let birthDate = '';
    const birthAnyFilled = birthYear || birthMonth || birthDay;
    const birthAllFilled = birthYear && birthMonth && birthDay;
    if (birthAnyFilled && !birthAllFilled) { setError(t('signup.birth_date_partial_error')); return; }
    if (birthAllFilled) {
      birthDate = `${birthYear}-${birthMonth}-${birthDay}`;
      const dateCheck = new Date(birthDate);
      if (isNaN(dateCheck.getTime()) || dateCheck.getDate() !== Number(birthDay)) {
        setError(t('signup.birth_date_invalid_error')); return;
      }
    }

    let phone = '';
    const phoneAnyFilled = phoneMid || phoneLast;
    const phoneAllFilled = phoneMid && phoneLast;
    if (phoneAnyFilled && !phoneAllFilled) { setError(t('signup.phone_partial_error')); return; }
    if (phoneAllFilled) {
      if (!/^\d{3,4}$/.test(phoneMid)) { setError(t('signup.phone_mid_error')); return; }
      if (!/^\d{4}$/.test(phoneLast)) { setError(t('signup.phone_last_error')); return; }
      phone = `010-${phoneMid}-${phoneLast}`;
    }

    if (!termsAgreed || !privacyAgreed) { setError(t('signup.agreement_error')); return; }

    setLoading(true);
    try {
      const { loginId, password, email, name, favoriteGenre, artistName } = form;
      const fd = new FormData();
      fd.append('loginId', loginId); fd.append('password', password);
      fd.append('email', email); fd.append('name', name);
      fd.append('birthDate', birthDate); fd.append('phone', phone);
      fd.append('favoriteGenre', favoriteGenre); fd.append('artistName', artistName);
      fd.append('termsAgreed', String(termsAgreed)); fd.append('privacyAgreed', String(privacyAgreed));
      if (profileFile) fd.append('profileImage', profileFile);
      await signup(fd);
      setSignupDone(true);
    } catch (err) {
      setError(err.response?.data?.error || t('signup.error_default'));
    } finally {
      setLoading(false);
    }
  }

  if (signupDone) {
    return (
      <div className={styles.container}>
        <div className={styles.welcomeCard}>
          <div className={styles.welcomeIcon}>
            <svg width="38" height="38" viewBox="0 0 24 24" fill="#e879f9">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
            </svg>
          </div>
          <h2 className={styles.welcomeTitle}>{t('signup.welcome_title')}</h2>
          <p className={styles.welcomeDesc}>
            {t('signup.welcome_desc').split('\n').map((line, i) => (
              <span key={i}>{line}{i === 0 && <br />}</span>
            ))}
          </p>
          <button type="button" className={styles.welcomeBtn} onClick={handleGoToLogin}>
            {t('signup.welcome_button')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>{t('signup.title')}</h1>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>{t('signup.label_id')} <span className={styles.required}>{t('signup.required_marker')}</span></label>
            <div className={styles.row}>
              <input
                className={styles.input} type="text" name="loginId"
                value={form.loginId} onChange={handleChange}
                placeholder={t('signup.placeholder_id')} autoComplete="username" required
              />
              <button type="button" className={styles.checkBtn} onClick={handleCheckId}>
                {t('signup.check_button')}
              </button>
            </div>
            {idStatus === 'checking' && <p className={styles.info}>{t('signup.checking')}</p>}
            {idStatus === 'available' && <p className={styles.success}>{t('signup.available')}</p>}
            {idStatus === 'taken' && <p className={styles.error}>{t('signup.taken')}</p>}
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{t('signup.label_password')} <span className={styles.required}>{t('signup.required_marker')}</span></label>
            <input
              className={styles.input} type="password" name="password"
              value={form.password} onChange={handleChange}
              onKeyDown={pwCaps.handler} onKeyUp={pwCaps.handler} onBlur={pwCaps.reset}
              placeholder={t('signup.placeholder_password')} autoComplete="new-password" required
            />
            <CapsLockWarning on={pwCaps.on} />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{t('signup.label_password_confirm')} <span className={styles.required}>{t('signup.required_marker')}</span></label>
            <input
              className={styles.input} type="password" name="passwordConfirm"
              value={form.passwordConfirm} onChange={handleChange}
              onKeyDown={pwConfirmCaps.handler} onKeyUp={pwConfirmCaps.handler} onBlur={pwConfirmCaps.reset}
              placeholder={t('signup.placeholder_password_confirm')} autoComplete="new-password" required
            />
            <CapsLockWarning on={pwConfirmCaps.on} />
            {form.passwordConfirm && form.password !== form.passwordConfirm && (
              <p className={styles.error}>{t('signup.password_mismatch')}</p>
            )}
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{t('signup.label_email')} <span className={styles.required}>{t('signup.required_marker')}</span></label>
            <input
              className={styles.input} type="email" name="email"
              value={form.email} onChange={handleChange}
              placeholder={t('signup.placeholder_email')} autoComplete="email" required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{t('signup.label_name')} <span className={styles.required}>{t('signup.required_marker')}</span></label>
            <input
              className={styles.input} type="text" name="name"
              value={form.name} onChange={handleChange}
              placeholder={t('signup.placeholder_name')} required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{t('signup.label_birth_date')}</label>
            <div className={styles.birthRow}>
              <select className={styles.input} value={birthYear} onChange={e => { setBirthYear(e.target.value); setBirthDay(''); }}>
                <option value="">{t('signup.select_year')}</option>
                {YEARS.map(y => <option key={y} value={y}>{y}{t('signup.year_format')}</option>)}
              </select>
              <select className={styles.input} value={birthMonth} onChange={e => { setBirthMonth(e.target.value); setBirthDay(''); }}>
                <option value="">{t('signup.select_month')}</option>
                {MONTHS.map(m => <option key={m} value={m}>{Number(m)}{t('signup.month_format')}</option>)}
              </select>
              <select className={styles.input} value={birthDay} onChange={e => setBirthDay(e.target.value)}>
                <option value="">{t('signup.select_day')}</option>
                {(birthYear && birthMonth
                  ? Array.from({ length: new Date(Number(birthYear), Number(birthMonth), 0).getDate() }, (_, i) => String(i + 1).padStart(2, '0'))
                  : Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'))
                ).map(d => <option key={d} value={d}>{Number(d)}{t('signup.day_format')}</option>)}
              </select>
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{t('signup.label_phone')}</label>
            <div className={styles.phoneRow}>
              <span className={`${styles.input} ${styles.phonePrefix} ${styles.phonePrefixFixed}`}>010</span>
              <span className={styles.phoneSep}>-</span>
              <input
                className={`${styles.input} ${styles.phoneMid}`} type="text" inputMode="numeric"
                value={phoneMid} onChange={e => setPhoneMid(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="1234" maxLength={4}
              />
              <span className={styles.phoneSep}>-</span>
              <input
                className={`${styles.input} ${styles.phoneLast}`} type="text" inputMode="numeric"
                value={phoneLast} onChange={e => setPhoneLast(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="5678" maxLength={4}
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{t('signup.label_profile_image')}</label>
            <div className={styles.profilePickRow}>
              <div className={styles.profileAvatarSmall}>
                {profilePreview ? (
                  <img src={profilePreview} alt="미리보기" className={styles.profilePreviewImg} />
                ) : (
                  <span className={styles.profileAvatarPlaceholder}>사진</span>
                )}
              </div>
              <label className={styles.profilePickBtn}>
                파일 선택
                <input type="file" accept="image/jpeg,image/png,image/webp" className={styles.profileFileInput} onChange={handleProfileFileChange} />
              </label>
              {profileFile && <span className={styles.profileFileName}>{profileFile.name}</span>}
            </div>
            <p className={styles.hint}>{t('signup.profile_hint')}</p>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{t('signup.label_favorite_genre')}</label>
            <select className={styles.input} name="favoriteGenre" value={form.favoriteGenre} onChange={handleChange}>
              {GENRES.map((g) => (
                <option key={g} value={g}>{g || t('signup.no_selection')}</option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{t('signup.label_artist_name')}</label>
            <div className={styles.row}>
              <input
                className={styles.input} type="text" name="artistName"
                value={form.artistName} onChange={handleChange}
                placeholder={t('signup.artist_placeholder')} maxLength={50}
              />
              <button type="button" className={styles.checkBtn} onClick={handleCheckArtistName} disabled={!form.artistName.trim()}>
                {t('signup.artist_check_button')}
              </button>
            </div>
            {artistNameStatus === 'checking' && <p className={styles.info}>{t('signup.checking')}</p>}
            {artistNameStatus === 'available' && <p className={styles.success}>{t('signup.artist_available')}</p>}
            {artistNameStatus === 'taken' && <p className={styles.error}>{t('signup.artist_taken')}</p>}
            <p className={styles.hint}>{t('signup.artist_hint')}</p>
          </div>

          <div className={styles.termsSection}>
            <div className={styles.termItem}>
              <div className={styles.termRow}>
                <label className={styles.termCheckLabel}>
                  <input type="checkbox" className={styles.termCheckbox} checked={termsAgreed} onChange={e => setTermsAgreed(e.target.checked)} />
                  <span className={styles.termLabel}>
                    <span className={styles.termRequired}>{t('signup.terms_required')}</span>{' '}
                    <Link to="/terms" className={styles.termPageLink}>{t('signup.terms_link')}</Link>{t('signup.terms_agree')}
                  </span>
                </label>
                <button type="button" className={styles.termViewBtn} onClick={() => setShowTerms(v => !v)}>
                  {showTerms ? t('signup.terms_button_hide') : t('signup.terms_button_show')}
                </button>
              </div>
              {showTerms && <div className={styles.termContent}>{TERMS_TEXT}</div>}
            </div>

            <div className={styles.termItem}>
              <div className={styles.termRow}>
                <label className={styles.termCheckLabel}>
                  <input type="checkbox" className={styles.termCheckbox} checked={privacyAgreed} onChange={e => setPrivacyAgreed(e.target.checked)} />
                  <span className={styles.termLabel}>
                    <span className={styles.termRequired}>{t('signup.terms_required')}</span>{' '}
                    <Link to="/privacy" className={styles.termPageLink}>{t('signup.privacy_link')}</Link>{t('signup.terms_agree')}
                  </span>
                </label>
                <button type="button" className={styles.termViewBtn} onClick={() => setShowPrivacy(v => !v)}>
                  {showPrivacy ? t('signup.terms_button_hide') : t('signup.terms_button_show')}
                </button>
              </div>
              {showPrivacy && <div className={styles.termContent}>{PRIVACY_TEXT}</div>}
            </div>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button className={styles.submitBtn} type="submit" disabled={loading}>
            {loading ? t('signup.button_submit_loading') : t('signup.button_submit')}
          </button>
        </form>

        <p className={styles.loginPrompt}>
          {t('signup.login_prompt')}{' '}
          <Link to="/login" className={styles.loginLink}>{t('signup.login_link')}</Link>
        </p>
      </div>
    </div>
  );
}
