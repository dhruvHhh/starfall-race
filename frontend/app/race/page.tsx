import RaceClient from "./race-client";
import Link from "next/link";
import { Settings, Bell, Zap } from "lucide-react";

export default function RacePage() {
    return (
        <div className="flex-1 flex flex-col bg-transparent">
            {/* Nav */}
            <header className="relative z-10 flex items-center justify-between px-8 py-4 border-b border-white/5 bg-black/40 backdrop-blur-md sticky top-0">
                <div className="flex items-center gap-10">
                    <Link href="/" className="flex items-center gap-3">
                        <img src="/logo.png" alt="Type Brawl" className="w-8 h-8 rounded-lg" />
                        <span className="text-lg font-bold text-white tracking-tight">Type Brawl</span>
                    </Link>
                    <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
                        <Link href="/" className="text-gray-400 hover:text-gray-200 transition-colors">Practice</Link>
                        <Link href="/race" className="text-white border-b-2 border-blue-500 pb-0.5">Multiplayer</Link>
                    </nav>
                </div>
                <div className="flex items-center gap-4">
                    <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Sign In</a>
                    <button className="text-gray-500 hover:text-gray-300 transition-colors p-1"><Settings className="w-5 h-5" /></button>
                    <button className="text-gray-500 hover:text-gray-300 transition-colors p-1"><Bell className="w-5 h-5" /></button>
                </div>
            </header>

            <div className="relative z-10 flex-1 w-full max-w-5xl mx-auto px-6 py-10 flex flex-col">
                <RaceClient />
            </div>
        </div>
    );
}
