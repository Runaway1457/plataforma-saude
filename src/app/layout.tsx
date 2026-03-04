import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ReactQueryProvider } from "@/lib/react-query-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Plataforma de Inteligência Clínica e Saúde Populacional",
  description: "Sistema de inteligência clínica e saúde populacional para atenção primária no contexto brasileiro. Agentes de IA para triagem assistida e gestão territorial de saúde.",
  keywords: ["saúde", "inteligência clínica", "atenção primária", "triagem", "saúde populacional", "SUS", "Brasil"],
  authors: [{ name: "Plataforma de Saúde" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "Plataforma de Inteligência Clínica",
    description: "Inteligência artificial para atenção primária e gestão de saúde populacional",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ReactQueryProvider>
          {children}
          <Toaster />
        </ReactQueryProvider>
      </body>
    </html>
  );
}
