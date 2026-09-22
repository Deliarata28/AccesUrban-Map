import { apiRequest } from "./apiClient";

export async function uploadImage(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return apiRequest<{ url: string }>("/photos/upload", {
    method: "POST",
    body: formData,
  });
}

export async function attachPhoto(input: {
  placeId?: number;
  reportId?: number;
  url: string;
}) {
  return apiRequest<{ id: number; url: string }>("/photos", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
