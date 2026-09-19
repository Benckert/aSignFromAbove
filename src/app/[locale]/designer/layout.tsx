import type { ReactNode } from 'react';
import { carvingFontVariables } from '@/config/carving-fonts.loader';

/**
 * The nine carving faces are loaded here rather than in the root layout, so a
 * visitor who only reads the front page never downloads them.
 */
export default function DesignerLayout({ children }: { children: ReactNode }) {
  // The faces are declared here as CSS variables. The marker gives the
  // measurement a definite element to resolve them against: they are not on the
  // document root, so anything asking the root for them gets nothing back.
  return (
    <div data-carving-faces="" className={carvingFontVariables}>
      {children}
    </div>
  );
}
