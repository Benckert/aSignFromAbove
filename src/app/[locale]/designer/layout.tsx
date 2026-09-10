import type { ReactNode } from 'react';
import { carvingFontVariables } from '@/config/carving-fonts.loader';

/**
 * The nine carving faces are loaded here rather than in the root layout, so a
 * visitor who only reads the front page never downloads them.
 */
export default function DesignerLayout({ children }: { children: ReactNode }) {
  return <div className={carvingFontVariables}>{children}</div>;
}
