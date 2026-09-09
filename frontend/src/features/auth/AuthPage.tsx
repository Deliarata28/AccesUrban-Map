import { useState } from "react";
import { ArrowLeft, ArrowRight, Eye, EyeOff } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Header } from "../../components/Header";
import accessibilityLogo from "../../assets/accessurban-accessibility-logo-clean.png";
import "./AuthPage.css";
import {Footer} from "../../components/Footer";

export function AuthPage() {
  return (
    <div className="site-shell auth-shell">
      <a className="skip-link" href="#continut">
        Sari la conținut
      </a>

      <Header />

      <main id="continut" className="auth-main">
        <section className="auth-welcome" aria-labelledby="auth-title">
          <div className="auth-card auth-card--welcome">
            <div className="auth-brand" aria-label="AccesUrban Map">
              <span className="auth-brand-mark">
                <img src={accessibilityLogo} alt="" aria-hidden="true" />
              </span>
              <span className="auth-brand-name">
                <strong>AccesUrban Map</strong>
                <small>Chișinău fără bariere</small>
              </span>
            </div>

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
      </main>
      <Footer />
    </div>
  );
}

type AuthFormProps = {
  mode: "login" | "register";
};

export function AuthFormPage({ mode }: AuthFormProps) {
  const isRegister = mode === "register";
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="site-shell auth-shell">
      <a className="skip-link" href="#continut">
        Sari la conținut
      </a>

      <Header />

      <main id="continut" className="auth-main auth-main--form">
        <section className="auth-form-layout" aria-labelledby="auth-form-title">
          <form className={`auth-card auth-card--form${isRegister ? " auth-card--register" : ""}`} onSubmit={(event) => event.preventDefault()}>
            <Link className="auth-back" to="/autentificare" aria-label="Înapoi la opțiunile contului">
              <ArrowLeft size={27} strokeWidth={1.8} aria-hidden="true" />
            </Link>

            <div className="auth-brand" aria-label="AccesUrban Map">
              <span className="auth-brand-mark">
                <img src={accessibilityLogo} alt="" aria-hidden="true" />
              </span>
              <span className="auth-brand-name">
                <strong>AccesUrban Map</strong>
                <small>Chișinău fără bariere</small>
              </span>
            </div>

            <h1 id="auth-form-title">{isRegister ? "Creează-ți contul" : "Bine ai revenit!"}</h1>

            {isRegister ? (
              <label className="auth-field">
                <span>Nume complet</span>
                <input type="text" name="name" autoComplete="name" placeholder="Nume complet" required />
              </label>
            ) : null}

            <label className="auth-field">
              <span>Adresă de email</span>
              <input type="email" name="email" autoComplete="email" placeholder="Email" required />
            </label>

            <label className="auth-field auth-field--password">
              <span>Parolă</span>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete={isRegister ? "new-password" : "current-password"}
                placeholder="Parolă"
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
                <input type={showPassword ? "text" : "password"} name="passwordConfirmation" autoComplete="new-password" placeholder="Confirmă parola" minLength={8} required />
              </label>
            ) : null}

            {isRegister ? (
              <label className="auth-check auth-check--terms">
                <input type="checkbox" name="terms" required />
                <span>
                  Accept termenii de utilizare și <span className="auth-policy-link">politica de confidențialitate</span>.
                </span>
              </label>
            ) : null}

            <button className="auth-button auth-button--primary auth-submit" type="submit">
              {isRegister ? "Înregistrează-te" : "Conectare"}
            </button>

            {!isRegister ? (
              <p className="auth-forgot">Ai uitat parola? <button className="auth-inline-button" type="button">Resetează</button></p>
            ) : null}

            <p className="auth-switch">
              {isRegister ? "Ai deja un cont?" : "Nu ai cont?"}{" "}
              <Link to={isRegister ? "/conectare" : "/inregistrare"}>
                {isRegister ? "Conectează-te" : "Înregistrează-te"}
              </Link>
            </p>
          </form>
        </section>
      </main>
      <Footer />
    </div>
  );
}
