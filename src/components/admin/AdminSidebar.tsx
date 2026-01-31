import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useAuth } from '../../contexts/AuthContext';

interface SidebarItem {
  id: string;
  label: string;
  icon: string;
  screen: string;
  badge?: number;
}

const AdminSidebar: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const navigation = useNavigation();
  const route = useRoute();
  const { user, logout } = useAuth();
  
  // Animation values
  const slideAnim = useRef(new Animated.Value(-280)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Show sidebar and animate in
      setVisible(true);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Animate out, then hide
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -280,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Only hide after animation completes
        setVisible(false);
      });
    }
  }, [isOpen]);

  const menuItems: SidebarItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: 'grid-outline', screen: 'AdminDashboard' },
    { id: 'chat', label: 'Chats', icon: 'chatbubbles-outline', screen: 'AdminChatSessions' },
    { id: 'users', label: 'Users', icon: 'people-outline', screen: 'AdminUsers' },
    // TODO: Add these screens when implemented
    // { id: 'transactions', label: 'Transactions', icon: 'swap-horizontal-outline', screen: 'AdminTransactions' },
    // { id: 'orders', label: 'Orders', icon: 'cart-outline', screen: 'AdminOrders' },
    // { id: 'loans', label: 'Loans', icon: 'card-outline', screen: 'AdminLoans' },
    // { id: 'referrals', label: 'Referrals', icon: 'gift-outline', screen: 'AdminReferrals' },
  ];

  const handleNavigate = (screen: string) => {
    navigation.navigate(screen as never);
    onClose();
  };

  const handleLogout = async () => {
    await logout();
    onClose();
  };

  if (!visible) return null;

  return (
    <View style={styles.overlay} pointerEvents={isOpen ? 'auto' : 'none'}>
      <Animated.View
        style={[
          styles.backdrop,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
      </Animated.View>
      <Animated.View
        style={[
          styles.sidebar,
          {
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.firstName?.[0] || 'A'}
                {user?.lastName?.[0] || 'D'}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName} numberOfLines={1}>
                {user?.firstName && user?.lastName
                  ? `${user.firstName} ${user.lastName}`
                  : user?.firstName || user?.lastName || user?.email || 'Admin'}
              </Text>
              {user?.email && (
                <Text style={styles.userEmail} numberOfLines={1}>
                  {user.email}
                </Text>
              )}
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.menuContainer}>
          {menuItems.map((item) => {
            const isActive = route.name === item.screen;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.menuItem, isActive && styles.menuItemActive]}
                onPress={() => handleNavigate(item.screen)}
              >
                <View style={[styles.menuIconContainer, isActive && styles.menuIconContainerActive]}>
                  <Ionicons
                    name={item.icon as any}
                    size={22}
                    color={isActive ? colors.accent : colors.textSecondary}
                  />
                </View>
                <Text style={[styles.menuLabel, isActive && styles.menuLabelActive]}>
                  {item.label}
                </Text>
                {item.badge && item.badge > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.badge > 99 ? '99+' : item.badge}</Text>
                  </View>
                )}
                {isActive && <View style={styles.activeIndicator} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={colors.danger} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    flexDirection: 'row',
    elevation: 1000,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sidebar: {
    width: 280,
    backgroundColor: colors.card,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    flex: 1,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0, // Allows flex children to shrink
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.background,
  },
  userInfo: {
    flex: 1,
    minWidth: 0, // Allows text to truncate properly
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
    flexShrink: 1,
  },
  userEmail: {
    fontSize: 12,
    color: colors.textSecondary,
    flexShrink: 1,
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
  },
  menuContainer: {
    flex: 1,
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    position: 'relative',
  },
  menuItemActive: {
    backgroundColor: colors.accent + '10',
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuIconContainerActive: {
    backgroundColor: colors.accent + '20',
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textSecondary,
    flex: 1,
  },
  menuLabelActive: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  badge: {
    backgroundColor: colors.danger,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.background,
  },
  activeIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: colors.accent,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.danger + '10',
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.danger,
    marginLeft: 8,
  },
});

export default AdminSidebar;

