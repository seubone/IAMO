import { apiRequest } from "./queryClient";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role?: string;
}

export interface AuthResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  token: string;
}

// Auth API
export const auth = {
  login: (credentials: LoginCredentials) =>
    apiRequest<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    }),

  register: (data: RegisterData) =>
    apiRequest<AuthResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getMe: (token: string) =>
    apiRequest("/api/auth/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }),

  updateProfile: (data: { name?: string; avatar?: string; preferences?: any }) =>
    apiRequest("/api/auth/profile", {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }),

  updatePassword: (data: { currentPassword: string; newPassword: string }) =>
    apiRequest("/api/auth/password", {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }),
};

// Helper to get auth headers
export function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("auth_token");
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

// IA API
export const iaAPI = {
  getAll: () =>
    apiRequest("/api/ias", {
      headers: getAuthHeaders(),
    }),

  getById: (id: string) =>
    apiRequest(`/api/ias/${id}`, {
      headers: getAuthHeaders(),
    }),

  updateStatus: (id: string, status: string, reason: string) =>
    apiRequest(`/api/ias/${id}`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify({ status, reason }),
    }),
};

// Ticket API
export const ticketAPI = {
  getAll: () =>
    apiRequest("/api/tickets", {
      headers: getAuthHeaders(),
    }),

  getByIA: (iaId: string) =>
    apiRequest(`/api/tickets/ia/${iaId}`, {
      headers: getAuthHeaders(),
    }),

  updateStatus: (id: string, status: string) =>
    apiRequest(`/api/tickets/${id}`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify({ status }),
    }),
};

// Actions API
export const actionsAPI = {
  getAll: () =>
    apiRequest("/api/actions", {
      headers: getAuthHeaders(),
    }),

  getByIA: (iaId: string) =>
    apiRequest(`/api/actions/ia/${iaId}`, {
      headers: getAuthHeaders(),
    }),
};

// Conversation API
export const conversationAPI = {
  getAll: () =>
    apiRequest("/api/conversations", {
      headers: getAuthHeaders(),
    }),

  getByAttendanceId: (attendanceId: string) =>
    apiRequest(`/api/conversations/attendance/${attendanceId}`, {
      headers: getAuthHeaders(),
    }),

  create: (data: any) =>
    apiRequest("/api/conversations", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }),

  update: (id: string, data: any) =>
    apiRequest(`/api/conversations/${id}`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }),
};

// Message API
export const messageAPI = {
  getByConversation: (conversationId: string) =>
    apiRequest(`/api/messages/conversation/${conversationId}`, {
      headers: getAuthHeaders(),
    }),

  create: (data: any) =>
    apiRequest("/api/messages", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }),
};

// Metrics API
export const metricsAPI = {
  getByIA: (iaId: string) =>
    apiRequest(`/api/metrics/ia/${iaId}`, {
      headers: getAuthHeaders(),
    }),
};
