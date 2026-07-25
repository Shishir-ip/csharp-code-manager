import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import Footer from '@/components/footer';
import BottomNav from '@/components/bottom-nav';
import KeyboardShortcuts from '@/components/keyboard-shortcuts';

export const metadata = {
  title: 'C# Lab Manager By Shohidul Islam',
  description: 'My class practices and lab tasks Id-24-59248-3',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-dark-900 text-dark-100 antialiased flex flex-col">
        <ThemeProvider>
          <div className="flex-1 flex flex-col pb-16 sm:pb-0">
            {children}
          </div>
          <Footer />
          <BottomNav />
          <KeyboardShortcuts />
        </ThemeProvider>
      </body>
    </html>
  );
}
