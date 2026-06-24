import React, { useEffect, useState } from 'react';
import { View, ScrollView, Text, Modal, TouchableOpacity, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { useTaskStore, Task } from '../store/taskStore';
import { TaskCard } from '../components/TaskCard';
import { OfflineBanner } from '../components/OfflineBanner';
import { PrimaryButton } from '../components/PrimaryButton';

interface ProofSelection {
  uri: string;
  name: string;
  type: string;
}

const guessMimeType = (uri: string) => {
  const lower = uri.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.heic') || lower.endsWith('.heif')) return 'image/heic';
  return 'image/jpeg';
};

export const TaskListScreen = () => {
  const { tasks, offline, completeTask, syncOfflineQueue } = useTaskStore();
  const [proofs, setProofs] = useState<Record<string, ProofSelection | null>>({});
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({});
  const [scannerTask, setScannerTask] = useState<string | null>(null);
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null);

  useEffect(() => {
    BarCodeScanner.requestPermissionsAsync().then(({ status }) => {
      setCameraPermission(status === 'granted');
    });
  }, []);

  const openCamera = async (taskId: string) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      setCameraPermission(false);
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.6,
      allowsEditing: false,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      const name = asset.fileName ?? `proof_${Date.now()}.jpg`;
      const type = asset.mimeType ?? guessMimeType(asset.uri);
      setProofs((prev) => ({ ...prev, [taskId]: { uri: asset.uri, name, type } }));
    }
  };

  const handleComplete = async (task: Task) => {
    const proof = proofs[task._id] ?? undefined;
    const qrCode = qrCodes[task._id]?.trim();
    const duty = typeof task.dutyId === 'string' ? null : task.dutyId;
    const proofRequired = duty?.requiresPhoto;
    const qrRequired = duty?.requiresQr;

    if (proofRequired && !proof) {
      Alert.alert('Photo required', 'Please capture a proof photo before completing this task.');
      return;
    }

    if (qrRequired && !qrCode) {
      Alert.alert('QR required', 'Please scan the QR code before completing this task.');
      return;
    }
    await completeTask(task._id, {
      proofPhotoUri: proof?.uri,
      proofPhotoName: proof?.name,
      proofPhotoType: proof?.type,
      qrCode: qrCode || undefined,
    });

    setProofs((prev) => ({ ...prev, [task._id]: null }));
    setQrCodes((prev) => ({ ...prev, [task._id]: '' }));
  };

  const renderTaskActions = (task: Task) => {
    const duty = typeof task.dutyId === 'string' ? null : task.dutyId;
    const proofRequired = duty?.requiresPhoto;
    const qrRequired = duty?.requiresQr;

    if (task.status !== 'assigned' && task.status !== 'rejected') return null;

    const proof = proofs[task._id];
    const qrCode = qrCodes[task._id];

    return (
      <View style={{ gap: 8, marginBottom: 12 }}>
        <Text style={{ fontSize: 12, color: '#475569' }}>
          Photo proof {proofRequired ? '(required)' : '(optional)'}
        </Text>
        <PrimaryButton
          title={proof ? 'Retake photo' : 'Capture photo'}
          onPress={() => openCamera(task._id)}
        />
        {proof && <Text style={{ fontSize: 12, color: '#64748b' }}>{proof.name}</Text>}

        <Text style={{ fontSize: 12, color: '#475569' }}>
          QR code {qrRequired ? '(required)' : '(optional)'}
        </Text>
        <PrimaryButton title="Scan QR" onPress={() => setScannerTask(task._id)} />
        {qrCode && <Text style={{ fontSize: 12, color: '#64748b' }}>Scanned: {qrCode}</Text>}

        <PrimaryButton title="Complete" onPress={() => handleComplete(task)} />
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <OfflineBanner offline={offline} />
      <ScrollView style={{ flex: 1 }}>
        {tasks.map((task) => (
          <View key={task._id}>
            <TaskCard task={task} />
            {renderTaskActions(task)}
          </View>
        ))}
      </ScrollView>
      <PrimaryButton title="Sync" onPress={syncOfflineQueue} />

      <Modal visible={!!scannerTask} animationType="slide">
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          {cameraPermission === false && (
            <View style={{ padding: 24 }}>
              <Text style={{ color: '#fff', marginBottom: 12 }}>
                Camera access is required to scan QR codes.
              </Text>
              <PrimaryButton title="Close" onPress={() => setScannerTask(null)} />
            </View>
          )}
          {cameraPermission && (
            <BarCodeScanner
              style={{ flex: 1 }}
              onBarCodeScanned={({ data }) => {
                if (scannerTask) {
                  setQrCodes((prev) => ({ ...prev, [scannerTask]: data }));
                  setScannerTask(null);
                }
              }}
            />
          )}
          <TouchableOpacity
            onPress={() => setScannerTask(null)}
            style={{ position: 'absolute', top: 50, right: 20, padding: 10, backgroundColor: '#111827', borderRadius: 8 }}
          >
            <Text style={{ color: '#fff' }}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
};

