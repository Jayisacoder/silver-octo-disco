import './globals.css';
import type { Metadata } from 'next';

import { Providers } from './providers';
import { ThemeToggle } from './theme-toggle';

export const metadata: Metadata = {
  title: 'Agent Team Starter',
  description: 'Starter foundation for the AI software development team project.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ThemeToggle />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
