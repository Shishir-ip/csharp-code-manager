import './globals.css';

export const metadata = {
  title: 'C# Lab Manager',
  description: 'My class practices and lab tasks',
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