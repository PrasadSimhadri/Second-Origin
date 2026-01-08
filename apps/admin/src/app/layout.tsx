import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ScanKart Admin",
  description: "Administrative Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="flex min-h-screen bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
