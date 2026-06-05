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


export default function Signup() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const VALIDATORS = {
    id: (v) => /^[a-z][a-z0-9_]{3,19}$/.test(v) ? null : t('validation.id_format'),
    password: (pw, id) => {
      if (/\s/.test(pw)) return t('validation.pw_no_space');
      if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,20}$/.test(pw)) return t('validation.pw_format');
      if (id && pw === id) return t('validation.id_same_as_pw');
      return null;
    },
    email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : t('validation.email_format'),
    name: (v) => /^[가-힣a-zA-Z0-9_.]{2,20}$/.test(v.trim()) ? null : t('validation.name_format'),
    phone: (countryCode, number) => {
      if (!number.trim()) return null; // optional
      const digits = number.replace(/[\s\-]/g, '');
      if (!/^\d{6,14}$/.test(digits)) return t('validation.phone_format');
      return null;
    },
  };

  const TERMS_TEXT = [
    t('terms.s1_title'), '\n', t('terms.s1_body'), '\n\n',
    t('terms.s2_title'), '\n',
    '1. ' + t('terms.s2_item1'), '\n',
    '2. ' + t('terms.s2_item2'), '\n',
    '3. ' + t('terms.s2_item3'), '\n',
    '4. ' + t('terms.s2_item4'), '\n\n',
    t('terms.s3_title'), '\n',
    '1. ' + t('terms.s3_item1'), '\n',
    '2. ' + t('terms.s3_item2'), '\n',
    '3. ' + t('terms.s3_item3'), '\n',
    '4. ' + t('terms.s3_item4'), '\n\n',
    t('terms.s4_title'), '\n',
    '1. ' + t('terms.s4_item1'), '\n',
    '2. ' + t('terms.s4_item2'), '\n',
    '3. ' + t('terms.s4_item3'), '\n\n',
    t('terms.s5_title'), '\n',
    '1. ' + t('terms.s5_item1'), '\n',
    '2. ' + t('terms.s5_item2'), '\n',
    '3. ' + t('terms.s5_item3'), '\n',
    '4. ' + t('terms.s5_item4'), '\n\n',
    t('terms.s6_title'), '\n', t('terms.s6_body'),
  ].join('');

  const PRIVACY_TEXT = [
    t('privacy.s1_title'), '\n', t('privacy.s1_intro'), '\n\n',
    t('privacy.s2_title'), '\n',
    '1. ' + t('privacy.s2_item1'), '\n',
    '2. ' + t('privacy.s2_item2'), '\n',
    '3. ' + t('privacy.s2_item3'), '\n',
    '4. ' + t('privacy.s2_item4'), '\n',
    '5. ' + t('privacy.s2_item5'), '\n',
    '6. ' + t('privacy.s2_item6'), '\n',
    '7. ' + t('privacy.s2_item7'), '\n\n',
    t('privacy.s3_title'), '\n', t('privacy.s3_body'), '\n\n',
    t('privacy.s4_title'), '\n',
    '1. ' + t('privacy.s4_item1'), '\n',
    '2. ' + t('privacy.s4_item2'), '\n',
    '3. ' + t('privacy.s4_item3'), '\n\n',
    t('privacy.s5_title'), '\n',
    '1. ' + t('privacy.s5_item1'), '\n',
    '2. ' + t('privacy.s5_item2'), '\n\n',
    t('privacy.s6_title'), '\n', t('privacy.s6_body'),
  ].join('');

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
  const [countryCode, setCountryCode] = useState('+82');
  const [phoneNumber, setPhoneNumber] = useState('');

  const [profileFile, setProfileFile] = useState(null);
  const [profilePreview, setProfilePreview] = useState('');

  const [termsAgreed, setTermsAgreed] = useState(false);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const [fieldErrors, setFieldErrors] = useState({});

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

    const newErrors = {};
    const idErr = VALIDATORS.id(form.loginId);
    if (idErr) newErrors.loginId = idErr;
    const pwErr = VALIDATORS.password(form.password, form.loginId);
    if (pwErr) newErrors.password = pwErr;
    if (form.password !== form.passwordConfirm) newErrors.passwordConfirm = t('validation.pw_mismatch');
    const emailErr = VALIDATORS.email(form.email);
    if (emailErr) newErrors.email = emailErr;
    const nameErr = VALIDATORS.name(form.name);
    if (nameErr) newErrors.name = nameErr;
    if (phoneNumber.trim()) {
      const pErr = VALIDATORS.phone(countryCode, phoneNumber);
      if (pErr) newErrors.phone = pErr;
    }
    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(newErrors);
      return;
    }

    if (idStatus !== 'available') { setError(t('signup.id_check_error')); return; }
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
    if (phoneNumber.trim()) {
      const phoneErr = VALIDATORS.phone(countryCode, phoneNumber);
      if (phoneErr) { setError(phoneErr); return; }
      // normalize: remove spaces/hyphens, remove leading 0, prepend country code
      const digits = phoneNumber.replace(/[\s\-]/g, '');
      const normalized = digits.startsWith('0') ? digits.slice(1) : digits;
      phone = `${countryCode}${normalized}`;
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
                onBlur={() => {
                  if (form.loginId) {
                    const err = VALIDATORS.id(form.loginId);
                    setFieldErrors(prev => ({ ...prev, loginId: err }));
                  }
                }}
                placeholder={t('signup.placeholder_id')} autoComplete="username" required
              />
              <button type="button" className={styles.checkBtn} onClick={handleCheckId}>
                {t('signup.check_button')}
              </button>
            </div>
            {idStatus === 'checking' && <p className={styles.info}>{t('signup.checking')}</p>}
            {idStatus === 'available' && <p className={styles.success}>{t('signup.available')}</p>}
            {idStatus === 'taken' && <p className={styles.error}>{t('signup.taken')}</p>}
            {fieldErrors.loginId && <p className={styles.error}>{fieldErrors.loginId}</p>}
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{t('signup.label_password')} <span className={styles.required}>{t('signup.required_marker')}</span></label>
            <input
              className={styles.input} type="password" name="password"
              value={form.password} onChange={handleChange}
              onKeyDown={pwCaps.handler} onKeyUp={pwCaps.handler}
              onBlur={(e) => {
                pwCaps.reset(e);
                if (form.password) {
                  const err = VALIDATORS.password(form.password, form.loginId);
                  setFieldErrors(prev => ({ ...prev, password: err }));
                }
              }}
              placeholder={t('signup.placeholder_password')} autoComplete="new-password" required
            />
            <CapsLockWarning on={pwCaps.on} />
            {fieldErrors.password && <p className={styles.error}>{fieldErrors.password}</p>}
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{t('signup.label_password_confirm')} <span className={styles.required}>{t('signup.required_marker')}</span></label>
            <input
              className={styles.input} type="password" name="passwordConfirm"
              value={form.passwordConfirm} onChange={handleChange}
              onKeyDown={pwConfirmCaps.handler} onKeyUp={pwConfirmCaps.handler}
              onBlur={(e) => {
                pwConfirmCaps.reset(e);
                if (form.passwordConfirm) {
                  const err = form.password !== form.passwordConfirm ? t('validation.pw_mismatch') : null;
                  setFieldErrors(prev => ({ ...prev, passwordConfirm: err }));
                }
              }}
              placeholder={t('signup.placeholder_password_confirm')} autoComplete="new-password" required
            />
            <CapsLockWarning on={pwConfirmCaps.on} />
            {form.passwordConfirm && form.password !== form.passwordConfirm && (
              <p className={styles.error}>{t('signup.password_mismatch')}</p>
            )}
            {fieldErrors.passwordConfirm && <p className={styles.error}>{fieldErrors.passwordConfirm}</p>}
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{t('signup.label_email')} <span className={styles.required}>{t('signup.required_marker')}</span></label>
            <input
              className={styles.input} type="email" name="email"
              value={form.email} onChange={handleChange}
              onBlur={() => {
                if (form.email) {
                  const err = VALIDATORS.email(form.email);
                  setFieldErrors(prev => ({ ...prev, email: err }));
                }
              }}
              placeholder={t('signup.placeholder_email')} autoComplete="email" required
            />
            {fieldErrors.email && <p className={styles.error}>{fieldErrors.email}</p>}
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{t('signup.label_name')} <span className={styles.required}>{t('signup.required_marker')}</span></label>
            <input
              className={styles.input} type="text" name="name"
              value={form.name} onChange={handleChange}
              onBlur={() => {
                if (form.name) {
                  const err = VALIDATORS.name(form.name);
                  setFieldErrors(prev => ({ ...prev, name: err }));
                }
              }}
              placeholder={t('signup.placeholder_name')} required
            />
            {fieldErrors.name && <p className={styles.error}>{fieldErrors.name}</p>}
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
              <select
                className={`${styles.input} ${styles.countrySelect}`}
                value={countryCode}
                onChange={e => setCountryCode(e.target.value)}
              >
                <option value="+82">{t('validation.phone_country_kr')}</option>
                <option value="+1">{t('validation.phone_country_us')}</option>
                <option value="+81">{t('validation.phone_country_jp')}</option>
              </select>
              <input
                className={styles.input}
                type="text"
                inputMode="tel"
                value={phoneNumber}
                onChange={e => setPhoneNumber(e.target.value.replace(/[^\d\s\-]/g, ''))}
                onBlur={() => {
                  if (phoneNumber.trim()) {
                    const err = VALIDATORS.phone(countryCode, phoneNumber);
                    setFieldErrors(prev => ({ ...prev, phone: err }));
                  }
                }}
                placeholder="010-1234-5678"
                maxLength={20}
              />
            </div>
            {fieldErrors.phone && <p className={styles.error}>{fieldErrors.phone}</p>}
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{t('signup.label_profile_image')}</label>
            <div className={styles.profilePickRow}>
              <div className={styles.profileAvatarSmall}>
                {profilePreview ? (
                  <img src={profilePreview} alt="미리보기" className={styles.profilePreviewImg} />
                ) : (
                  <span className={styles.profileAvatarPlaceholder}>{t('signup.profile_placeholder')}</span>
                )}
              </div>
              <label className={styles.profilePickBtn}>
                {t('signup.profile_file_select')}
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
