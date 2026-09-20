import RaceClient from "./race-client";
import SiteHeader from "../site-header";

export default function RacePage() {
    return (
        <div className="flex-1 flex flex-col">
            <SiteHeader active="multiplayer" />

            <div className="relative z-10 flex-1 w-full max-w-5xl mx-auto px-6 py-10 flex flex-col">
                <RaceClient />
            </div>
        </div>
    );
}
