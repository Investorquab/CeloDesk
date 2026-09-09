import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CeloDesk — Get paid globally, with just a link',
  description: 'Beautiful stablecoin invoices and payments on Celo.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
