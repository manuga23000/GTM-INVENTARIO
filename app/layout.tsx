import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import { FeedbackProvider } from "@/components/ui/Feedback";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "GTM Inventario | Grandoli Taller Mecánico",
  description: "Sistema de gestión de inventario para lubricentro y taller",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#000000",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={inter.variable}>
      <body className="font-sans antialiased">
        <FeedbackProvider>
          <Header />
          {/* pb extra en mobile para la barra de navegación inferior */}
          <main className="min-h-screen pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
            {children}
          </main>
        </FeedbackProvider>
      </body>
    </html>
  );
}
