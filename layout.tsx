import type { Metadata } from "next";
import "./globals.css";
import "./choir.css";
import "./message-variants.css";
export const metadata:Metadata={
 title:"찬양링크",
 description:"찬양곡 제목으로 전체·소프라노·알토·테너·베이스 연습 영상을 찾아 카톡 공지문으로 정리합니다.",
 icons:{icon:[{url:"/favicon-64.png",type:"image/png",sizes:"64x64"},{url:"/app-icon.png",type:"image/png",sizes:"1024x1024"}],apple:[{url:"/apple-touch-icon.png",sizes:"180x180",type:"image/png"}]},
 openGraph:{title:"찬양링크",description:"파트별 연습 영상을 찾아 카톡 공지문으로 정리합니다.",images:["https://youtube-topic-recommender.youngdal.chatgpt.site/og.png"]},
 twitter:{card:"summary_large_image",title:"찬양링크",description:"파트별 연습 영상을 찾아 카톡 공지문으로 정리합니다.",images:["https://youtube-topic-recommender.youngdal.chatgpt.site/og.png"]}
};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="ko"><head><meta name="theme-color" content="#ef392f"/></head><body>{children}</body></html>;}
