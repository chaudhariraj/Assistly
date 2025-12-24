import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

export interface ChatResponse {
  success: boolean;
  response: string;
  threadId: string;
}

export interface AuthStatus {
  success: boolean;
  authenticated: boolean;
  user: {
    email: string;
    name: string;
    picture?: string;
  } | null;
}

export const checkAuthStatus = async (): Promise<AuthStatus> => {
  const response = await api.get<AuthStatus>('/api/auth/status');
  return response.data;
};

export const getProfile = async () => {
  try {
    const response = await api.get('/api/auth/profile');
    return response.data;
  } catch (error: any) {
    console.error('Error fetching profile:', error);
    // Return a safe default structure
    return {
      success: false,
      user: null,
      error: error?.response?.data?.message || 'Failed to fetch profile'
    };
  }
};

export const sendChatMessage = async (
  message: string,
  threadId?: string
): Promise<ChatResponse> => {
  const response = await api.post<ChatResponse>('/api/chat', {
    message,
    threadId: threadId || 'default',
  });
  return response.data;
};

export const logout = async () => {
  const response = await api.post('/api/auth/logout');
  return response.data;
};

export const initiateGoogleAuth = () => {
  window.location.href = `${API_BASE_URL}/api/auth/google`;
};

export interface NotificationResponse {
  success: boolean;
  meetings: Array<{
    id: string;
    summary: string;
    start: string;
    meetingLink?: string;
  }>;
  count: number;
}

export const getNotifications = async (): Promise<NotificationResponse> => {
  const response = await api.get<NotificationResponse>('/api/notifications/meetings');
  return response.data;
};

export default api;

