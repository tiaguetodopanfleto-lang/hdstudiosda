import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'HD Studio — Desenvolvimento sob medida',description:'Sites, jogos de Roblox, plugins, mods e Skripts. Conheça o trabalho de North_HD e os produtos do HD Studio.',icons:{icon:'/hd-studio-logo.png',apple:'/hd-studio-logo.png'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><head><link rel="stylesheet" href="/legacy.css"/><link rel="stylesheet" href="/studio.css"/></head><body>{children}</body></html>}
