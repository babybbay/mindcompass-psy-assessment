import type { Metadata } from "next";
import "./globals.css";
import { Frame } from "@/components/mindcompass/frame";

export const metadata: Metadata = {
  title: "MindCompass 心智罗盘｜教育与研究性自我探索",
  description: "从人格特质到态度与行为倾向，用六份问卷开启自我探索。自愿参与，数据最小化，不作临床诊断。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased"><a className="skip-link" href="#main-content">跳至正文</a><Frame>{children}</Frame></body>
    </html>
  );
}
