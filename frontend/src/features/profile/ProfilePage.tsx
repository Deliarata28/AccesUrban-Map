import { useEffect, useState, type FormEvent } from "react";
import { Check, Mail, MapPinned, ShieldCheck, UserRound } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Footer } from "../../components/Footer";
import { Header } from "../../components/Header";
import {
  type AccessibilityProfile,
  updateMockUser,
} from "../../stores/authStore";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import "./ProfilePage.css";

const profileOptions: Array<{
  value: AccessibilityProfile;
  label: string;
  description: string;
}> = [
  {
    value: "WHEELCHAIR",
    label: "Scaun rulant",
    description: "Prioritizează rutele fără scări, rampe și trotuare accesibile.",
  },
  {
    value: "WALKING_AID",
    label: "Dispozitiv de mers",
    description: "Ține cont de pante, trepte și suprafețe dificile.",
  },
  {
    value: "VISUAL_IMPAIRMENT",
    label: "Deficiență de vedere",
    description: "Pregătește suport pentru semnale audio și pavaj tactil.",
  },
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ro-RO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

export function ProfilePage() {
  const user = useCurrentUser();
  const [name, setName] = useState(() => user?.name ?? "");
  const [accessibilityProfile, setAccessibilityProfile] = useState<AccessibilityProfile>(
    () => user?.accessibilityProfile ?? "WHEELCHAIR",
  );
  const [avatarUrl, setAvatarUrl] = useState<string | null>(() => user?.avatarUrl ?? null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    setName(user?.name ?? "");
    setAccessibilityProfile(user?.accessibilityProfile ?? "WHEELCHAIR");
    setAvatarUrl(user?.avatarUrl ?? null);
  }, [user]);

  const handleAvatarChange = async (file: File | undefined) => {
    setFeedback(null);

    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setFeedback("Alege un fișier imagine valid.");
      return;
    }

    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = "";
      bytes.forEach((byte) => {
        binary += String.fromCharCode(byte);
      });
      setAvatarUrl(`data:${file.type};base64,${btoa(binary)}`);
    } catch {
      setFeedback("Nu am putut citi imaginea aleasă.");
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);

    try {
      const updatedUser = updateMockUser({ name, accessibilityProfile, avatarUrl });
      setName(updatedUser.name);
      setAccessibilityProfile(updatedUser.accessibilityProfile);
      setAvatarUrl(updatedUser.avatarUrl);
      setFeedback("Profilul tău a fost salvat.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Nu am putut salva profilul.");
    }
  };

  return (
    <div className="site-shell profile-shell">
      <a className="skip-link" href="#continut">
        Sari la conținut
      </a>
      <Header />

      <main id="continut" className="profile-main">
        {user ? (
          <section className="profile-layout" aria-labelledby="profile-title">
            <div className="profile-heading">
              <div>
                <p className="profile-eyebrow">Contul meu</p>
                <h1 id="profile-title">Bine ai venit, {user.name}!</h1>
                <p className="profile-lead">
                  Alege profilul potrivit pentru ca recomandările de traseu să țină cont de nevoile tale.
                </p>
              </div>
              <Link className="profile-map-link" to="/rapoartele-mele">Rapoartele mele</Link>
              <Link className="profile-map-link" to="/map">
                <MapPinned size={17} aria-hidden="true" />
                Deschide harta
              </Link>
            </div>

            <div className="profile-grid">
              <form className="profile-card profile-card--details" onSubmit={handleSubmit}>
                <div className="profile-card-heading">
                  <span className="profile-icon"><UserRound size={20} aria-hidden="true" /></span>
                  <div>
                    <h2>Date personale</h2>
                    <p>Gestionează numele și imaginea contului tău.</p>
                  </div>
                </div>

                <div className="profile-avatar-editor">
                  <div className="profile-avatar" aria-hidden={avatarUrl ? undefined : true}>
                    {avatarUrl ? <img src={avatarUrl} alt={`Imaginea de profil a lui ${user.name}`} /> : <UserRound size={28} />}
                  </div>
                  <div className="profile-avatar-copy">
                    <strong>Imagine de profil</strong>
                    <div className="profile-avatar-actions">
                      <label className="profile-upload-button">
                        Alege imagine
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={(event) => handleAvatarChange(event.target.files?.[0])}
                        />
                      </label>
                      {avatarUrl ? (
                        <button className="profile-remove-button" type="button" onClick={() => setAvatarUrl(null)}>
                          Elimină
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>

                <label className="profile-field">
                  <span>Nume complet</span>
                  <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" />
                </label>

                <div className="profile-readonly-field">
                  <span>Adresă de email</span>
                  <strong><Mail size={16} aria-hidden="true" />{user.email}</strong>
                </div>

                <div className="profile-readonly-field">
                  <span>Membru din</span>
                  <strong>{formatDate(user.createdAt)}</strong>
                </div>

                <button className="profile-save" type="submit">
                  Salvează modificările
                </button>
                {feedback ? <p className="profile-feedback" role="status">{feedback}</p> : null}
              </form>

              <section className="profile-card profile-card--accessibility" aria-labelledby="accessibility-title">
                <div className="profile-card-heading">
                  <span className="profile-icon"><ShieldCheck size={20} aria-hidden="true" /></span>
                  <div>
                    <h2 id="accessibility-title">Profil de accesibilitate</h2>
                    <p>Va fi folosit pentru evaluarea traseelor recomandate.</p>
                  </div>
                </div>

                <div className="profile-options" role="radiogroup" aria-label="Profil de accesibilitate">
                  {profileOptions.map((option) => (
                    <label className={`profile-option${accessibilityProfile === option.value ? " is-selected" : ""}`} key={option.value}>
                      <input
                        type="radio"
                        name="accessibilityProfile"
                        value={option.value}
                        checked={accessibilityProfile === option.value}
                        onChange={() => setAccessibilityProfile(option.value)}
                      />
                      <span className="profile-option-check"><Check size={14} aria-hidden="true" /></span>
                      <span className="profile-option-copy">
                        <strong>{option.label}</strong>
                        <small>{option.description}</small>
                      </span>
                    </label>
                  ))}
                </div>
              </section>
            </div>

          </section>
        ) : (
          <section className="profile-guest" aria-labelledby="profile-guest-title">
            <span className="profile-icon"><UserRound size={23} aria-hidden="true" /></span>
            <h1 id="profile-guest-title">Conectează-te pentru a vedea profilul</h1>
            <p>Profilul de accesibilitate te ajută să primești recomandări potrivite pentru fiecare traseu.</p>
            <Link className="profile-map-link profile-map-link--primary" to="/conectare">Conectare</Link>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
