import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '../config/api';
import { api } from './apiClient';
import { API_ENDPOINTS } from '../config/api';

export interface ChatMessage {
  id: string;
  sessionId: string;
  userId: string;
  senderType: 'USER' | 'ADMIN' | 'SYSTEM';
  message: string;
  imageUrl?: string | null;  // Optional image attachment
  audioUrl?: string | null;  // Optional voice note attachment
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
  user?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    imageUrl: string | null;
    role: string;
  };
}

export interface ChatSession {
  id: string;
  userId: string;
  adminId?: string | null;
  status: 'OPEN' | 'CLOSED' | 'WAITING';
  lastMessageAt?: string | null;
  createdAt: string;
  user?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    imageUrl: string | null;
  };
  admin?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    imageUrl: string | null;
  };
}

class ChatService {
  private socket: Socket | null = null;
  private token: string | null = null;
  private isConnected: boolean = false;
  private currentSessionId: string | null = null;

  /**
   * Initialize socket connection with authentication
   */
  connect(token: string) {
    if (this.socket?.connected) {
      console.log('Socket already connected');
      return;
    }

    this.token = token;
    
    // Get base URL without /api - handle both localhost and production
    let baseUrl = API_BASE_URL.replace('/api', '');
    
    // For production Render.com, ensure we use https
    if (baseUrl.includes('render.com')) {
      baseUrl = baseUrl.replace('http://', 'https://');
    }
    
    console.log('Connecting to socket:', baseUrl);

    this.socket = io(baseUrl, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      auth: {
        token,
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id);
      this.isConnected = true;

      // Join user's sessions
      this.socket?.emit('join-sessions');

      // Rejoin current session if we were in one (handles reconnection)
      if (this.currentSessionId) {
        this.socket?.emit('join-session', { sessionId: this.currentSessionId });
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.isConnected = false;
    });

    this.socket.on('sessions-joined', (data: { count: number }) => {
      console.log('Joined sessions:', data.count);
    });

    this.socket.on('error', (error: { message: string }) => {
      console.error('Socket error:', error);
    });
  }

  /**
   * Disconnect socket
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.currentSessionId = null;
    }
  }

  /**
   * Get or create a chat session
   */
  async getOrCreateSession(): Promise<ChatSession> {
    const response = await api.get<ChatSession>(API_ENDPOINTS.CHAT.SESSION);
    if (response.success && response.data) {
      return response.data;
    }
    console.error('Failed to get or create session. Response:', JSON.stringify(response, null, 2));
    throw new Error(response.message || 'Failed to get or create session');
  }

  /**
   * Get messages for a session
   */
  async getMessages(sessionId: string, page: number = 1, limit: number = 50) {
    try {
      const endpoint = API_ENDPOINTS.CHAT.MESSAGES(sessionId);
      const response = await api.get<{ messages: ChatMessage[]; pagination: any }>(endpoint, {
        params: { page, limit },
      });
      if (response.success && response.data) {
        return response.data;
      }
      console.error('Failed to get messages. Response:', JSON.stringify(response, null, 2));
      throw new Error(response.message || 'Failed to get messages');
    } catch (error: any) {
      // If endpoint doesn't exist (404), return empty messages array
      // Messages will be loaded via socket events instead
      if (error?.status === 404) {
        console.warn(`Messages endpoint not found for session ${sessionId}. Using socket events for messages.`);
        return { messages: [], pagination: { page: 1, limit, total: 0 } };
      }
      throw error;
    }
  }

  /**
   * Send a message
   */
  async sendMessage(sessionId: string, message: string, imageUrl?: string, audioUrl?: string): Promise<ChatMessage> {
    // Send via API first
    const response = await api.post<ChatMessage>(API_ENDPOINTS.CHAT.MESSAGE, {
      sessionId,
      message,
      imageUrl,
      audioUrl,
    });
    
    if (response.success && response.data) {
      return response.data;
    }
    console.error('Failed to send message. Response:', JSON.stringify(response, null, 2));
    throw new Error(response.message || 'Failed to send message');
  }

  /**
   * Join a specific session room
   */
  joinSession(sessionId: string) {
    this.currentSessionId = sessionId;
    if (!this.socket || !this.isConnected) {
      console.warn('Socket not connected, cannot join session');
      return;
    }
    this.socket.emit('join-session', { sessionId });
  }

  /**
   * Join all sessions (for admin)
   */
  joinAllSessions() {
    if (!this.socket || !this.isConnected) {
      console.warn('Socket not connected, cannot join sessions');
      return;
    }
    this.socket.emit('join-sessions');
  }

  /**
   * Leave current session
   */
  leaveSession() {
    this.currentSessionId = null;
  }

  /**
   * Send message via socket (real-time)
   */
  sendMessageSocket(sessionId: string, message: string, imageUrl?: string, audioUrl?: string) {
    if (!this.socket || !this.isConnected) {
      console.warn('Socket not connected, cannot send message');
      return;
    }
    this.socket.emit('send-message', { sessionId, message, imageUrl, audioUrl });
  }

  /**
   * Mark messages as read
   */
  async markAsRead(sessionId: string) {
    const endpoint = API_ENDPOINTS.CHAT.READ(sessionId);
    await api.post(endpoint);
    
    // Also emit via socket
    if (this.socket && this.isConnected) {
      this.socket.emit('mark-read', { sessionId });
    }
  }

  /**
   * Send typing indicator
   */
  sendTyping(sessionId: string, isTyping: boolean) {
    if (!this.socket || !this.isConnected) {
      return;
    }
    this.socket.emit('typing', { sessionId, isTyping });
  }

  /**
   * Listen for new messages
   */
  onNewMessage(callback: (data: { sessionId: string; message: ChatMessage }) => void) {
    if (!this.socket) return () => {};
    
    this.socket.on('new-message', callback);
    
    return () => {
      this.socket?.off('new-message', callback);
    };
  }

  /**
   * Listen for typing indicators
   */
  onTyping(callback: (data: { sessionId: string; userId: string; isTyping: boolean }) => void) {
    if (!this.socket) return () => {};
    
    this.socket.on('user-typing', callback);
    
    return () => {
      this.socket?.off('user-typing', callback);
    };
  }

  /**
   * Listen for messages read
   */
  onMessagesRead(callback: (data: { sessionId: string; userId: string }) => void) {
    if (!this.socket) return () => {};

    this.socket.on('messages-read', callback);

    return () => {
      this.socket?.off('messages-read', callback);
    };
  }

  /**
   * Listen for real-time balance updates
   */
  onBalanceUpdated(callback: (data: { userId: string; accountBalance: string }) => void) {
    if (!this.socket) return () => {};

    this.socket.on('balance-updated', callback);

    return () => {
      this.socket?.off('balance-updated', callback);
    };
  }

  /**
   * Get unread count
   */
  async getUnreadCount(): Promise<number> {
    const response = await api.get<{ count: number }>(API_ENDPOINTS.CHAT.UNREAD);
    if (response.success && response.data) {
      return response.data.count || 0;
    }
    return 0;
  }

  /**
   * Check if socket is connected
   */
  get connected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }
}

export const chatService = new ChatService();
