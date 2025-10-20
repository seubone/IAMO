import { QueryClient, QueryFunction } from "@tanstack/react-query";

interface ApiError extends Error {
  status: number;
  statusText: string;
  response?: {
    status: number;
    statusText: string;
  };
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorMessage: string;
    try {
      const contentType = res.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        const json = await res.json();
        errorMessage = json.error || json.message || res.statusText;
      } else {
        errorMessage = (await res.text()) || res.statusText;
      }
    } catch {
      errorMessage = res.statusText;
    }

    const error = new Error(`${res.status}: ${errorMessage}`) as ApiError;
    error.status = res.status;
    error.statusText = res.statusText;
    // Adicionar response para compatibilidade com verificações de status
    error.response = {
      status: res.status,
      statusText: res.statusText,
    };
    throw error;
  }
}

export async function apiRequest<T = any>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
      ...options?.headers,
    },
    credentials: "include",
  });

  await throwIfResNotOk(res);
  
  // 204 No Content has no body, return null
  if (res.status === 204) {
    return null as T;
  }
  
  // Melhor tratamento de JSON parsing
  try {
    return await res.json();
  } catch (error) {
    console.error("Failed to parse JSON response:", error);
    throw new Error("Resposta inválida do servidor");
  }
}

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("auth_token");
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
      headers: getAuthHeaders(),
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
