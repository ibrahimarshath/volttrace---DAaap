import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VoltTrace — EV Battery Passport",
  description: "Track EV battery lifecycle on the blockchain",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <nav className="border-b border-gray-800 bg-gray-900/80 backdrop-blur sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2">
              <span className="text-xl font-bold text-volt-400">⚡</span>
              <span className="text-lg font-bold">VoltTrace</span>
            </a>
            <div className="flex items-center gap-6">
              <a href="/" className="text-sm text-gray-400 hover:text-white transition">
                Dashboard
              </a>
              <a href="/lookup" className="text-sm text-gray-400 hover:text-white transition">
                Lookup
              </a>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}