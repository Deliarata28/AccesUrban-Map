import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Mail, MessageSquare, Reply, Search } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { ErrorPopup } from "../../components/ErrorPopup";
import {
  markContactMessageRead,
  replyToContactMessage,
  type ContactMessage,
} from "../../services/contactMessagesApi";
import { normalizeSearch } from "../../utils/accessibility";
import { EmptyState, formatDate } from "./AdminShared";
import "./MessagesManager.css";

const statusLabels: Record<ContactMessage["status"], string> = {
  New: "Nou",
  Read: "Citit",
  Replied: "Răspuns trimis",
};

export function MessagesManager({ messages }: { messages: ContactMessage[] }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ContactMessage | null>(null);
  const [reply, setReply] = useState("");
  const [notice, setNotice] = useState("");
  const queryClient = useQueryClient();
  const readMutation = useMutation({
    mutationFn: markContactMessageRead,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["contact-messages"] }),
  });
  const replyMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: string }) => replyToContactMessage(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["contact-messages"] });
      setSelected(null);
      setReply("");
      setNotice("Răspunsul a fost trimis prin e-mail.");
    },
  });
  const filtered = messages.filter((message) =>
    normalizeSearch(`${message.name} ${message.email} ${message.subject} ${message.message}`).includes(
      normalizeSearch(search),
    ),
  );

  const openMessage = (message: ContactMessage) => {
    setSelected(message);
    setReply("");
    readMutation.reset();
    replyMutation.reset();
    if (message.status === "New") readMutation.mutate(message.id);
  };

  return (
    <>
      <div className="section-heading messages-heading">
        <div>
          <h2>Mesajele utilizatorilor</h2>
          <p>Răspunde direct oamenilor care trimit întrebări și sugestii din pagina de contact.</p>
        </div>
        <span className="pending-label">{messages.filter((message) => message.status === "New").length} noi</span>
      </div>
      {notice && <p className="admin-notice" role="status">{notice}</p>}
      <Card className="admin-panel messages-panel">
        <div className="admin-filters">
          <div className="search-control">
            <Search size={17} />
            <Input
              aria-label="Caută mesaje"
              placeholder="Caută după nume, email sau subiect…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>
        <div className="messages-list">
          {filtered.map((message) => (
            <button
              type="button"
              className={`message-row ${message.status === "New" ? "is-new" : ""}`}
              key={message.id}
              onClick={() => openMessage(message)}
            >
              <span className="message-row-icon"><MessageSquare size={19} /></span>
              <span className="message-row-copy">
                <strong>{message.subject}</strong>
                <span>{message.name} · {message.email}</span>
                <small>{message.message}</small>
              </span>
              <span className="message-row-meta">
                <span className={`message-status message-status-${message.status.toLowerCase()}`}>{statusLabels[message.status]}</span>
                <small>{formatDate(message.createdAt)}</small>
              </span>
            </button>
          ))}
        </div>
        {!filtered.length && (
          <EmptyState title={messages.length ? "Niciun mesaj pentru această căutare" : "Nu există mesaje încă"}>
            Mesajele trimise de utilizatori vor apărea aici și pot fi gestionate de administrator.
          </EmptyState>
        )}
      </Card>

      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent className="admin-dialog message-dialog">
          <DialogHeader>
            <DialogTitle>{selected?.subject}</DialogTitle>
            <DialogDescription>
              {selected?.name} · {selected?.email} · {selected && formatDate(selected.createdAt)}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="message-detail">
              <div className="message-detail-status">
                <span className={`message-status message-status-${selected.status.toLowerCase()}`}>{statusLabels[selected.status]}</span>
                <a href={`mailto:${selected.email}`}><Mail size={15} /> {selected.email}</a>
              </div>
              <p className="message-detail-body">{selected.message}</p>
              {selected.lastReply && (
                <div className="message-previous-reply">
                  <strong>Ultimul răspuns trimis</strong>
                  <p>{selected.lastReply}</p>
                </div>
              )}
              <div className="messages-reply-field">
                <Label htmlFor="contact-reply">Răspuns</Label>
                <Textarea
                  id="contact-reply"
                  rows={6}
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                  placeholder="Scrie răspunsul pentru utilizator…"
                />
              </div>
              {replyMutation.error && <ErrorPopup error={replyMutation.error} />}
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSelected(null)} disabled={replyMutation.isPending}>
              Închide
            </Button>
            <Button
              type="button"
              disabled={!reply.trim() || replyMutation.isPending}
              onClick={() => selected && replyMutation.mutate({ id: selected.id, body: reply.trim() })}
            >
              <Reply />
              {replyMutation.isPending ? "Se trimite…" : "Trimite răspunsul"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
