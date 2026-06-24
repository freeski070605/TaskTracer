import '../styles/globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'TaskTracer',
  description: 'EVS task tracking with real-time verification',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="text-ink">
        {children}
      </body>
    </html>
  );
}
