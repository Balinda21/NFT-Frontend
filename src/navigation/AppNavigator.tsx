import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { colors } from '../theme/colors';

// Import screens
import HomeScreen from '../screens/HomeScreen';
import AccountScreen from '../screens/AccountScreen';
import ChatScreen from '../screens/ChatScreen';
import ContactUsScreen from '../screens/ContactUsScreen';
import InviteFriendsScreen from '../screens/InviteFriendsScreen';
import AboutUsScreen from '../screens/AboutUsScreen';
import FAQScreen from '../screens/FAQScreen';
import OptionTradingScreen from '../screens/OptionTradingScreen';
import ContractTradingScreen from '../screens/ContractTradingScreen';
import ChartScreen from '../screens/ChartScreen';
import MarketScreen from '../screens/MarketScreen';
import LoanScreen from '../screens/LoanScreen';
import AIQuantificationScreen from '../screens/AIQuantificationScreen';

// Import admin navigator
import AdminNavigator from './AdminNavigator';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Main app stack for regular users
function MainStack() {
  return (
    <Stack.Navigator
      // @ts-expect-error - React Navigation v7 type issue: id and initialRouteName conflict in nested navigators
      id="MainStack"
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Account" component={AccountScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="ContactUs" component={ContactUsScreen} />
      <Stack.Screen name="InviteFriends" component={InviteFriendsScreen} />
      <Stack.Screen name="AboutUs" component={AboutUsScreen} />
      <Stack.Screen name="FAQ" component={FAQScreen} />
      <Stack.Screen name="OptionTrading" component={OptionTradingScreen} />
      <Stack.Screen name="ContractTrading" component={ContractTradingScreen} />
      <Stack.Screen name="Chart" component={ChartScreen} />
      <Stack.Screen name="Market" component={MarketScreen} />
      <Stack.Screen name="Loan" component={LoanScreen} />
      <Stack.Screen name="AIQuantification" component={AIQuantificationScreen} />
    </Stack.Navigator>
  );
}

// Account stack - same screens but starts at Account
function AccountStack() {
  return (
    <Stack.Navigator
      // @ts-expect-error - React Navigation v7 type issue: id and initialRouteName conflict in nested navigators
      id="AccountStack"
      initialRouteName="Account"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Account" component={AccountScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="ContactUs" component={ContactUsScreen} />
      <Stack.Screen name="InviteFriends" component={InviteFriendsScreen} />
      <Stack.Screen name="AboutUs" component={AboutUsScreen} />
      <Stack.Screen name="FAQ" component={FAQScreen} />
      <Stack.Screen name="OptionTrading" component={OptionTradingScreen} />
      <Stack.Screen name="ContractTrading" component={ContractTradingScreen} />
      <Stack.Screen name="Chart" component={ChartScreen} />
      <Stack.Screen name="Market" component={MarketScreen} />
      <Stack.Screen name="Loan" component={LoanScreen} />
      <Stack.Screen name="AIQuantification" component={AIQuantificationScreen} />
    </Stack.Navigator>
  );
}

// Tab navigator for regular users
function MainTabNavigator() {
  return (
    <Tab.Navigator
      // @ts-expect-error - React Navigation v7 type issue: id required for nested navigators but conflicts with initialRouteName
      id="MainTabNavigator"
      initialRouteName="HomeTab"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={MainStack}
        options={({ route }) => {
          const routeName = getFocusedRouteNameFromRoute(route) ?? 'Home';
          const hideTabBar = ['Chat', 'ContactUs'].includes(routeName);
          return {
            tabBarLabel: 'Home',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home" size={size} color={color} />
            ),
            tabBarStyle: hideTabBar ? { display: 'none' } : {
              backgroundColor: colors.card,
              borderTopColor: colors.border,
            },
          };
        }}
      />
      <Tab.Screen
        name="MarketTab"
        component={MarketScreen}
        options={{
          tabBarLabel: 'Market',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="trending-up" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="AIQuantificationTab"
        component={AIQuantificationScreen}
        options={{
          tabBarLabel: 'AI Quantification',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="LoanTab"
        component={LoanScreen}
        options={{
          tabBarLabel: 'Loan',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cash" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="AccountTab"
        component={AccountStack}
        options={({ route }) => {
          const routeName = getFocusedRouteNameFromRoute(route) ?? 'Account';
          const hideTabBar = ['Chat', 'ContactUs'].includes(routeName);
          return {
            tabBarLabel: 'Account',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person" size={size} color={color} />
            ),
            tabBarStyle: hideTabBar ? { display: 'none' } : {
              backgroundColor: colors.card,
              borderTopColor: colors.border,
            },
          };
        }}
      />
    </Tab.Navigator>
  );
}

// Root navigator that switches between admin and regular user
const AppNavigator: React.FC = () => {
  const { user } = useAuth();

  // Check if user is admin (case-insensitive check)
  const isAdmin = user?.role?.toUpperCase() === 'ADMIN';

  // If user is admin, show admin navigator
  if (isAdmin) {
    return <AdminNavigator />;
  }

  // Otherwise, show regular user tabs (Home screen)
  return <MainTabNavigator />;
};

export default AppNavigator;

