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

// AI Data API (bot_instances)
export const aiDataAPI = {
  getAll: () =>
    apiRequest("/api/ai-data", {
      headers: getAuthHeaders(),
    }),

  getById: (id: number) =>
    apiRequest(`/api/ai-data/${id}`, {
      headers: getAuthHeaders(),
    }),

  getByInstance: (instanceNumber: string) =>
    apiRequest(`/api/ai-data/instance/${instanceNumber}`, {
      headers: getAuthHeaders(),
    }),

  create: (data: Partial<BotInstanceConfig>) =>
    apiRequest("/api/ai-data", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }),

  update: (id: number, data: Partial<BotInstanceConfig>) =>
    apiRequest(`/api/ai-data/${id}`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    apiRequest(`/api/ai-data/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
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

// WhatsApp API
export const whatsappAPI = {
  sendMessage: (data: { instanceNumber: string; recipientNumber: string; text: string }) =>
    apiRequest("/api/whatsapp/send-message", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }),

  sendMedia: (data: { 
    instanceNumber: string; 
    recipientNumber: string; 
    type: string; 
    file: string; 
    text?: string; 
    docName?: string 
  }) =>
    apiRequest("/api/whatsapp/send-media", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }),

  // Message actions
  markRead: (data: { instanceNumber: string; messageIds: string[] }) =>
    apiRequest("/api/whatsapp/mark-read", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }),

  react: (data: { instanceNumber: string; number: string; text: string; id: string }) =>
    apiRequest("/api/whatsapp/react", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }),

  delete: (data: { instanceNumber: string; id: string }) =>
    apiRequest("/api/whatsapp/delete", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }),

  presence: (data: { instanceNumber: string; number: string; presence: string; delay?: number }) =>
    apiRequest("/api/whatsapp/presence", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }),

  // Chat actions
  archiveChat: (data: { instanceNumber: string; number: string; archive: boolean }) =>
    apiRequest("/api/whatsapp/chat/archive", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }),

  pinChat: (data: { instanceNumber: string; number: string; pin: boolean }) =>
    apiRequest("/api/whatsapp/chat/pin", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }),

  readChat: (data: { instanceNumber: string; number: string; read: boolean }) =>
    apiRequest("/api/whatsapp/chat/read", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }),

  checkNumbers: (data: { instanceNumber: string; numbers: string[] }) =>
    apiRequest("/api/whatsapp/chat/check", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }),

  // Instance info
  getStatus: (instanceNumber: string) =>
    apiRequest(`/api/whatsapp/instance/status/${instanceNumber}`, {
      headers: getAuthHeaders(),
    }),

  // Token management
  getInstanceToken: (instanceNumber: string) =>
    apiRequest(`/api/uazapi/instances/${instanceNumber}`, {
      headers: getAuthHeaders(),
    }),

  saveInstanceToken: (data: { instanceNumber: string; apiToken: string }) =>
    apiRequest("/api/uazapi/instances", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }),

  deleteInstanceToken: (instanceNumber: string) =>
    apiRequest(`/api/uazapi/instances/${instanceNumber}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    }),
};

// Contact Status API
export const contactStatusAPI = {
  // Get all contacts for an instance
  getContacts: (instanceNumber: string) =>
    apiRequest(`/api/instances/${instanceNumber}/contacts`, {
      headers: getAuthHeaders(),
    }),

  // Get contact statistics
  getStats: (instanceNumber: string) =>
    apiRequest(`/api/instances/${instanceNumber}/contacts/stats`, {
      headers: getAuthHeaders(),
    }),

  // Get contacts by status
  getByStatus: (instanceNumber: string, status: 'active' | 'paused' | 'inactive') =>
    apiRequest(`/api/instances/${instanceNumber}/contacts/${status}`, {
      headers: getAuthHeaders(),
    }),

  // Pause a contact
  pauseContact: (instanceNumber: string, contactJid: string, data: { duration?: number; reason?: string }) =>
    apiRequest(`/api/instances/${instanceNumber}/contacts/${encodeURIComponent(contactJid)}/pause`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }),

  // Resume a contact
  resumeContact: (instanceNumber: string, contactJid: string) =>
    apiRequest(`/api/instances/${instanceNumber}/contacts/${encodeURIComponent(contactJid)}/resume`, {
      method: "POST",
      headers: getAuthHeaders(),
    }),

  // Deactivate a contact
  deactivateContact: (instanceNumber: string, contactJid: string, data?: { duration?: number; reason?: string }) =>
    apiRequest(`/api/instances/${instanceNumber}/contacts/${encodeURIComponent(contactJid)}/deactivate`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data || {}),
    }),

  // Activate a contact
  activateContact: (instanceNumber: string, contactJid: string) =>
    apiRequest(`/api/instances/${instanceNumber}/contacts/${encodeURIComponent(contactJid)}/activate`, {
      method: "POST",
      headers: getAuthHeaders(),
    }),
};

// N8N Workflows API
export const n8nWorkflowsAPI = {
  // Get all workflows for an instance
  getWorkflows: (instanceNumber: string) =>
    apiRequest(`/api/instances/${instanceNumber}/workflows`, {
      headers: getAuthHeaders(),
    }),

  // Get only active workflows
  getActiveWorkflows: (instanceNumber: string) =>
    apiRequest(`/api/instances/${instanceNumber}/workflows/active`, {
      headers: getAuthHeaders(),
    }),

  // Get a specific workflow
  getWorkflow: (instanceNumber: string, workflowId: string) =>
    apiRequest(`/api/instances/${instanceNumber}/workflows/${workflowId}`, {
      headers: getAuthHeaders(),
    }),

  // Create a new workflow association
  createWorkflow: (instanceNumber: string, data: any) =>
    apiRequest(`/api/instances/${instanceNumber}/workflows`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }),

  // Update a workflow
  updateWorkflow: (instanceNumber: string, workflowId: string, data: any) =>
    apiRequest(`/api/instances/${instanceNumber}/workflows/${workflowId}`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }),

  // Delete a workflow
  deleteWorkflow: (instanceNumber: string, workflowId: string) =>
    apiRequest(`/api/instances/${instanceNumber}/workflows/${workflowId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    }),

  // Toggle workflow active/inactive status
  toggleWorkflow: (instanceNumber: string, workflowId: string) =>
    apiRequest(`/api/instances/${instanceNumber}/workflows/${workflowId}/toggle`, {
      method: "POST",
      headers: getAuthHeaders(),
    }),

  // Manually trigger a workflow
  triggerWorkflow: (instanceNumber: string, workflowId: string, payload?: any) =>
    apiRequest(`/api/instances/${instanceNumber}/workflows/${workflowId}/trigger`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ payload: payload || {} }),
    }),
};
