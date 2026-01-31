import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { api } from '../../services/apiClient';
import { API_ENDPOINTS } from '../../config/api';
import { chatService } from '../../services/chatService';
import { useAuth } from '../../contexts/AuthContext';

interface ChatSession {
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
  messages?: Array<{
    id: string;
    message: string;
    senderType: 'USER' | 'ADMIN' | 'SYSTEM';
    createdAt: string;
    isRead: boolean;
    imageUrl?: string;
    audioUrl?: string;
  }>;
}

const AdminChatSessionsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { token } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Connect to socket and listen for new messages
  useEffect(() => {
    if (!token) return;

    // Connect to socket if not connected
    if (!chatService.connected) {
      chatService.connect(token);
    }

    // Join all sessions for admin
    chatService.joinAllSessions();

    // Listen for new messages to update the list in real-time
    const unsubscribeNewMessage = chatService.onNewMessage(({ sessionId, message }) => {
      setSessions((prevSessions) => {
        // Find the session and update it
        const updatedSessions = prevSessions.map((session) => {
          if (session.id === sessionId) {
            // Add the new message to the session
            const updatedMessages = [
              ...(session.messages || []),
              {
                id: message.id,
                message: message.message || '',
                senderType: message.senderType as 'USER' | 'ADMIN' | 'SYSTEM',
                createdAt: message.createdAt,
                isRead: message.isRead || false,
              },
            ];
            return {
              ...session,
              lastMessageAt: message.createdAt,
              messages: updatedMessages,
            };
          }
          return session;
        });

        // Sort by lastMessageAt descending (most recent first)
        return updatedSessions.sort((a, b) => {
          const timeA = a.lastMessageAt
            ? new Date(a.lastMessageAt).getTime()
            : new Date(a.createdAt).getTime();
          const timeB = b.lastMessageAt
            ? new Date(b.lastMessageAt).getTime()
            : new Date(b.createdAt).getTime();
          return timeB - timeA;
        });
      });
    });

    return () => {
      unsubscribeNewMessage();
    };
  }, [token]);

  const loadSessions = async () => {
    try {
      // Get all sessions (not just OPEN) - sorted by last message time
      const response = await api.get<ChatSession[]>(API_ENDPOINTS.CHAT.SESSIONS + '/all', {
        params: {},
      });

      if (response.success && response.data) {
        const allSessions = Array.isArray(response.data) ? response.data : [];
        // Sort by lastMessageAt descending (most recent first)
        const sortedSessions = allSessions.sort((a, b) => {
          const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : new Date(a.createdAt).getTime();
          const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : new Date(b.createdAt).getTime();
          return timeB - timeA;
        });
        setSessions(sortedSessions);
      }
    } catch (error) {
      console.error('Error loading chat sessions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  // Reload when screen comes into focus - this ensures we get latest messages when returning from chat
  useFocusEffect(
    React.useCallback(() => {
      // Always reload when screen comes into focus to get latest messages
      loadSessions();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadSessions();
  };

  const formatTime = (dateString?: string | null) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      
      const diff = now.getTime() - date.getTime();
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      // If today, show time
      if (messageDate.getTime() === today.getTime()) {
        const hours12 = date.getHours() % 12 || 12;
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const ampm = date.getHours() >= 12 ? 'PM' : 'AM';
        return `${hours12}:${minutes} ${ampm}`;
      }
      
      // If yesterday
      if (days === 1) {
        return 'Yesterday';
      }
      
      // If this week
      if (days < 7) {
        const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return daysOfWeek[date.getDay()];
      }
      
      // Otherwise show date
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  const getUserName = (session: ChatSession) => {
    if (session.user?.firstName && session.user?.lastName) {
      return `${session.user.firstName} ${session.user.lastName}`;
    }
    return session.user?.email || 'Unknown User';
  };

  const getLastMessage = (session: ChatSession): { text: string; hasImage: boolean; hasAudio: boolean } => {
    if (session.messages && session.messages.length > 0) {
      // Sort messages by createdAt to get the most recent one
      const sortedMessages = [...session.messages].sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      const lastMsg = sortedMessages[0];
      const hasImage = !!lastMsg.imageUrl;
      const hasAudio = !!lastMsg.audioUrl;

      // Show indicator for media messages
      if (hasImage && !lastMsg.message) {
        return { text: 'Photo', hasImage: true, hasAudio: false };
      }
      if (hasAudio && !lastMsg.message) {
        return { text: 'Voice message', hasImage: false, hasAudio: true };
      }

      // Truncate long messages
      const message = lastMsg.message || '';
      const text = message.length > 50 ? message.substring(0, 50) + '...' : message;
      return { text: text || 'No message content', hasImage, hasAudio };
    }
    return { text: 'No messages yet', hasImage: false, hasAudio: false };
  };

  const getUnreadCount = (session: ChatSession) => {
    if (!session.messages) return 0;
    return session.messages.filter((msg) => !msg.isRead && msg.senderType === 'USER').length;
  };

  const handleSessionPress = (session: ChatSession) => {
    navigation.navigate('AdminChat' as never, { sessionId: session.id, userId: session.userId } as never);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Loading chats...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chats</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Chats List */}
      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const unreadCount = getUnreadCount(item);
          const lastMessage = getLastMessage(item);
          const time = formatTime(item.lastMessageAt || item.createdAt);

          return (
            <TouchableOpacity
              style={styles.chatItem}
              onPress={() => handleSessionPress(item)}
              activeOpacity={0.7}
            >
              {/* Avatar */}
              <View style={styles.avatarContainer}>
                {item.user?.imageUrl ? (
                  <View style={styles.avatarImage}>
                    {/* Image would go here - using placeholder for now */}
                    <Text style={styles.avatarText}>
                      {getUserName(item)
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {getUserName(item)
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)}
                    </Text>
                  </View>
                )}
              </View>

              {/* Chat Info */}
              <View style={styles.chatInfo}>
                <View style={styles.chatHeader}>
                  <Text style={styles.chatName} numberOfLines={1}>
                    {getUserName(item)}
                  </Text>
                  {time && (
                    <Text style={styles.chatTime}>{time}</Text>
                  )}
                </View>
                <View style={styles.chatFooter}>
                  <View style={styles.messagePreview}>
                    {lastMessage.hasImage && (
                      <Ionicons name="image" size={14} color={colors.textMuted} style={styles.messageIcon} />
                    )}
                    {lastMessage.hasAudio && (
                      <Ionicons name="mic" size={14} color={colors.textMuted} style={styles.messageIcon} />
                    )}
                    <Text style={styles.chatMessage} numberOfLines={1}>
                      {lastMessage.text}
                    </Text>
                  </View>
                  {unreadCount > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadText}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={64} color={colors.textMuted} />
            <Text style={styles.emptyText}>No chats yet</Text>
            <Text style={styles.emptySubtext}>When users start chatting, their conversations will appear here</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: colors.textSecondary,
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerRight: {
    width: 24,
  },
  listContent: {
    paddingBottom: 8,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.background,
  },
  chatInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  chatTime: {
    fontSize: 13,
    color: colors.textMuted,
    marginLeft: 8,
  },
  chatFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  messagePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  messageIcon: {
    marginRight: 4,
  },
  chatMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  unreadText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.background,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default AdminChatSessionsScreen;
