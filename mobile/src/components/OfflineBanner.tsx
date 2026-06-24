import React from 'react';
import { View, Text } from 'react-native';

export const OfflineBanner = ({ offline }: { offline: boolean }) => {
  if (!offline) return null;
  return (
    <View style={{ backgroundColor: '#fee2e2', padding: 8, borderRadius: 8, marginBottom: 8 }}>
      <Text style={{ color: '#991b1b' }}>Offline mode: changes will sync automatically.</Text>
    </View>
  );
};
