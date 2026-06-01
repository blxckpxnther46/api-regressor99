const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api/v1";

type ApiResponse<TData> = {
  data: TData;
  meta: Record<string, unknown>;
  error: null | {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
};

export async function apiGet<TData>(path: string) {
  const response = await fetch(`${apiBaseUrl}${path}`);
  const payload = (await response.json()) as ApiResponse<TData>;

  if (!response.ok || payload.error) {
    throw new Error(payload.error?.message ?? "API request failed.");
  }

  return payload.data;
}

export async function apiPost<TData>(
  path: string,
  body: Record<string, unknown> = {}
) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const payload = (await response.json()) as ApiResponse<TData>;

  if (!response.ok || payload.error) {
    throw new Error(payload.error?.message ?? "API request failed.");
  }

  return payload.data;
}

