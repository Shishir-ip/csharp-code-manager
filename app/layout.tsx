import './globals.css';

export const metadata = {
  title: 'C# Lab Manager By Shohidul Islam ',
  description: 'My class practices and lab tasks Id-24-59248-3',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-dark-900 text-dark-100 antialiased">
        {children}
      </body>
    </html>
  );
}
