import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'Community Core - Connect and Grow',
  description:
    'An awesome and fun medium to find & stay connected with your peers with similar interests.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Toaster position="top-right" />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
