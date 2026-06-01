import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    template: "%s | PortLink",
    default: "PortLink",
  },
  description:
    "Port-ministry operations hub for the Port of Mobile, AL. Track vessels, manage wifi device loans, and coordinate volunteer outreach.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased bg-off-white text-foreground">
        {children}
      </body>
    </html>
  );
}
