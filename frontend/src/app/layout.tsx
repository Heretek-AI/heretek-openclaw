import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '@/styles/globals.css';
import { ThemeProvider } from 'next-themes';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Heretek OpenClaw - Autonomous Agent Collective',
  description: 'Self-improving autonomous agent collective with LiteLLM A2A protocol',
  keywords: ['AI', 'Agents', 'LLM', 'LiteLLM', 'A2A', 'Autonomous', 'Collective', 'Heretek', 'OpenClaw'],
  authors: [{ name: 'Heretek Team', url: 'https://github.com/heretek' }],
  openGraph: {
    title: 'Heretek OpenClaw',
    description: 'Self-improving autonomous agent collective',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
