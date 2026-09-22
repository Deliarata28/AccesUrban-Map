import { useEffect, useRef, useState, type ClipboardEvent, type FormEvent, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Clock3, Eye, EyeOff, Footprints, Route, ShieldCheck } from "lucide-react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { Header } from "../../components/Header";
import { Footer } from "../../components/Footer";
import accessibilityLogo from "../../assets/accessurban-accessibility-logo-clean.png";
import { ErrorPopup } from "../../components/ErrorPopup";
import {
  type AccessibilityProfile,
  requestLoginCode,
  registerUser,
  verifyLoginCode,
} from "../../stores/sessionStore";
import {
  hasPendingReport,
  type PendingReportSearch,
} from "./authRedirect";
import "./AuthPage.css";

type AuthFeedback = {
  type: "error" | "success";
  message: string;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function AuthLayout({
  children,
  mainClassName = "",
  minimal = false,
}: {
  children: ReactNode;
  mainClassName?: string;
  minimal?: boolean;
}) {
  return (
    <div className={`site-shell auth-shell${minimal ? " auth-shell--minimal" : ""}`}>
      <a className="skip-link" href="#continut">
        Sari la conÈ›inut
      </a>

      {!minimal ? <Header /> : null}

      <main id="continut" className={`auth-main ${mainClassName}`.trim()}>
        {children}
      </main>

      {!minimal ? <Footer /> : null}
    </div>
  );
}

function AuthBrand() {
  return (
    <div className="auth-brand" aria-label="AccesUrban Map">
      <span className="auth-brand-mark">
        <img src={accessibilityLogo} alt="" aria-hidden="true" />
      </span>
      <span className="auth-brand-name">
        <strong>AccesUrban Map</strong>
        <small>ChiÈ™inÄƒu fÄƒrÄƒ bariere</small>
      </span>
    </div>
  );
}

export function AuthPage() {
  return (
    <AuthLayout>
      <section className="auth-welcome" aria-labelledby="auth-title">
        <div className="auth-card auth-card--welcome">
          <AuthBrand />

          <h1 id="auth-title">IntrÄƒ Ã®n AccesUrban Map</h1>
          <p className="auth-intro">
            CreeazÄƒ-È›i cont pentru a salva locuri, a raporta schimbÄƒri È™i a ajuta
            comunitatea sÄƒ descopere accesul Ã®nainte de drum.
          </p>

          <div className="auth-actions" aria-label="OpÈ›iuni de cont">
            <Link className="auth-button auth-button--primary" to="/inregistrare">
              ÃŽnregistreazÄƒ-te gratuit
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link className="auth-button auth-button--secondary" to="/conectare">
              Ai deja cont? ConecteazÄƒ-te
            </Link>
          </div>
        </div>
      </section>
    </AuthLayout>
  );
}

type AuthFormProps = {
  mode: "login" | "register";
};

export function AuthFormPage({ mode }: AuthFormProps) {
  const isRegister = mode === "register";
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as PendingReportSearch;
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [accessibilityProfile, setAccessibilityProfile] = useState<AccessibilityProfile>("WHEELCHAIR");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [feedback, setFeedback] = useState<AuthFeedback | null>(null);
  const [authError, setAuthError] = useState<unknown>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authVerification, setAuthVerification] = useState<{
    verificationToken: string;
    email: string;
    expiresAt: string;
  } | null>(null);
  const [loginCode, setLoginCode] = useState<string[]>(Array.from({ length: 6 }, () => ""));
  const [codeDeliveryNotice, setCodeDeliveryNotice] = useState("");
  const codeInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const credentialsComplete =
    name.trim().length > 1 &&
    emailPattern.test(email.trim()) &&
    password.length >= 8 &&
    passwordConfirmation === password;
  const reportSearch = hasPendingReport(search)
    ? {
        reportLat: search.reportLat,
        reportLng: search.reportLng,
        reportTargetId: search.reportTargetId,
        reportName: search.reportName,
        reportAddress: search.reportAddress,
      }
    : {};

  useEffect(() => {
    if (isRegister || !authVerification) return;
    const updateCountdown = () => {
      setRemainingSeconds(Math.max(0, Math.ceil((new Date(authVerification.expiresAt).getTime() - Date.now()) / 1000)));
    };
    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(timer);
  }, [isRegister, authVerification]);

  useEffect(() => {
    if (!authVerification) return;
    const focusTimer = window.setTimeout(() => codeInputRefs.current[0]?.focus(), 120);
    return () => window.clearTimeout(focusTimer);
  }, [authVerification]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    setAuthError(null);

    const normalizedEmail = email.trim().toLowerCase();

    if (!emailPattern.test(normalizedEmail)) {
      setFeedback({ type: "error", message: "Introdu o adresÄƒ de email validÄƒ." });
      return;
    }

    if (password.length < 8) {
      setFeedback({ type: "error", message: "Parola trebuie sÄƒ conÈ›inÄƒ cel puÈ›in 8 caractere." });
      return;
    }

    if (!isRegister && authVerification && !/^\d{6}$/.test(loginCode.join(""))) {
      setFeedback({ type: "error", message: "Introdu codul de 6 cifre primit pe email." });
      return;
    }

    if (isRegister) {
      if (name.trim().length < 2) {
        setFeedback({ type: "error", message: "Introdu numele tÄƒu complet." });
        return;
      }

      if (password !== passwordConfirmation) {
        setFeedback({ type: "error", message: "Parolele introduse nu coincid." });
        return;
      }

      if (!termsAccepted) {
        setFeedback({ type: "error", message: "AcceptÄƒ termenii pentru a crea contul." });
        return;
      }
    }

    setIsSubmitting(true);

    try {
      if (!isRegister && !authVerification) {
        const challenge = await requestLoginCode(normalizedEmail, password);
        setAuthVerification(challenge);
        setLoginCode(Array.from({ length: 6 }, () => ""));
        setCodeDeliveryNotice("Codul a fost trimis. VerificÄƒ inboxul sau Spam.");
        setFeedback(null);
        return;
      }

      const user = isRegister
        ? await registerUser({ name, email: normalizedEmail, password, accessibilityProfile })
        : await verifyLoginCode(authVerification!.verificationToken, loginCode.join(""));
      if (hasPendingReport(search)) {
        await navigate({
          to: "/map",
          search: reportSearch,
        });
      } else if (user.role === "ADMIN") await navigate({ to: "/admin", search: { tab: "overview" } });
      else await navigate({ to: "/home" });
    } catch (error) {
      setAuthError(error);
      setFeedback(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resendLoginCode = async () => {
    setFeedback(null);
    setAuthError(null);
    setIsSubmitting(true);
    try {
      const challenge = await requestLoginCode(email.trim().toLowerCase(), password);
      setAuthVerification(challenge);
      setLoginCode(Array.from({ length: 6 }, () => ""));
      setCodeDeliveryNotice("Am trimis un cod nou. FoloseÈ™te-l pe cel mai recent.");
      setFeedback(null);
    } catch (error) {
      setAuthError(error);
      setFeedback(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const changeLoginEmail = () => {
    setAuthVerification(null);
    setLoginCode(Array.from({ length: 6 }, () => ""));
    setCodeDeliveryNotice("");
    setRemainingSeconds(0);
    setFeedback(null);
    setAuthError(null);
  };

  const updateLoginCodeDigit = (index: number, value: string) => {
    const digits = value.replace(/\D/g, "");
    setLoginCode((current) => {
      const next = [...current];
      digits.slice(0, 6 - index).split("").forEach((digit, offset) => {
        next[index + offset] = digit;
      });
      if (!digits) next[index] = "";
      return next;
    });

    if (digits) {
      const nextIndex = Math.min(5, index + digits.length);
      window.setTimeout(() => codeInputRefs.current[nextIndex]?.focus(), 0);
    }
  };

  const handleCodeKeyDown = (index: number, key: string) => {
    if (key === "Backspace" && !loginCode[index] && index > 0)
      codeInputRefs.current[index - 1]?.focus();
    if (key === "ArrowLeft" && index > 0)
      codeInputRefs.current[index - 1]?.focus();
    if (key === "ArrowRight" && index < 5)
      codeInputRefs.current[index + 1]?.focus();
  };

  const handleCodePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const digits = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!digits) return;
    setLoginCode([...digits, ...Array.from({ length: 6 - digits.length }, () => "")]);
    window.setTimeout(() => codeInputRefs.current[Math.min(5, digits.length)]?.focus(), 0);
  };

  const handlePasswordReset = () => {
    setFeedback(null);
    setAuthError(null);

    if (!emailPattern.test(email.trim())) {
      setFeedback({ type: "error", message: "Introdu emailul pentru care vrei resetarea parolei." });
      return;
    }

    setFeedback({
      type: "success",
      message: "Resetarea prin email va fi disponibilÄƒ dupÄƒ activarea confirmÄƒrii emailului.",
    });
  };

  return (
    <AuthLayout
      mainClassName={`auth-main--form${authVerification ? " auth-main--challenge" : ""}`}
      minimal={Boolean(authVerification)}
    >
      <ErrorPopup error={authError} />
      <section className="auth-form-layout" aria-labelledby="auth-form-title">
        <form
          className={`auth-card auth-card--form${isRegister ? " auth-card--register" : ""}${authVerification ? " auth-card--challenge" : ""}`}
          onSubmit={handleSubmit}
          noValidate
        >
          <Link className="auth-back" to="/autentificare" aria-label="ÃŽnapoi la opÈ›iunile contului">
            <ArrowLeft size={27} strokeWidth={1.8} aria-hidden="true" />
          </Link>

          <AuthBrand />

          <h1 id="auth-form-title">{isRegister ? "CreeazÄƒ-È›i contul" : authVerification ? "ConfirmÄƒ conectarea" : "Bine ai revenit!"}</h1>

          {isRegister ? (
            <label className="auth-field">
              <span>Nume complet</span>
              <input
                type="text"
                name="name"
                autoComplete="name"
                placeholder="Nume complet"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </label>
          ) : null}

          {isRegister || !authVerification ? (
            <>
          <label className="auth-field">
            <span>AdresÄƒ de email</span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              placeholder="Email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              readOnly={!isRegister && Boolean(authVerification)}
              required
            />
          </label>

          <label className="auth-field auth-field--password">
            <span>ParolÄƒ</span>
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              autoComplete={isRegister ? "new-password" : "current-password"}
              placeholder="ParolÄƒ"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              readOnly={!isRegister && Boolean(authVerification)}
              minLength={8}
              required
            />
            <button
              className="auth-password-toggle"
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Ascunde parola" : "AfiÈ™eazÄƒ parola"}
            >
              {showPassword ? <EyeOff size={22} aria-hidden="true" /> : <Eye size={22} aria-hidden="true" />}
            </button>
          </label>
            </>
          ) : null}

          {!isRegister && authVerification ? (
            <div className="auth-code-panel">
              <div className="auth-code-heading">
                <span className="auth-code-icon" aria-hidden="true">
                  <ShieldCheck size={22} />
                </span>
                <div>
                  <strong>Codul tÄƒu de acces</strong>
                  <p>L-am trimis la <b>{authVerification.email}</b>.</p>
                </div>
              </div>
              <div className="auth-otp-inputs" aria-label="Cod de verificare din 6 cifre">
                {Array.from({ length: 6 }, (_, index) => (
                  <input
                    className="auth-otp-input"
                    key={index}
                    ref={(element) => { codeInputRefs.current[index] = element; }}
                    inputMode="numeric"
                    autoComplete={index === 0 ? "one-time-code" : "off"}
                    pattern="[0-9]*"
                    maxLength={index === 0 ? 6 : 1}
                    value={loginCode[index]}
                    onChange={(event) => updateLoginCodeDigit(index, event.target.value)}
                    onKeyDown={(event) => handleCodeKeyDown(index, event.key)}
                    onPaste={handleCodePaste}
                    aria-label={`Cifra ${index + 1} din 6`}
                  />
                ))}
              </div>
              {codeDeliveryNotice ? <p className="auth-code-notice" role="status">{codeDeliveryNotice}</p> : null}
              <div className="auth-code-meta">
                <span>
                  <Clock3 size={14} aria-hidden="true" />
                  {remainingSeconds > 0 ? `Valabil Ã®ncÄƒ ${remainingSeconds}s` : "Codul a expirat"}
                </span>
                <button type="button" className="auth-inline-button" onClick={() => void resendLoginCode()} disabled={isSubmitting}>
                  Trimite din nou
                </button>
              </div>
              <button type="button" className="auth-inline-button auth-code-change" onClick={changeLoginEmail}>
                FoloseÈ™te altÄƒ adresÄƒ
              </button>
            </div>
          ) : null}

          {isRegister ? (
            <label className="auth-field">
              <span>ConfirmÄƒ parola</span>
              <input
                type={showPassword ? "text" : "password"}
                name="passwordConfirmation"
                autoComplete="new-password"
                placeholder="ConfirmÄƒ parola"
                value={passwordConfirmation}
                onChange={(event) => setPasswordConfirmation(event.target.value)}
                minLength={8}
                required
              />
            </label>
          ) : null}

          {isRegister ? (
            <fieldset className="auth-accessibility-field" disabled={!credentialsComplete}>
              <legend>Cum vrei sÄƒ fie adaptatÄƒ harta?</legend>
              <div className="auth-profile-options">
                {[
                  {
                    value: "WHEELCHAIR" as const,
                    label: "Scaun rulant",
                    detail: "Rute fÄƒrÄƒ trepte",
                    icon: Route,
                  },
                  {
                    value: "WALKING_AID" as const,
                    label: "Dispozitiv de mers",
                    detail: "Trasee cu efort redus",
                    icon: Footprints,
                  },
                  {
                    value: "VISUAL_IMPAIRMENT" as const,
                    label: "DeficienÈ›Äƒ de vedere",
                    detail: "InformaÈ›ii mai clare",
                    icon: Eye,
                  },
                ].map((option) => {
                  const Icon = option.icon;
                  const selected = accessibilityProfile === option.value;

                  return (
                    <button
                      className={`auth-profile-option${selected ? " is-selected" : ""}`}
                      key={option.value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setAccessibilityProfile(option.value)}
                    >
                      <span className="auth-profile-icon" aria-hidden="true">
                        <Icon size={18} />
                      </span>
                      <span className="auth-profile-copy">
                        <strong>{option.label}</strong>
                        <small>{option.detail}</small>
                      </span>
                      <span className="auth-profile-check" aria-hidden="true">
                        {selected ? "âœ“" : ""}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="auth-accessibility-help">
                {credentialsComplete
                  ? "Vom adapta recomandÄƒrile hÄƒrÈ›ii la alegerea ta."
                  : "CompleteazÄƒ cÃ¢mpurile de mai sus pentru a putea alege."}
              </p>
            </fieldset>
          ) : null}

          {isRegister ? (
            <label className="auth-check auth-check--terms">
              <input
                type="checkbox"
                name="terms"
                checked={termsAccepted}
                onChange={(event) => setTermsAccepted(event.target.checked)}
                required
              />
              <span>
                Accept termenii de utilizare È™i <span className="auth-policy-link">politica de confidenÈ›ialitate</span>.
              </span>
            </label>
          ) : null}

          {feedback ? (
            <p
              className={`auth-feedback auth-feedback--${feedback.type}`}
              role={feedback.type === "error" ? "alert" : "status"}
            >
              {feedback.message}
            </p>
          ) : null}

          <button
            className="auth-button auth-button--primary auth-submit"
            type="submit"
            disabled={isSubmitting || (!isRegister && Boolean(authVerification) && remainingSeconds === 0)}
          >
            {isSubmitting
              ? "Se proceseazÄƒ..."
              : isRegister
                ? "ÃŽnregistreazÄƒ-te"
                : authVerification
                  ? "VerificÄƒ È™i conecteazÄƒ-te"
                  : "Trimite codul"}
          </button>

          {!isRegister ? (
            <p className="auth-forgot">
              Ai uitat parola?{" "}
              <button className="auth-inline-button" type="button" onClick={handlePasswordReset}>
                ReseteazÄƒ
              </button>
            </p>
          ) : null}

          <p className="auth-switch">
            {isRegister ? "Ai deja un cont?" : "Nu ai cont?"}{" "}
            {isRegister ? (
              <Link to="/conectare" search={reportSearch}>
                ConecteazÄƒ-te
              </Link>
            ) : (
              <Link to="/inregistrare" search={reportSearch}>
                ÃŽnregistreazÄƒ-te
              </Link>
            )}
          </p>
        </form>
      </section>
    </AuthLayout>
  );
}

