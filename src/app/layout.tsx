import type { ReactNode } from 'react';
import './globals.css';

/**
 * The locale layout below sets <html lang>, so this root layout deliberately
 * does almost nothing. It exists because Next requires a root layout above the
 * [locale] segment.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
