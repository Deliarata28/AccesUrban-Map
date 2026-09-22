import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Save, UserPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { ChoiceMenu } from "../../components/ChoiceMenu";
import { ErrorPopup } from "../../components/ErrorPopup";
import type { AppUser, AccessibilityProfile } from "../../stores/sessionStore";
import {
  createApiUser,
  updateApiUser,
  type ManagedUserInput,
} from "../../services/usersApi";
import { replaceCurrentUser } from "../../stores/sessionStore";

type AccountDraft = ManagedUserInput & {
  password: string;
  passwordConfirmation: string;
};

const accessibilityProfiles: { value: AccessibilityProfile; label: string }[] = [
  { value: "WHEELCHAIR", label: "Scaun rulant" },
  { value: "WALKING_AID", label: "Dispozitiv de mers" },
  { value: "VISUAL_IMPAIRMENT", label: "Deficiență de vedere" },
];

function newDraft(): AccountDraft {
  return {
    name: "",
    email: "",
    role: "USER",
    accessibilityProfile: "WHEELCHAIR",
    avatarUrl: null,
    password: "",
    passwordConfirmation: "",
  };
}

function draftFromUser(user: AppUser): AccountDraft {
  return {
    name: user.name,
    email: user.email,
    role: user.role,
    accessibilityProfile: user.accessibilityProfile,
    avatarUrl: user.avatarUrl,
    password: "",
    passwordConfirmation: "",
  };
}

export function AccountEditor({
  account,
  currentUserId,
  onClose,
  onSaved,
}: {
  account?: AppUser;
  currentUserId: string;
  onClose: () => void;
  onSaved: (account: AppUser) => void;
}) {
  const [draft, setDraft] = useState<AccountDraft>(() =>
    account ? draftFromUser(account) : newDraft(),
  );
  const [validationError, setValidationError] = useState("");
  const queryClient = useQueryClient();
  const isOwnAccount = account?.id === currentUserId;
  const mutation = useMutation({
    mutationFn: async () => {
      const input: ManagedUserInput = {
        name: draft.name,
        email: draft.email,
        role: draft.role,
        accessibilityProfile: draft.accessibilityProfile,
        avatarUrl: draft.avatarUrl,
      };

      return account
        ? updateApiUser(account.id, input)
        : createApiUser({ ...input, password: draft.password });
    },
    onSuccess: (savedAccount) => {
      void queryClient.invalidateQueries({ queryKey: ["users"] });
      if (savedAccount.id === currentUserId) replaceCurrentUser(savedAccount);
      onSaved(savedAccount);
    },
  });

  const set = <K extends keyof AccountDraft>(key: K, value: AccountDraft[K]) =>
    setDraft((previous) => ({ ...previous, [key]: value }));

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationError("");

    if (!account && draft.password.length < 8) {
      setValidationError("Parola trebuie să aibă cel puțin 8 caractere.");
      return;
    }

    if (!account && draft.password !== draft.passwordConfirmation) {
      setValidationError("Cele două parole nu coincid.");
      return;
    }

    mutation.mutate();
  };

  const error = validationError || (mutation.error instanceof Error ? mutation.error.message : "");

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !mutation.isPending) onClose();
      }}
    >
      <DialogContent className="account-editor admin-dialog">
        <DialogHeader>
          <DialogTitle>
            {account ? `Editează contul ${account.name}` : "Creează un cont"}
          </DialogTitle>
          <DialogDescription>
            {account
              ? "Actualizează datele contului. Parola se resetează separat."
              : "Alege datele de acces pe care le vei transmite utilizatorului."}
          </DialogDescription>
        </DialogHeader>
        <form className="admin-form" onSubmit={submit}>
          <div className="form-grid">
            <div className="field">
              <Label htmlFor="account-name">Nume</Label>
              <Input
                id="account-name"
                value={draft.name}
                onChange={(event) => set("name", event.target.value)}
                minLength={2}
                maxLength={160}
                required
                autoComplete="name"
              />
            </div>
            <div className="field">
              <Label htmlFor="account-email">Email</Label>
              <Input
                id="account-email"
                type="email"
                value={draft.email}
                onChange={(event) => set("email", event.target.value)}
                maxLength={320}
                required
                autoComplete="email"
              />
            </div>
          </div>
          <div className="form-grid">
            <div className="field">
              <Label htmlFor="account-role">Rol</Label>
              {isOwnAccount ? (
                <>
                  <Input id="account-role" value="Administrator" disabled />
                  <p className="form-hint">
                    Rolul propriului cont poate fi schimbat numai de un alt administrator.
                  </p>
                </>
              ) : (
                <ChoiceMenu
                  id="account-role"
                  value={draft.role}
                  ariaLabel="Alege rolul contului"
                  options={[
                    { value: "USER", label: "Utilizator" },
                    { value: "ADMIN", label: "Administrator" },
                  ]}
                  onChange={(value) => set("role", value as AccountDraft["role"])}
                />
              )}
            </div>
            <div className="field">
              <Label htmlFor="account-accessibility-profile">Profil de accesibilitate</Label>
              <ChoiceMenu
                id="account-accessibility-profile"
                value={draft.accessibilityProfile}
                ariaLabel="Alege profilul de accesibilitate"
                options={accessibilityProfiles}
                onChange={(value) =>
                  set("accessibilityProfile", value as AccessibilityProfile)
                }
              />
            </div>
          </div>
          <div className="field">
            <Label htmlFor="account-avatar">Adresă fotografie profil (opțional)</Label>
            <Input
              id="account-avatar"
              type="url"
              value={draft.avatarUrl ?? ""}
              onChange={(event) => set("avatarUrl", event.target.value || null)}
              maxLength={2048}
              placeholder="https://exemplu.md/fotografie.jpg"
            />
          </div>
          {!account && (
            <div className="form-grid">
              <div className="field">
                <Label htmlFor="account-password">Parolă temporară</Label>
                <Input
                  id="account-password"
                  type="password"
                  value={draft.password}
                  onChange={(event) => set("password", event.target.value)}
                  minLength={8}
                  maxLength={100}
                  required
                  autoComplete="new-password"
                />
              </div>
              <div className="field">
                <Label htmlFor="account-password-confirmation">Confirmă parola</Label>
                <Input
                  id="account-password-confirmation"
                  type="password"
                  value={draft.passwordConfirmation}
                  onChange={(event) => set("passwordConfirmation", event.target.value)}
                  minLength={8}
                  maxLength={100}
                  required
                  autoComplete="new-password"
                />
              </div>
            </div>
          )}
          {!account && (
            <p className="form-hint">
              Parola nu va fi afișată din nou și este păstrată în bază doar ca hash securizat.
            </p>
          )}
          <ErrorPopup message={error || null} error={mutation.error} />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={mutation.isPending}
            >
              Anulează
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {account ? <Save /> : <UserPlus />}
              {mutation.isPending
                ? "Se salvează…"
                : account
                  ? "Salvează modificările"
                  : "Creează contul"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
