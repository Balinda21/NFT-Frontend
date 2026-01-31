import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/apiClient';
import { API_ENDPOINTS } from '../../config/api';
import AdminSidebar from '../../components/admin/AdminSidebar';

const { width } = Dimensions.get('window');

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalTransactions: number;
  pendingTransactions: number;
  totalOrders: number;
  activeOrders: number;
  totalLoans: number;
  pendingLoans: number;
  totalRevenue: number;
  todayRevenue: number;
  openChatSessions: number;
  unreadMessages: number;
}

interface ActivityItem {
  id: string;
  type: string;
  description: string;
  userId?: string;
  userName?: string;
  createdAt: string;
}

const AdminDashboardScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const loadDashboardData = async () => {
    try {
      // Fetch dashboard stats and activity from backend
      const [statsResponse, activityResponse] = await Promise.all([
        api.get(API_ENDPOINTS.ADMIN.STATS),
        api.get(API_ENDPOINTS.ADMIN.ACTIVITY, { params: { limit: 10 } }),
      ]);

      if (statsResponse.success && statsResponse.data) {
        const data = statsResponse.data;
        setStats({
          totalUsers: data.users?.total || 0,
          activeUsers: data.users?.active || 0,
          totalTransactions: data.transactions?.total || 0,
          pendingTransactions: data.transactions?.pending || 0,
          totalOrders: data.orders?.total || 0,
          activeOrders: data.orders?.active || 0,
          totalLoans: data.loans?.total || 0,
          pendingLoans: data.loans?.active || 0,
          totalRevenue: parseFloat(data.revenue?.total) || 0,
          todayRevenue: parseFloat(data.transactions?.volume24h) || 0,
          openChatSessions: data.chat?.openSessions || 0,
          unreadMessages: data.chat?.unreadMessages || 0,
        });
      }

      if (activityResponse.success && activityResponse.data) {
        // Transform activity data
        const activityData: ActivityItem[] = [];
        const data = activityResponse.data;

        // Add recent users
        if (data.recentUsers) {
          data.recentUsers.forEach((user: any) => {
            activityData.push({
              id: `user-${user.id}`,
              type: 'user',
              description: 'New user registered',
              userId: user.id,
              userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
              createdAt: user.createdAt,
            });
          });
        }

        // Sort by date and take top 10
        activityData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setActivity(activityData.slice(0, 10));
      }

      // Animate in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    } catch (error) {
      // Set defaults on error
      setStats({
        totalUsers: 0,
        activeUsers: 0,
        totalTransactions: 0,
        pendingTransactions: 0,
        totalOrders: 0,
        activeOrders: 0,
        totalLoans: 0,
        pendingLoans: 0,
        totalRevenue: 0,
        todayRevenue: 0,
        openChatSessions: 0,
        unreadMessages: 0,
      });
      setActivity([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const StatCard = React.memo(({
    title,
    value,
    icon,
    color,
    onPress,
    index,
  }: {
    title: string;
    value: string | number;
    icon: string;
    color: string;
    onPress?: () => void;
    index?: number;
  }) => {
    const cardAnim = useRef(new Animated.Value(0)).current;
    
    useEffect(() => {
      Animated.timing(cardAnim, {
        toValue: 1,
        duration: 400,
        delay: (index || 0) * 50,
        useNativeDriver: true,
      }).start();
    }, [index]);

    return (
      <Animated.View
        style={{
          opacity: cardAnim,
          transform: [
            {
              translateY: cardAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }),
            },
          ],
        }}
      >
        <TouchableOpacity
          style={styles.statCard}
          onPress={onPress}
          activeOpacity={onPress ? 0.7 : 1}
        >
          <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
            <Ionicons name={icon as any} size={28} color={color} />
          </View>
          <Text style={styles.statValue}>
            {typeof value === 'number' ? (value || 0).toLocaleString() : (value || '0')}
          </Text>
          <Text style={styles.statTitle}>{title}</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const dashboardStats = stats || {
    totalUsers: 0,
    activeUsers: 0,
    totalTransactions: 0,
    pendingTransactions: 0,
    totalOrders: 0,
    activeOrders: 0,
    totalLoans: 0,
    pendingLoans: 0,
    totalRevenue: 0,
    todayRevenue: 0,
    openChatSessions: 0,
    unreadMessages: 0,
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Sidebar */}
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <View style={styles.mainContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => setSidebarOpen(true)}
            style={styles.menuButton}
          >
            <Ionicons name="menu" size={28} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Admin Dashboard</Text>
            <Text style={styles.headerSubtitle}>
              Welcome back, {user?.firstName || 'Admin'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={async () => {
              await logout();
            }}
          >
            <Ionicons name="log-out-outline" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={true}
          scrollEnabled={true}
          bounces={true}
        >
          {/* Welcome Section with Revenue Cards */}
          <View style={styles.welcomeSection}>
            <View style={styles.welcomeHeader}>
              <Text style={styles.welcomeGreeting}>
                Hey {user?.firstName || 'Admin'}! 👋
              </Text>
              <Text style={styles.welcomeSubtext}>Here's your dashboard overview</Text>
            </View>
            
            {/* Revenue Cards */}
            <View style={styles.revenueSection}>
              <View style={[styles.revenueCard, styles.revenueCardPrimary]}>
                <View style={styles.revenueHeader}>
                  <Ionicons name="trending-up" size={24} color={colors.accent} />
                  <Text style={styles.revenueLabel}>Total Revenue</Text>
                </View>
                <Text style={styles.revenueValue}>
                  ${(dashboardStats.totalRevenue || 0).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
                <View style={styles.revenueFooter}>
                  <Ionicons name="calendar" size={14} color={colors.textMuted} />
                  <Text style={styles.revenueSubtext}>All time</Text>
                </View>
              </View>
              <View style={styles.revenueCard}>
                <View style={styles.revenueHeader}>
                  <Ionicons name="today" size={24} color={colors.accent} />
                  <Text style={styles.revenueLabel}>Today's Revenue</Text>
                </View>
                <Text style={styles.revenueValue}>
                  ${(dashboardStats.todayRevenue || 0).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
                <View style={styles.revenueFooter}>
                  <Ionicons name="time" size={14} color={colors.textMuted} />
                  <Text style={styles.revenueSubtext}>Last 24 hours</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Stats Grid */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Overview</Text>
            
            {/* Prominent Chat Card - Full Width */}
            <TouchableOpacity
              style={styles.prominentChatCard}
              onPress={() => navigation.navigate('AdminChatSessions' as never)}
              activeOpacity={0.8}
            >
              <View style={styles.prominentChatContent}>
                <View style={styles.prominentChatLeft}>
                  <View style={styles.prominentChatIconContainer}>
                    <Ionicons name="chatbubbles" size={40} color={colors.accent} />
                  </View>
                  <View style={styles.prominentChatTextContainer}>
                    <Text style={styles.prominentChatTitle}>Chat Support</Text>
                    <Text style={styles.prominentChatSubtitle}>
                      {dashboardStats.openChatSessions} open chats • {dashboardStats.unreadMessages} unread messages
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={24} color={colors.accent} />
              </View>
            </TouchableOpacity>

            <View style={styles.statsGrid}>
              <StatCard
                title="Total Users"
                value={dashboardStats.totalUsers}
                icon="people"
                color="#4A90E2"
                index={0}
                onPress={() => navigation.navigate('AdminUsers' as never)}
              />
              <StatCard
                title="Active Users"
                value={dashboardStats.activeUsers}
                icon="people-circle"
                color="#50C878"
                index={1}
                onPress={() => navigation.navigate('AdminUsers' as never)}
              />
              <StatCard
                title="Transactions"
                value={dashboardStats.totalTransactions}
                icon="swap-horizontal"
                color="#FF6B35"
                index={2}
              />
              <StatCard
                title="Pending"
                value={dashboardStats.pendingTransactions}
                icon="time"
                color="#FFD700"
                index={3}
              />
              <StatCard
                title="Total Orders"
                value={dashboardStats.totalOrders}
                icon="cart"
                color="#9B59B6"
                index={4}
              />
              <StatCard
                title="Active Orders"
                value={dashboardStats.activeOrders}
                icon="flash"
                color="#3498DB"
                index={5}
              />
              <StatCard
                title="Total Loans"
                value={dashboardStats.totalLoans}
                icon="card"
                color="#E74C3C"
                index={6}
              />
              <StatCard
                title="Pending Loans"
                value={dashboardStats.pendingLoans}
                icon="hourglass"
                color="#F39C12"
                index={7}
              />
              <StatCard
                title="Open Chats"
                value={dashboardStats.openChatSessions}
                icon="chatbubbles"
                color="#00D4AA"
                index={8}
                onPress={() => navigation.navigate('AdminChatSessions' as never)}
              />
              <StatCard
                title="Unread Messages"
                value={dashboardStats.unreadMessages}
                icon="mail-unread"
                color="#FF6B9D"
                index={9}
                onPress={() => navigation.navigate('AdminChatSessions' as never)}
              />
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actionsGrid}>
              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => navigation.navigate('AdminChatSessions' as never)}
              >
                <View style={[styles.actionIconContainer, { backgroundColor: colors.accent + '20' }]}>
                  <Ionicons name="chatbubbles" size={28} color={colors.accent} />
                </View>
                <Text style={styles.actionText}>Chats</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => navigation.navigate('AdminUsers' as never)}
              >
                <View style={[styles.actionIconContainer, { backgroundColor: '#4A90E2' + '20' }]}>
                  <Ionicons name="people" size={28} color="#4A90E2" />
                </View>
                <Text style={styles.actionText}>Users</Text>
              </TouchableOpacity>
              <View style={[styles.actionCard, styles.actionCardDisabled]}>
                <View style={[styles.actionIconContainer, { backgroundColor: '#FF6B35' + '20' }]}>
                  <Ionicons name="swap-horizontal" size={28} color="#FF6B35" />
                </View>
                <Text style={styles.actionText}>Transactions</Text>
                <Text style={styles.actionComingSoon}>Coming Soon</Text>
              </View>
              <View style={[styles.actionCard, styles.actionCardDisabled]}>
                <View style={[styles.actionIconContainer, { backgroundColor: '#9B59B6' + '20' }]}>
                  <Ionicons name="cart" size={28} color="#9B59B6" />
                </View>
                <Text style={styles.actionText}>Orders</Text>
                <Text style={styles.actionComingSoon}>Coming Soon</Text>
              </View>
            </View>
          </View>

          {/* Recent Activity */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            {activity.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="time-outline" size={48} color={colors.textMuted} />
                <Text style={styles.emptyText}>No recent activity</Text>
              </View>
            ) : (
              <View style={styles.activityList}>
                {activity.map((item) => (
                  <View key={item.id} style={styles.activityItem}>
                    <View style={styles.activityIcon}>
                      <Ionicons name="ellipse" size={8} color={colors.accent} />
                    </View>
                    <View style={styles.activityContent}>
                      <Text style={styles.activityDescription}>{item.description}</Text>
                      {item.userName && (
                        <Text style={styles.activityUser}>{item.userName}</Text>
                      )}
                      <Text style={styles.activityTime}>
                        {new Date(item.createdAt).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  mainContent: {
    flex: 1,
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuButton: {
    padding: 8,
    marginRight: 12,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  logoutButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.danger + '20',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
    flexGrow: 1,
  },
  welcomeSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  welcomeHeader: {
    marginBottom: 16,
  },
  welcomeGreeting: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  welcomeSubtext: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  revenueSection: {
    flexDirection: 'row',
    gap: 12,
  },
  revenueCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 140,
  },
  revenueCardPrimary: {
    borderColor: colors.accent,
    borderWidth: 2,
  },
  revenueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  revenueLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  revenueValue: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.accent,
    marginBottom: 8,
  },
  revenueFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  revenueSubtext: {
    fontSize: 12,
    color: colors.textMuted,
  },
  quickChatCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: colors.accent,
    borderRadius: 16,
    padding: 16,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  quickChatContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickChatIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background + '30',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  quickChatText: {
    flex: 1,
  },
  quickChatTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.background,
    marginBottom: 4,
  },
  quickChatSubtitle: {
    fontSize: 12,
    color: colors.background + 'CC',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
    marginTop: 12,
  },
  prominentChatCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: colors.accent + '40',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  prominentChatContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  prominentChatLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  prominentChatIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.accent + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  prominentChatTextContainer: {
    flex: 1,
  },
  prominentChatTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  prominentChatSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  statCard: {
    width: (width - 48) / 2,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 140,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  actionCard: {
    width: (width - 48) / 2,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 120,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  actionText: {
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: '600',
    textAlign: 'center',
  },
  actionCardDisabled: {
    opacity: 0.6,
  },
  actionComingSoon: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 4,
  },
  activityList: {
    backgroundColor: colors.card,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  activityItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  activityIcon: {
    marginRight: 12,
    marginTop: 4,
  },
  activityContent: {
    flex: 1,
  },
  activityDescription: {
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 4,
    fontWeight: '500',
  },
  activityUser: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 11,
    color: colors.textMuted,
  },
  emptyState: {
    padding: 48,
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 12,
  },
});

export default AdminDashboardScreen;
