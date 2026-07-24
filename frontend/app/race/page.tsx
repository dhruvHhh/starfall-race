import RaceClient from "./race-client";
import Link from "next/link";
import { Settings, Bell, Zap } from "lucide-react";

export default function RacePage() {
    return (
        <div className="min-h-screen bg-[#0a0e14] text-gray-100 flex flex-col">
            {/* Dot grid overlay */}
            <div
                className="pointer-events-none fixed inset-0 opacity-[0.35]"
                style={{
                    backgroundImage: "radial-gradient(rgba(255,255,255,0.12) 1px, transparent 1px)",
                    backgroundSize: "24px 24px",
                }}
            />

            {/* Nav */}
            <header className="relative z-10 flex items-center justify-between px-8 py-4 border-b border-white/5 bg-[#0a0e14]/90 backdrop-blur-sm sticky top-0">
                <div className="flex items-center gap-10">
                    <Link href="/" className="flex items-center gap-2">
                        <Zap className="w-5 h-5 text-blue-500" fill="currentColor" />
                        <span className="text-lg font-bold text-white tracking-tight">Type Brawl</span>
                    </Link>
                    <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
                        <Link href="/" className="text-gray-400 hover:text-gray-200 transition-colors">Practice</Link>
                        <Link href="/race" className="text-white border-b-2 border-blue-500 pb-0.5">Multiplayer</Link>
                        <a href="#" className="text-gray-400 hover:text-gray-200 transition-colors">Leaderboards</a>
                        <a href="#" className="text-gray-400 hover:text-gray-200 transition-colors">About</a>
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
