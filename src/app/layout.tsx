import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "CallTone AI - AI Voice Agents for Business",
  description:
    "Deploy AI-powered voice agents for cold calling, receptionist services, and customer engagement.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={`${inter.variable} font-sans antialiased`}>
          {children}
          <Toaster position="top-right" richColors theme="dark" />
        </body>
      </html>
    </ClerkProvider>
  );
}
//  npm install @clerk/nextjs