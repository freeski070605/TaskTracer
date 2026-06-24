import React from 'react';
import { TouchableOpacity, Text } from 'react-native';

export const PrimaryButton = ({ title, onPress }: { title: string; onPress: () => void }) => (
  <TouchableOpacity
    onPress={onPress}
    style={{ backgroundColor: '#2563eb', padding: 12, borderRadius: 10, alignItems: 'center' }}
  >
    <Text style={{ color: '#fff', fontWeight: '600' }}>{title}</Text>
  </TouchableOpacity>
);
