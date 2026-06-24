import React from 'react';
import { View, Text } from 'react-native';
import { useTaskStore } from '../store/taskStore';

export const DashboardScreen = () => {
  const { tasks } = useTaskStore();
  const assigned = tasks.filter((t) => t.status === 'assigned').length;
  const completed = tasks.filter((t) => t.status === 'completed').length;

  return (
    <View>
      <Text style={{ fontSize: 20, fontWeight: '600', marginBottom: 12 }}>Today</Text>
      <View style={{ backgroundColor: '#fff', padding: 16, borderRadius: 12 }}>
        <Text>Assigned: {assigned}</Text>
        <Text>Completed: {completed}</Text>
      </View>
    </View>
  );
};
