'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import QRCode from 'qrcode';

interface QrLabelCardProps {
  title: string;
  code: string;
  subtitle?: string;
  compact?: boolean;
}

const createFileName = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'qr-label';

export const QrLabelCard = ({ title, code, subtitle, compact = false }: QrLabelCardProps) => {
  const [dataUrl, setDataUrl] = useState<string>('');

  useEffect(() => {
    let cancelled = false;

    QRCode.toDataURL(code, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: compact ? 160 : 240,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((value) => {
        if (!cancelled) {
          setDataUrl(value);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDataUrl('');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [code, compact]);

  const download = () => {
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `${createFileName(`${title}-${code}`)}.png`;
    link.click();
  };

  const print = () => {
    if (!dataUrl) return;
    const popup = window.open('', '_blank', 'width=520,height=640');
    if (!popup) return;

    popup.document.write(`
      <html>
        <head>
          <title>${title} QR Label</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
            .label { border: 2px solid #dbeafe; border-radius: 20px; padding: 24px; text-align: center; }
            img { width: 260px; height: 260px; object-fit: contain; }
            h1 { margin: 0 0 8px; font-size: 24px; }
            p { margin: 0; color: #475569; }
            .code { margin-top: 16px; font-size: 14px; letter-spacing: 0.08em; }
          </style>
        </head>
        <body>
          <div class="label">
            <h1>${title}</h1>
            <p>${subtitle ?? 'Scan this location label during task completion.'}</p>
            <img src="${dataUrl}" alt="QR label for ${title}" />
            <div class="code">${code}</div>
          </div>
          <script>
            window.onload = () => {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `);
    popup.document.close();
  };

  return (
    <div className={`rounded-3xl border border-slate-100 bg-white/90 p-5 shadow-sm ${compact ? '' : 'h-full'}`}>
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="flex h-32 w-32 items-center justify-center rounded-2xl bg-slate-50 md:h-36 md:w-36">
          {dataUrl ? (
            <Image
              src={dataUrl}
              alt={`QR label for ${title}`}
              width={compact ? 160 : 240}
              height={compact ? 160 : 240}
              className="h-full w-full rounded-2xl object-contain"
              unoptimized
            />
          ) : (
            <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Loading QR</div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-lg font-semibold text-slate-900">{title}</div>
          {subtitle && <div className="mt-1 text-sm text-slate-500">{subtitle}</div>}
          <div className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-xs uppercase tracking-[0.18em] text-slate-600">
            {code}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="btn-ghost" onClick={download} disabled={!dataUrl}>
              Download label
            </button>
            <button className="btn-primary" onClick={print} disabled={!dataUrl}>
              Print label
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
