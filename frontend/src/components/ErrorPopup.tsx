import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Check, Copy, X } from "lucide-react";
import { ApiError } from "../services/apiClient";
import "./ErrorPopup.css";

type Props = {
  message?: string | null;
  error?: unknown;
  traceId?: string | null;
  code?: string | null;
  title?: string;
  onRetry?: () => void;
};

export const getErrorMessage = (error: unknown, fallback = "A apărut o eroare.") =>
  error instanceof Error ? error.message : fallback;

export const getTraceId = (error: unknown) =>
  error instanceof ApiError ? error.traceId : undefined;

export const getErrorCode = (error: unknown) =>
  error instanceof ApiError ? error.code : undefined;

const errorTitles: Record<string, string> = {
  EMAIL_DELIVERY_FAILED: "E-mailul nu a putut fi trimis",
  SERVER_ERROR: "Acțiunea nu a putut fi finalizată",
  LOGIN_CODE_EXPIRED: "Codul de conectare a expirat",
  LOGIN_CODE_INVALID: "Codul de conectare nu este corect",
  LOGIN_CODE_LOCKED: "Codul de conectare a fost blocat",
  AUTH_VERIFICATION_INVALID: "Sesiunea de conectare nu mai este valabilă",
};

export function ErrorPopup({
  message,
  error,
  traceId,
  code,
  title = "A apărut o eroare",
  onRetry,
}: Props) {
  const resolvedMessage = message ?? (error ? getErrorMessage(error) : "");
  const resolvedTraceId = traceId ?? getTraceId(error);
  const resolvedCode = code ?? getErrorCode(error);
  const resolvedTitle = title === "A apărut o eroare" && resolvedCode
    ? errorTitles[resolvedCode] ?? title
    : title;
  const popupKey = [resolvedMessage, resolvedTraceId ?? "", resolvedCode ?? ""].join(":");
  const [open, setOpen] = useState(Boolean(resolvedMessage));
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setOpen(Boolean(resolvedMessage));
    setCopied(false);
  }, [popupKey, resolvedMessage]);

  if (!resolvedMessage || !open) return null;

  const copyTraceId = async () => {
    if (!resolvedTraceId) return;
    try {
      await navigator.clipboard.writeText(resolvedTraceId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const popup = (
    <aside className="error-popup" role="alertdialog" aria-live="assertive" aria-label={resolvedTitle}>
      <div className="error-popup-icon" aria-hidden="true">
        <AlertTriangle size={20} />
      </div>
      <div className="error-popup-content">
        <div className="error-popup-heading">
          <strong>{resolvedTitle}</strong>
          <button type="button" className="error-popup-close" onClick={() => setOpen(false)} aria-label="Închide eroarea">
            <X size={18} />
          </button>
        </div>
        <p>{resolvedMessage}</p>
        {resolvedTraceId && (
          <div className="error-popup-references">
            <div className="error-popup-id">
              <span>Trace ID</span>
              <code>{resolvedTraceId}</code>
            </div>
            <button type="button" className="error-popup-copy" onClick={() => void copyTraceId()} aria-label="Copiază Trace ID-ul" title="Copiază Trace ID-ul">
              {copied ? <Check size={15} /> : <Copy size={15} />}
            </button>
          </div>
        )}
        {onRetry ? (
          <button type="button" className="error-popup-retry" onClick={onRetry}>
            Încearcă din nou
          </button>
        ) : null}
      </div>
    </aside>
  );

  return typeof document === "undefined" ? popup : createPortal(popup, document.body);
}
