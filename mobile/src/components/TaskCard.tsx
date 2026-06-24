import React from 'react';
import { View, Text } from 'react-native';
import { Task } from '../store/taskStore';

export const TaskCard = ({ task }: { task: Task }) => {
  const duty = typeof task.dutyId === 'string' ? null : task.dutyId;

  return (
    <View style={{ backgroundColor: '#fff', padding: 12, borderRadius: 12, marginBottom: 8 }}>
      <Text style={{ fontWeight: '600' }}>{duty?.name ?? `Task ${task._id}`}</Text>
      <Text>Status: {task.status}</Text>
      {task.proofPhoto && <Text style={{ fontSize: 12, color: '#64748b' }}>Proof uploaded</Text>}
    </View>
  );
};
