import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { api } from '../../services/apiClient';
import { API_ENDPOINTS } from '../../config/api';

interface User {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  role: string;
  isActive: boolean;
  isVerified: boolean;
  accountBalance: number;
  createdAt: string;
  lastLoginAt: string | null;
  _count: {
    transactions: number;
    orders: number;
    loans: number;
  };
}

const AdminUsersScreen: React.FC = () => {
  const navigation = useNavigation();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Balance edit modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editBalance, setEditBalance] = useState('');
  const [updating, setUpdating] = useState(false);

  const loadUsers = async (pageNum: number = 1, search: string = '') => {
    try {
      const params: any = {
        page: pageNum,
        limit: 20,
      };

      if (search) {
        params.search = search;
      }

      const response = await api.get<{ users: User[]; pagination: any }>(
        API_ENDPOINTS.ADMIN.USERS,
        { params }
      );

      if (response.success && response.data) {
        if (pageNum === 1) {
          setUsers(response.data.users || []);
        } else {
          setUsers((prev) => [...prev, ...(response.data.users || [])]);
        }
        setTotalPages(response.data.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadUsers(1, searchQuery);
  }, [searchQuery]);

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    loadUsers(1, searchQuery);
  };

  const loadMore = () => {
    if (page < totalPages && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadUsers(nextPage, searchQuery);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'Invalid date';
    }
  };

  const getUserDisplayName = (user: User) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.firstName || user.lastName || user.email || 'Unknown User';
  };

  const getUserInitials = (user: User) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user.firstName) {
      return user.firstName[0].toUpperCase();
    }
    if (user.lastName) {
      return user.lastName[0].toUpperCase();
    }
    if (user.email) {
      return user.email[0].toUpperCase();
    }
    return 'U';
  };

  const openBalanceModal = (user: User) => {
    setSelectedUser(user);
    setEditBalance((user.accountBalance || 0).toString());
    setEditModalVisible(true);
  };

  const handleUpdateBalance = async () => {
    if (!selectedUser) return;

    const newBalance = parseFloat(editBalance);
    if (isNaN(newBalance) || newBalance < 0) {
      Alert.alert('Error', 'Please enter a valid positive number');
      return;
    }

    setUpdating(true);
    try {
      const response = await api.put(
        API_ENDPOINTS.ADMIN.UPDATE_USER(selectedUser.id),
        { accountBalance: newBalance }
      );

      if (response.success) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === selectedUser.id ? { ...u, accountBalance: newBalance } : u
          )
        );
        setEditModalVisible(false);
        Alert.alert('Success', 'Balance updated successfully');
      } else {
        Alert.alert('Error', response.message || 'Failed to update balance');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update balance');
    } finally {
      setUpdating(false);
    }
  };

  if (loading && users.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Users</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Loading users...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Users</Text>
        <View style={styles.backButton} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search users by name or email..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
            <Ionicons name="close-circle" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onScrollEndDrag={() => {
          if (page < totalPages) {
            loadMore();
          }
        }}
      >
        {users.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color={colors.textMuted} />
            <Text style={styles.emptyText}>No users found</Text>
            {searchQuery && (
              <Text style={styles.emptySubtext}>Try a different search term</Text>
            )}
          </View>
        ) : (
          <>
            {users.map((user) => (
              <TouchableOpacity
                key={user.id}
                style={styles.userCard}
                activeOpacity={0.7}
                onPress={() => {
                  // Navigate to user detail if needed
                  // navigation.navigate('AdminUserDetail', { userId: user.id });
                }}
              >
                <View style={styles.userCardHeader}>
                  <View style={styles.avatarContainer}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{getUserInitials(user)}</Text>
                    </View>
                    <View style={[styles.statusDot, user.isActive && styles.statusDotActive]} />
                  </View>
                  <View style={styles.userInfo}>
                    <View style={styles.userNameRow}>
                      <Text style={styles.userName} numberOfLines={1}>
                        {getUserDisplayName(user)}
                      </Text>
                      {user.role === 'ADMIN' && (
                        <View style={styles.roleBadge}>
                          <Text style={styles.roleBadgeText}>ADMIN</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.userEmail} numberOfLines={1}>
                      {user.email || 'No email'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                </View>

                <View style={styles.userStats}>
                  <View style={styles.statItem}>
                    <Ionicons name="swap-horizontal" size={16} color={colors.textMuted} />
                    <Text style={styles.statText}>{user._count.transactions || 0}</Text>
                    <Text style={styles.statLabel}>Transactions</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Ionicons name="cart" size={16} color={colors.textMuted} />
                    <Text style={styles.statText}>{user._count.orders || 0}</Text>
                    <Text style={styles.statLabel}>Orders</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Ionicons name="card" size={16} color={colors.textMuted} />
                    <Text style={styles.statText}>{user._count.loans || 0}</Text>
                    <Text style={styles.statLabel}>Loans</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.statItem, styles.balanceStatItem]}
                    onPress={() => openBalanceModal(user)}
                  >
                    <Ionicons name="wallet" size={16} color={colors.accent} />
                    <Text style={[styles.statText, styles.balanceText]}>
                      ${(user.accountBalance || 0).toLocaleString()}
                    </Text>
                    <Text style={styles.statLabel}>Balance (tap to edit)</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.userFooter}>
                  <View style={styles.footerItem}>
                    <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
                    <Text style={styles.footerText}>
                      Joined {formatDate(user.createdAt)}
                    </Text>
                  </View>
                  {user.lastLoginAt && (
                    <View style={styles.footerItem}>
                      <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                      <Text style={styles.footerText}>
                        Last login {formatDate(user.lastLoginAt)}
                      </Text>
                    </View>
                  )}
                  {!user.isVerified && (
                    <View style={styles.unverifiedBadge}>
                      <Text style={styles.unverifiedText}>Unverified</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}

            {page < totalPages && (
              <View style={styles.loadMoreContainer}>
                <TouchableOpacity onPress={loadMore} style={styles.loadMoreButton}>
                  <Text style={styles.loadMoreText}>Load More</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Balance Edit Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Balance</Text>
              <TouchableOpacity
                onPress={() => setEditModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {selectedUser && (
              <View style={styles.modalUserInfo}>
                <View style={styles.modalAvatar}>
                  <Text style={styles.modalAvatarText}>
                    {getUserInitials(selectedUser)}
                  </Text>
                </View>
                <Text style={styles.modalUserName}>
                  {getUserDisplayName(selectedUser)}
                </Text>
                <Text style={styles.modalUserEmail}>{selectedUser.email}</Text>
              </View>
            )}

            <View style={styles.modalInputContainer}>
              <Text style={styles.modalInputLabel}>New Balance (USD)</Text>
              <View style={styles.modalInputWrapper}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editBalance}
                  onChangeText={setEditBalance}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
                  autoFocus
                />
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveButton, updating && styles.modalSaveButtonDisabled]}
                onPress={handleUpdateBalance}
                disabled={updating}
              >
                {updating ? (
                  <ActivityIndicator size="small" color={colors.background} />
                ) : (
                  <Text style={styles.modalSaveText}>Update Balance</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 4,
    width: 32,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    color: colors.textPrimary,
    fontSize: 15,
  },
  clearButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
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
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
  },
  userCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  userCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.background,
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.textMuted,
    borderWidth: 2,
    borderColor: colors.card,
  },
  statusDotActive: {
    backgroundColor: '#50C878',
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginRight: 8,
  },
  roleBadge: {
    backgroundColor: colors.accent + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.accent,
  },
  userEmail: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  userStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 4,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  userFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  unverifiedBadge: {
    backgroundColor: colors.danger + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 'auto',
  },
  unverifiedText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.danger,
  },
  loadMoreContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  loadMoreButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent,
  },
  balanceStatItem: {
    backgroundColor: colors.accent + '10',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  balanceText: {
    color: colors.accent,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalUserInfo: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  modalAvatarText: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.background,
  },
  modalUserName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  modalUserEmail: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  modalInputContainer: {
    marginBottom: 24,
  },
  modalInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  modalInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.accent,
    marginRight: 8,
  },
  modalInput: {
    flex: 1,
    height: 56,
    fontSize: 24,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modalSaveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: colors.accent,
  },
  modalSaveButtonDisabled: {
    opacity: 0.6,
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background,
  },
});

export default AdminUsersScreen;





