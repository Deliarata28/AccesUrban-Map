import { apiRequest } from "./apiClient";

export type ContactMessageStatus = "New" | "Read" | "Replied";

export type ContactMessage = {
  id: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: ContactMessageStatus;
  lastReply: string | null;
  createdAt: string;
  readAt: string | null;
  repliedAt: string | null;
  notificationSent: boolean;
};

export type ContactMessageInput = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

export async function createContactMessage(input: ContactMessageInput) {
  return apiRequest<ContactMessage>("/contact-messages", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function getContactMessages() {
  return apiRequest<ContactMessage[]>("/contact-messages");
}

export async function markContactMessageRead(id: number) {
  return apiRequest<ContactMessage>(`/contact-messages/${id}/read`, { method: "PUT" });
}

export async function replyToContactMessage(id: number, message: string) {
  return apiRequest<ContactMessage>(`/contact-messages/${id}/reply`, {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}
