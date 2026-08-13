import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import { SidebarProvider } from '@/context/SidebarContext';
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "FoodieAI",
  description:
    "A multi-agent LLM system for personalized restaurant and recipe recommendation.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex bg-secondary">
        <SidebarProvider>
          <Providers>{children}</Providers>
        </SidebarProvider>

      </body>
    </html>
  );
}
