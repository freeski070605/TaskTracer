import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, Text, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from './store/authStore';
import { useTaskStore } from './store/taskStore';
import { LoginScreen } from './screens/LoginScreen';
import { TaskListScreen } from './screens/TaskListScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { initDb } from './offline/db';

export default function App() {
  const { user } = useAuthStore();
  const { loadTasks, syncOfflineQueue } = useTaskStore();
  const [tab, setTab] = useState<'dashboard' | 'tasks' | 'settings'>('dashboard');

  useEffect(() => {
    initDb();
  }, []);

  useEffect(() => {
    if (user) {
      loadTasks();
      syncOfflineQueue();
      const interval = setInterval(syncOfflineQueue, 30000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [user, loadTasks, syncOfflineQueue]);

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f7f9ff' }}>
      <StatusBar style="dark" />
      <View style={{ padding: 16, flex: 1 }}>
        {tab === 'dashboard' && <DashboardScreen />}
        {tab === 'tasks' && <TaskListScreen />}
        {tab === 'settings' && <SettingsScreen />}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-around', padding: 12, backgroundColor: '#fff' }}>
        <TouchableOpacity onPress={() => setTab('dashboard')}>
          <Text>Dashboard</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setTab('tasks')}>
          <Text>Tasks</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setTab('settings')}>
          <Text>Settings</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
