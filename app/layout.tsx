import type { Metadata } from "next";
import "./globals.css";
import "./gold-master.css";

export const metadata: Metadata = {
  title: "Azul Resgate | Operação Comercial",
  description: "Plataforma operacional e comercial da Azul Veículos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
