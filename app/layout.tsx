import type { Metadata } from "next";
import { headers } from "next/headers";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://gelatoni.uk"),
  title: {
    default: "Xuhuan / Gelatoni",
    template: "%s | Xuhuan / Gelatoni",
  },
  description: "Writing and engineering notes by Xuhuan.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = (await headers()).get("x-site-locale") === "zh" ? "zh" : "en";
  return (
    <html lang={locale === "zh" ? "zh-CN" : "en"}>
      <body>
        <div className="min-h-screen bg-paper text-ink">
          <SiteHeader />
          <main className="mx-auto max-w-5xl px-5 py-10">{children}</main>
        </div>
      </body>
    </html>
  );
}
