import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AdminChatSessionsScreen from '../screens/admin/AdminChatSessionsScreen';
import AdminUsersScreen from '../screens/admin/AdminUsersScreen';
import ChatScreen from '../screens/ChatScreen';

const Stack = createStackNavigator();

const AdminNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      // @ts-expect-error - React Navigation v7 type issue: id and initialRouteName conflict
      id="AdminNavigator"
      screenOptions={{
        headerShown: false,
      }}
      initialRouteName="AdminDashboard"
    >
      <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
      <Stack.Screen name="AdminChatSessions" component={AdminChatSessionsScreen} />
      <Stack.Screen name="AdminChat" component={ChatScreen} />
      <Stack.Screen name="AdminUsers" component={AdminUsersScreen} />
      {/* Add more admin screens here as needed */}
    </Stack.Navigator>
  );
};

export default AdminNavigator;


