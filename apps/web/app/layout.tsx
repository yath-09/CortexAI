import localFont from "next/font/local";
import "./globals.css";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import {
  ClerkProvider,
} from '@clerk/nextjs'
import { ToastProvider } from "./components/ToastProvider";
const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
});

export const metadata = {
  title: 'ChatPDFX - Intelligent Document Chat Platform',
  description: 'Upload PDFs and chat with their content using advanced AI technology.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <div className="relative flex min-h-screen flex-col">
          <Navbar />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
          <ToastProvider/>
        </div>
      </body>
    </html>
    </ClerkProvider>
  );
}
