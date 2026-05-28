import React from 'react';

export const metadata = {
  title: 'SD Family Law CMS',
  description: 'Content management for San Diego Family Law Advocates.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, sans-serif' }}>{children}</body>
    </html>
  );
}
