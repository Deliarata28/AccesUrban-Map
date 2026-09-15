import { useState, type FormEvent, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Eye, EyeOff, Footprints, Route } from "lucide-react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { Header } from "../../components/Header";
import { Footer } from "../../components/Footer";
import accessibilityLogo from "../../assets/accessurban-accessibility-logo-clean.png";
import {
  type AccessibilityProfile,
  loginMockUser,
  registerMockUser,
  requestMockPasswordReset,
} from "../../stores/authStore";
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

function AuthLayout({ children, mainClassName = "" }: { children: ReactNode; mainClassName?: string }) {
  return (
    <div className="site-shell auth-shell">
      <a className="skip-link" href="#continut">
        Sari la conținut
      </a>

      <Header />

      <main id="continut" className={`auth-main ${mainClassName}`.trim()}>
        {children}
      </main>

      <Footer />
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
        <small>Chișinău fără bariere</small>
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

          <h1 id="auth-title">Intră în AccesUrban Map</h1>
          <p className="auth-intro">
            Creează-ți cont pentru a salva locuri, a raporta schimbări și a ajuta
            comunitatea să descopere accesul înainte de drum.
          </p>

          <div className="auth-actions" aria-label="Opțiuni de cont">
            <Link className="auth-button auth-button--primary" to="/inregistrare">
              Înregistrează-te gratuit
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link className="auth-button auth-button--secondary" to="/conectare">
              Ai deja cont? Conectează-te
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
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);

    const normalizedEmail = email.trim().toLowerCase();

    if (!emailPattern.test(normalizedEmail)) {
      setFeedback({ type: "error", message: "Introdu o adresă de email validă." });
      return;
    }

    if (password.length < 8) {
      setFeedback({ type: "error", message: "Parola trebuie să conțină cel puțin 8 caractere." });
      return;
    }

    if (isRegister) {
      if (name.trim().length < 2) {
        setFeedback({ type: "error", message: "Introdu numele tău complet." });
        return;
      }

      if (password !== passwordConfirmation) {
        setFeedback({ type: "error", message: "Parolele introduse nu coincid." });
        return;
      }

      if (!termsAccepted) {
        setFeedback({ type: "error", message: "Acceptă termenii pentru a crea contul." });
        return;
      }
    }

    setIsSubmitting(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 300));

      const user = isRegister
        ? registerMockUser({ name, email: normalizedEmail, password, accessibilityProfile })
        : loginMockUser(normalizedEmail, password);
      if (hasPendingReport(search)) {
        await navigate({
          to: "/map",
          search: reportSearch,
        });
      } else if (user.role === "ADMIN") await navigate({ to: "/admin", search: { tab: "overview" } });
      else await navigate({ to: "/home" });
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Nu am putut finaliza cererea.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordReset = () => {
    setFeedback(null);

    if (!emailPattern.test(email.trim())) {
      setFeedback({ type: "error", message: "Introdu emailul pentru care vrei resetarea parolei." });
      return;
    }

    requestMockPasswordReset(email);
    setFeedback({
      type: "success",
      message: "Resetarea parolei va deveni disponibilă după conectarea serviciului de autentificare.",
    });
  };

  return (
    <AuthLayout mainClassName="auth-main--form">
      <section className="auth-form-layout" aria-labelledby="auth-form-title">
        <form
          className={`auth-card auth-card--form${isRegister ? " auth-card--register" : ""}`}
          onSubmit={handleSubmit}
          noValidate
        >
          <Link className="auth-back" to="/autentificare" aria-label="Înapoi la opțiunile contului">
            <ArrowLeft size={27} strokeWidth={1.8} aria-hidden="true" />
          </Link>

          <AuthBrand />

          <h1 id="auth-form-title">{isRegister ? "Creează-ți contul" : "Bine ai revenit!"}</h1>

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

          <label className="auth-field">
            <span>Adresă de email</span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              placeholder="Email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label className="auth-field auth-field--password">
            <span>Parolă</span>
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              autoComplete={isRegister ? "new-password" : "current-password"}
              placeholder="Parolă"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              required
            />
            <button
              className="auth-password-toggle"
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Ascunde parola" : "Afișează parola"}
            >
              {showPassword ? <EyeOff size={22} aria-hidden="true" /> : <Eye size={22} aria-hidden="true" />}
            </button>
          </label>

          {isRegister ? (
            <label className="auth-field">
              <span>Confirmă parola</span>
              <input
                type={showPassword ? "text" : "password"}
                name="passwordConfirmation"
                autoComplete="new-password"
                placeholder="Confirmă parola"
                value={passwordConfirmation}
                onChange={(event) => setPasswordConfirmation(event.target.value)}
                minLength={8}
                required
              />
            </label>
          ) : null}

          {isRegister ? (
            <fieldset className="auth-accessibility-field" disabled={!credentialsComplete}>
              <legend>Cum vrei să fie adaptată harta?</legend>
              <div className="auth-profile-options">
                {[
                  {
                    value: "WHEELCHAIR" as const,
                    label: "Scaun rulant",
                    detail: "Rute fără trepte",
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
                    label: "Deficiență de vedere",
                    detail: "Informații mai clare",
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
                        {selected ? "✓" : ""}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="auth-accessibility-help">
                {credentialsComplete
                  ? "Vom adapta recomandările hărții la alegerea ta."
                  : "Completează câmpurile de mai sus pentru a putea alege."}
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
                Accept termenii de utilizare și <span className="auth-policy-link">politica de confidențialitate</span>.
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

          <button className="auth-button auth-button--primary auth-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Se procesează..." : isRegister ? "Înregistrează-te" : "Conectare"}
          </button>

          {!isRegister ? (
            <p className="auth-forgot">
              Ai uitat parola?{" "}
              <button className="auth-inline-button" type="button" onClick={handlePasswordReset}>
                Resetează
              </button>
            </p>
          ) : null}

          <p className="auth-switch">
            {isRegister ? "Ai deja un cont?" : "Nu ai cont?"}{" "}
            {isRegister ? (
              <Link to="/conectare" search={reportSearch}>
                Conectează-te
              </Link>
            ) : (
              <Link to="/inregistrare" search={reportSearch}>
                Înregistrează-te
              </Link>
            )}
          </p>
        </form>
      </section>
    </AuthLayout>
  );
}
