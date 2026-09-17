"use client";

export class ApiError extends Error {
  status: number;
  issues?: string[];
  constructor(message: string, status: number, issues?: string[]) {
    super(message);
    this.status = status;
    this.issues = issues;
  }
}

async function parseErrorResponse(res: Response): Promise<never> {
  let message = `Request failed with status ${res.status}.`;
  let issues: string[] | undefined;
  try {
    const body = await res.json();
    if (body?.error) message = body.error;
    if (Array.isArray(body?.issues)) issues = body.issues;
  } catch {
    // non-JSON error body; keep default message
  }
  throw new ApiError(message, res.status, issues);
}

export async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) await parseErrorResponse(res);
  return res.json();
}

export async function apiPost<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) await parseErrorResponse(res);
  return res.json();
}

export async function apiDelete<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "DELETE",
    credentials: "include",
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) await parseErrorResponse(res);
  return res.json();
}

export async function apiUpload<T>(url: string, formData: FormData): Promise<T> {
  const res = await fetch(url, { method: "POST", credentials: "include", body: formData });
  if (!res.ok) await parseErrorResponse(res);
  return res.json();
}
