import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Каталог сувенирной продукции",
  description: "Публичный каталог и админка для управления сувенирной продукцией"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
