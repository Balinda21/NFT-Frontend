import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { api } from '../../services/apiClient';
import { API_ENDPOINTS } from '../../config/api';
import { chatService } from '../../services/chatService';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data: {
    userId: string;
    userName: string;
    userEmail: string;
    amount: number;
    fee: number;
    currency: string;
    network: string;
    walletAddress: string;
  } | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

const AdminNotificationsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = async () => {
    try {
      const response = await api.get(API_ENDPOINTS.ADMIN.NOTIFICATIONS, {
        params: { limit: 50 },
      });
      if (response.success && response.data) {
        setNotifications(response.data.notifications || []);
        setUnreadCount(response.data.unreadCount || 0);
      }
    } catch (error) {
      // silently fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [])
  );

  // Real-time: prepend new withdrawal notifications as they arrive
  useEffect(() => {
    const unsubscribe = chatService.onNewWithdrawal((data) => {
      const newNotif: Notification = {
        id: data.notificationId,
        type: 'WITHDRAWAL_REQUEST',
        title: 'New Withdrawal Request',
        message: `${data.user.name} (${data.user.email}) requested ${data.amount} ${data.currency} via ${data.network}`,
        data: {
          userId: data.user.id,
          userName: data.user.name,
          userEmail: data.user.email,
          amount: data.amount,
          fee: data.fee,
          currency: data.currency,
          network: data.network,
          walletAddress: data.walletAddress,
        },
        isRead: false,
        readAt: null,
        createdAt: data.createdAt,
      };
      setNotifications((prev) => [newNotif, ...prev]);
      setUnreadCount((prev) => prev + 1);
    });
    return () => unsubscribe();
  }, []);

  const handleMarkRead = async (id: string) => {
    try {
      await api.post(API_ENDPOINTS.ADMIN.NOTIFICATION_READ(id));
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      Alert.alert('Error', 'Could not mark notification as read.');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post(API_ENDPOINTS.ADMIN.NOTIFICATIONS_READ_ALL);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() })));
      setUnreadCount(0);
    } catch {
      Alert.alert('Error', 'Could not mark all notifications as read.');
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAllRead} style={styles.markAllButton}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadNotifications(); }} tintColor={colors.accent} />}
        contentContainerStyle={styles.scrollContent}
      >
        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="notifications-off-outline" size={56} color={colors.textMuted} />
            <Text style={styles.emptyText}>No notifications yet</Text>
          </View>
        ) : (
          notifications.map((notif) => (
            <TouchableOpacity
              key={notif.id}
              style={[styles.notifCard, !notif.isRead && styles.notifCardUnread]}
              onPress={() => !notif.isRead && handleMarkRead(notif.id)}
              activeOpacity={0.8}
            >
              {/* Unread indicator dot */}
              {!notif.isRead && <View style={styles.unreadDot} />}

              <View style={styles.notifIconContainer}>
                <Ionicons name="arrow-up-circle" size={32} color={colors.accent} />
              </View>

              <View style={styles.notifBody}>
                <View style={styles.notifTitleRow}>
                  <Text style={styles.notifTitle}>{notif.title}</Text>
                  <Text style={styles.notifTime}>{formatTime(notif.createdAt)}</Text>
                </View>

                {notif.data && (
                  <View style={styles.detailsGrid}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>User</Text>
                      <Text style={styles.detailValue}>{notif.data.userName || '—'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Email</Text>
                      <Text style={styles.detailValue}>{notif.data.userEmail}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Amount</Text>
                      <Text style={[styles.detailValue, styles.amountText]}>
                        {notif.data.amount} {notif.data.currency}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Fee (2%)</Text>
                      <Text style={styles.detailValue}>{notif.data.fee} {notif.data.currency}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Network</Text>
                      <View style={styles.networkBadge}>
                        <Text style={styles.networkBadgeText}>{notif.data.network}</Text>
                      </View>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Wallet</Text>
                      <Text style={styles.walletAddress} numberOfLines={1}>
                        {notif.data.walletAddress}
                      </Text>
                    </View>
                  </View>
                )}

                {!notif.isRead && (
                  <Text style={styles.tapToRead}>Tap to mark as read</Text>
                )}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: { padding: 8, marginRight: 8 },
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  headerBadge: {
    backgroundColor: colors.danger,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.accent + '20',
  },
  markAllText: { fontSize: 12, fontWeight: '600', color: colors.accent },
  scrollContent: { padding: 16, paddingBottom: 32 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyText: { marginTop: 12, color: colors.textMuted, fontSize: 14 },
  notifCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    position: 'relative',
  },
  notifCardUnread: {
    borderColor: colors.accent + '50',
    backgroundColor: colors.accent + '08',
  },
  unreadDot: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  notifIconContainer: {
    marginRight: 14,
    marginTop: 2,
  },
  notifBody: { flex: 1 },
  notifTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  notifTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, flex: 1 },
  notifTime: { fontSize: 11, color: colors.textMuted, marginLeft: 8 },
  detailsGrid: {
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 10,
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: { fontSize: 12, color: colors.textMuted, width: 60 },
  detailValue: { fontSize: 12, color: colors.textPrimary, fontWeight: '500', flex: 1, textAlign: 'right' },
  amountText: { color: colors.accent, fontWeight: '700', fontSize: 14 },
  networkBadge: {
    backgroundColor: colors.accent + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  networkBadgeText: { fontSize: 11, color: colors.accent, fontWeight: '600' },
  walletAddress: {
    fontSize: 11,
    color: colors.textSecondary,
    flex: 1,
    textAlign: 'right',
    fontFamily: 'monospace',
  },
  tapToRead: {
    marginTop: 8,
    fontSize: 11,
    color: colors.accent,
    fontStyle: 'italic',
  },
});

export default AdminNotificationsScreen;
