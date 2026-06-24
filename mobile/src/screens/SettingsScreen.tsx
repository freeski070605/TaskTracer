import React from 'react';
import { View, Text } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { PrimaryButton } from '../components/PrimaryButton';

export const SettingsScreen = () => {
  const { user, logout } = useAuthStore();

  return (
    <View>
      <Text style={{ fontSize: 18, fontWeight: '600' }}>Settings</Text>
      <Text style={{ marginTop: 8 }}>Signed in as {user?.email}</Text>
      <View style={{ marginTop: 16 }}>
        <PrimaryButton title="Logout" onPress={logout} />
      </View>
    </View>
  );
};
