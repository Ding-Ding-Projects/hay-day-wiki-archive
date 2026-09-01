import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Hay Day Wiki Archive',
  description: 'An unofficial, attributed, read-only archive of the Hay Day Wiki.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
