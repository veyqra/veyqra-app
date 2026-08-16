import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies, headers } from "next/headers";

import {
  I18nProvider,
  isLanguagePreference,
  resolveLocale,
} from "@/lib/i18n";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Veyqra",
  description: "Create. Train. Deploy.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookiePreference = (await cookies()).get(
    "veyqra-language"
  )?.value;
  const preference = isLanguagePreference(cookiePreference)
    ? cookiePreference
    : "system";
  const browserLocale = resolveLocale(
    (await headers()).get("accept-language")
  );
  const locale =
    preference === "system" ? browserLocale : preference;

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <I18nProvider
          initialLocale={locale}
          initialPreference={preference}
        >
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
