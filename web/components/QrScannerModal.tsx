'use client';
import { useEffect, useRef, useState } from 'react';

type BarcodeDetectorResult = {
  rawValue?: string;
};

type BarcodeDetectorInstance = {
  detect: (source: ImageBitmapSource) => Promise<BarcodeDetectorResult[]>;
};

type BarcodeDetectorConstructor = {
  new (options?: { formats?: string[] }): BarcodeDetectorInstance;
  getSupportedFormats?: () => Promise<string[]>;
};

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorConstructor;
  }
}

interface QrScannerModalProps {
  open: boolean;
  onClose: () => void;
  onDetected: (value: string) => void;
}

export const QrScannerModal = ({ open, onClose, onDetected }: QrScannerModalProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [message, setMessage] = useState('Preparing camera...');

  useEffect(() => {
    if (!open) return;

    let stream: MediaStream | null = null;
    let timer: number | null = null;
    let cancelled = false;

    const stop = () => {
      if (timer) {
        window.clearInterval(timer);
      }
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };

    const start = async () => {
      try {
        if (!window.BarcodeDetector) {
          setMessage('QR camera scanning is not supported in this browser. You can still type the code manually.');
          return;
        }

        const supported = await window.BarcodeDetector.getSupportedFormats?.();
        if (supported && !supported.includes('qr_code')) {
          setMessage('This browser camera does not support QR detection. Enter the code manually instead.');
          return;
        }

        const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });

        if (cancelled) {
          stop();
          return;
        }

        const video = videoRef.current;
        if (!video) {
          stop();
          return;
        }

        video.srcObject = stream;
        video.setAttribute('playsinline', 'true');
        await video.play();
        setMessage('Point the camera at the QR label.');

        timer = window.setInterval(async () => {
          if (cancelled || !videoRef.current || videoRef.current.readyState < 2) return;

          try {
            const results = await detector.detect(videoRef.current);
            const match = results.find((result) => result.rawValue?.trim());
            if (match?.rawValue) {
              onDetected(match.rawValue.trim());
              onClose();
            }
          } catch {
            setMessage('Still scanning...');
          }
        }, 500);
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : 'Unable to access the camera. Check browser permissions and try again.',
        );
      }
    };

    start();

    return () => {
      cancelled = true;
      stop();
    };
  }, [onClose, onDetected, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-[28px] border border-slate-800 bg-slate-950 p-5 text-white shadow-2xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Scan location QR</h2>
            <p className="mt-1 text-sm text-slate-300">{message}</p>
          </div>
          <button className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="mt-5 overflow-hidden rounded-3xl border border-slate-800 bg-black">
          <video ref={videoRef} className="aspect-video w-full object-cover" muted />
        </div>
        <div className="mt-4 text-xs uppercase tracking-[0.18em] text-slate-400">
          Tip: hold the label steady and fill most of the frame.
        </div>
      </div>
    </div>
  );
};
