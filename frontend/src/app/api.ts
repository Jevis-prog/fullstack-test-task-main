import type { AlertItem, FileItem } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    cache: "no-store",
    ...options,
  });
  if (!response.ok) {
    throw new Error("Не удалось выполнить запрос");
  }
  return response.json() as Promise<T>;
}

export function getFiles() {
  return request<FileItem[]>("/files");
}

export function getAlerts() {
  return request<AlertItem[]>("/alerts");
}

export function createFile(title: string, file: File) {
  const formData = new FormData();
  formData.append("title", title);
  formData.append("file", file);
  return request<FileItem>("/files", { method: "POST", body: formData });
}

export function getDownloadUrl(fileId: string) {
  return `${API_URL}/files/${fileId}/download`;
}
