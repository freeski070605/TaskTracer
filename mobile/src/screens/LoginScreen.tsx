import React, { useState } from 'react';
import { View, Text, TextInput } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { PrimaryButton } from '../components/PrimaryButton';

export const LoginScreen = () => {
  const { login, loading } = useAuthStore();
  const [tenantId, setTenantId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
      <Text style={{ fontSize: 24, fontWeight: '600', marginBottom: 12 }}>TaskTracer</Text>
      <TextInput
        placeholder="Tenant ID"
        value={tenantId}
        onChangeText={setTenantId}
        style={{ borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 12, marginBottom: 8 }}
      />
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        style={{ borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 12, marginBottom: 8 }}
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{ borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 12, marginBottom: 12 }}
      />
      <PrimaryButton title={loading ? 'Signing in...' : 'Sign in'} onPress={() => login(tenantId, email, password)} />
    </View>
  );
};
