import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_KEY = 'offline_queue';

export interface QueueItem {
  taskId: string;
  notes?: string;
  qrCode?: string;
  proofPhotoUri?: string;
  proofPhotoName?: string;
  proofPhotoType?: string;
}

export const enqueue = async (item: QueueItem) => {
  const existing = await AsyncStorage.getItem(QUEUE_KEY);
  const items = existing ? (JSON.parse(existing) as QueueItem[]) : [];
  items.push(item);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(items));
};

export const dequeueAll = async () => {
  const existing = await AsyncStorage.getItem(QUEUE_KEY);
  const items = existing ? (JSON.parse(existing) as QueueItem[]) : [];
  await AsyncStorage.removeItem(QUEUE_KEY);
  return items;
};

export const requeue = async (items: QueueItem[]) => {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(items));
};
