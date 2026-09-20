import Link from "next/link";
import { Users } from "lucide-react";

/** The Starfall mark: a four-point star with a trailing streak. */
function StarfallMark() {
    return (
        <svg viewBox="0 0 32 32" className="nav-mark" aria-hidden="true">
            <defs>
                <linearGradient id="sf-mark" x1="0" y1="1" x2="1" y2="0">
                    <stop offset="0%" stopColor="#2b8fd4" />
                    <stop offset="52%" stopColor="#6cc5ff" />
                    <stop offset="100%" stopColor="#f5c66b" />
                </linearGradient>
            </defs>
            <g stroke="url(#sf-mark)" strokeLinecap="round" fill="none">
                <path d="M4 28 L12 20" strokeWidth="2.6" opacity="0.75" />
                <path d="M10 29.5 L14.5 25" strokeWidth="1.8" opacity="0.45" />
            </g>
            <path
                d="M20 3.5 C20.9 10.6 23.9 13.6 31 14.5 C23.9 15.4 20.9 18.4 20 25.5 C19.1 18.4 16.1 15.4 9 14.5 C16.1 13.6 19.1 10.6 20 3.5 Z"
                fill="url(#sf-mark)"
            />
        </svg>
    );
}

function NavTab({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
    return (
        <Link href={href} className={active ? "nav-tab is-active" : "nav-tab"}>
            {children}
        </Link>
    );
}

export default function SiteHeader({ active }: { active: "practice" | "multiplayer" }) {
    return (
        <header className="sticky top-0 z-30 px-3 sm:px-5 pt-3 pb-1">
            <div className="nav-island relative mx-auto flex max-w-4xl items-center justify-between gap-2 py-2 pl-3 pr-2 sm:pl-4 sm:pr-3">
                <Link href="/" className="group flex items-center gap-2.5 shrink-0">
                    <StarfallMark />
                    <span className="nav-wordmark">Starfall</span>
                </Link>

                {/* Centred absolutely from sm up so the tabs hold their place
                    whether or not the call to action is rendered. */}
                <nav className="nav-tabs sm:absolute sm:left-1/2 sm:-translate-x-1/2">
                    <NavTab href="/" active={active === "practice"}>Practice</NavTab>
                    <NavTab href="/race" active={active === "multiplayer"}>Multiplayer</NavTab>
                </nav>

                {/* Pointless on the page it links to, so it only shows on practice. */}
                {active === "practice" && (
                    <Link href="/race" className="btn btn-primary shrink-0 px-3 py-2 text-sm sm:px-4">
                        <Users className="h-4 w-4" />
                        <span className="hidden sm:inline">Race Online</span>
                    </Link>
                )}
            </div>
        </header>
    );
}
