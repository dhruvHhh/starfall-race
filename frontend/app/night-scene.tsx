/**
 * The page backdrop: a moonlit anime night — Milky Way, drifting cloud banks,
 * a treeline silhouette, shooting stars and fireflies.
 *
 * Deliberately zero JavaScript at runtime. Every layer is markup plus a CSS
 * animation on `opacity` or `transform`, which the browser runs on the
 * compositor, so the backdrop never competes with the typing test for the main
 * thread. Positions come from a seeded PRNG evaluated once at module load, so
 * the server and the client generate byte-identical markup.
 */

function mulberry32(seed: number) {
    return function random() {
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

type Star = {
    top: number;
    left: number;
    size: number;
    opacity: number;
    twinkle: boolean;
    duration: number;
    delay: number;
    halo: boolean;
};

/** Stars scattered across the whole sky. */
function scatteredStars(rng: () => number, count: number): Star[] {
    const stars: Star[] = [];
    for (let i = 0; i < count; i++) {
        // The exponent keeps the field dense up top and sparse toward the
        // treeline, which is where a real sky thins out against the horizon.
        const top = Math.pow(rng(), 1.5) * 76;
        const size = rng() < 0.88 ? 0.9 + rng() * 1.1 : 2 + rng() * 1.2;
        stars.push({
            top,
            left: rng() * 100,
            size,
            opacity: 0.3 + rng() * 0.6,
            // Only some stars animate; a sky where everything pulses looks
            // fake and costs more than it is worth.
            twinkle: rng() > 0.55,
            duration: 2.4 + rng() * 4.5,
            delay: -rng() * 6,
            halo: size > 2,
        });
    }
    return stars;
}

/** A dense ribbon of stars following the Milky Way band. */
function bandStars(rng: () => number, count: number): Star[] {
    const stars: Star[] = [];
    for (let i = 0; i < count; i++) {
        const t = rng();
        const spread = 5 + t * 6;
        const size = rng() < 0.93 ? 0.7 + rng() * 0.9 : 1.8 + rng();
        stars.push({
            top: t * 74 + (rng() - 0.5) * 6,
            left: 33 + t * 24 + (rng() - 0.5) * spread * 2,
            size,
            opacity: 0.45 + rng() * 0.55,
            twinkle: rng() > 0.6,
            duration: 2 + rng() * 4,
            delay: -rng() * 6,
            halo: false,
        });
    }
    return stars;
}

const STARS: Star[] = (() => {
    const rng = mulberry32(0x7b7a11);
    return [...scatteredStars(rng, 150), ...bandStars(rng, 165)];
})();

type Cloud = {
    top: number;
    width: number;
    opacity: number;
    duration: number;
    delay: number;
    flip: boolean;
    /** Backlit banks down by the horizon use the darker fill. */
    dark: boolean;
};

/* Kept low and few. In the reference art the clouds band across the lower sky
   and frame the scene; covering the whole frame just makes noise. */
const CLOUDS: Cloud[] = [
    { top: 20, width: 40, opacity: 0.3, duration: 300, delay: -40, flip: true, dark: false },
    { top: 44, width: 54, opacity: 0.46, duration: 230, delay: -150, flip: false, dark: false },
    { top: 57, width: 46, opacity: 0.78, duration: 280, delay: -20, flip: true, dark: true },
    { top: 65, width: 64, opacity: 0.92, duration: 195, delay: -110, flip: false, dark: true },
];

type Meteor = { top: number; left: number; width: number; angle: number; duration: number; delay: number };

const METEORS: Meteor[] = [
    { top: 5, left: 14, width: 130, angle: 32, duration: 11, delay: 0 },
    { top: 2, left: 44, width: 96, angle: 38, duration: 17, delay: -6 },
    { top: 16, left: 6, width: 160, angle: 28, duration: 14, delay: -9.5 },
    { top: 9, left: 60, width: 110, angle: 35, duration: 21, delay: -3 },
];

type Firefly = { left: number; bottom: number; size: number; duration: number; delay: number; fx: number; fy: number };

const FIREFLIES: Firefly[] = (() => {
    const rng = mulberry32(0x2f10ce);
    const flies: Firefly[] = [];
    for (let i = 0; i < 16; i++) {
        flies.push({
            left: rng() * 100,
            bottom: rng() * 20,
            size: 2 + rng() * 2.2,
            duration: 11 + rng() * 12,
            delay: -rng() * 18,
            fx: (rng() - 0.5) * 16,
            fy: -(8 + rng() * 16),
        });
    }
    return flies;
})();

/* ── Treeline ──────────────────────────────────────────────────────────────
   Generated rather than hand-drawn: a hand-written path at this width either
   repeats visibly or turns into an even sawtooth, and both read as mountains
   instead of trees. Random bump widths and heights give a canopy.
   ──────────────────────────────────────────────────────────────────────── */

const VIEW_W = 1440;
const VIEW_H = 300;

function canopyPath(seed: number, baseY: number, minTop: number, maxTop: number, step: number) {
    const rng = mulberry32(seed);
    let d = "";
    let x = 0;
    let first = true;

    while (x < VIEW_W) {
        const width = step * (0.55 + rng() * 1.1);
        const top = minTop + rng() * (maxTop - minTop);
        const next = Math.min(x + width, VIEW_W);
        if (first) {
            d = `M0 ${baseY} L0 ${top.toFixed(1)}`;
            first = false;
        }
        // Control point above the segment turns each span into a rounded crown.
        d += ` Q ${(x + width / 2).toFixed(1)} ${(top - width * 0.5).toFixed(1)} ${next.toFixed(1)} ${top.toFixed(1)}`;
        x = next;
    }

    return `${d} L${VIEW_W} ${baseY} L${VIEW_W} ${VIEW_H} L0 ${VIEW_H} Z`;
}

/** A conifer with a ragged, tiered outline. */
function conifer(x: number, baseY: number, h: number, w: number) {
    const half = w / 2;
    return [
        `M${x - half} ${baseY}`,
        `L${x - half * 0.62} ${baseY - h * 0.3}`,
        `L${x - half * 0.86} ${baseY - h * 0.29}`,
        `L${x - half * 0.4} ${baseY - h * 0.62}`,
        `L${x - half * 0.58} ${baseY - h * 0.61}`,
        `L${x} ${baseY - h}`,
        `L${x + half * 0.58} ${baseY - h * 0.61}`,
        `L${x + half * 0.4} ${baseY - h * 0.62}`,
        `L${x + half * 0.86} ${baseY - h * 0.29}`,
        `L${x + half * 0.62} ${baseY - h * 0.3}`,
        `L${x + half} ${baseY}`,
        "Z",
    ].join(" ");
}

const CONIFERS_FAR = (() => {
    const rng = mulberry32(0x515f);
    const shapes: string[] = [];
    for (let i = 0; i < 16; i++) {
        const x = 30 + i * 90 + rng() * 50;
        shapes.push(conifer(x, 214, 42 + rng() * 40, 20 + rng() * 14));
    }
    return shapes;
})();

const CONIFERS_NEAR = (() => {
    const rng = mulberry32(0x9a31);
    const shapes: string[] = [];
    for (let i = 0; i < 12; i++) {
        const x = 60 + i * 122 + rng() * 60;
        shapes.push(conifer(x, 262, 54 + rng() * 52, 26 + rng() * 18));
    }
    return shapes;
})();

/** The palm silhouettes that give the skyline its shape in the reference art. */
function Palm({ x, y, h, scale, flip }: { x: number; y: number; h: number; scale: number; flip?: boolean }) {
    return (
        <g transform={`translate(${x} ${y}) scale(${flip ? -scale : scale} ${scale})`}>
            <path d={`M-2.5 0 L-1.5 ${-h} L1.5 ${-h} L2.5 0 Z`} />
            <path d={`M0 ${-h} C-28 ${-h - 18} -52 ${-h - 12} -68 ${-h + 6} C-46 ${-h - 2} -22 ${-h - 6} 0 ${-h + 8} Z`} />
            <path d={`M0 ${-h} C28 ${-h - 20} 54 ${-h - 14} 70 ${-h + 4} C48 ${-h - 4} 24 ${-h - 8} 0 ${-h + 8} Z`} />
            <path d={`M0 ${-h} C-14 ${-h - 30} -10 ${-h - 50} 6 ${-h - 62} C-2 ${-h - 40} -2 ${-h - 20} 2 ${-h + 4} Z`} />
            <path d={`M0 ${-h} C16 ${-h - 26} 34 ${-h - 38} 52 ${-h - 36} C32 ${-h - 26} 14 ${-h - 14} 2 ${-h + 4} Z`} />
            <path d={`M0 ${-h} C-18 ${-h - 22} -38 ${-h - 32} -56 ${-h - 30} C-36 ${-h - 22} -16 ${-h - 12} -2 ${-h + 4} Z`} />
        </g>
    );
}

export default function NightScene() {
    return (
        <div className="scene" aria-hidden="true">
            <svg width="0" height="0" className="absolute">
                <defs>
                    {/* A cloud bank: dense dark body, moonlit along the top. */}
                    <linearGradient id="ns-cloud" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3a4f75" />
                        <stop offset="26%" stopColor="#212e4e" />
                        <stop offset="68%" stopColor="#141d36" />
                        <stop offset="100%" stopColor="#0a1020" />
                    </linearGradient>
                    {/* Banks sitting near the horizon are backlit, so they read
                        as near-silhouettes rather than moonlit tops. */}
                    <linearGradient id="ns-cloud-dark" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#25325a" />
                        <stop offset="30%" stopColor="#151f3c" />
                        <stop offset="100%" stopColor="#060a16" />
                    </linearGradient>
                    <symbol id="ns-cloudshape" viewBox="0 0 360 150">
                        <g fill="url(#ns-cloud)">
                            <ellipse cx="92" cy="96" rx="76" ry="40" />
                            <ellipse cx="158" cy="62" rx="62" ry="48" />
                            <ellipse cx="222" cy="50" rx="50" ry="40" />
                            <ellipse cx="272" cy="92" rx="66" ry="38" />
                            <ellipse cx="46" cy="110" rx="46" ry="28" />
                            <ellipse cx="318" cy="108" rx="40" ry="26" />
                            <rect x="30" y="94" width="300" height="46" rx="23" />
                        </g>
                    </symbol>
                    <symbol id="ns-cloudshape-dark" viewBox="0 0 360 150">
                        <g fill="url(#ns-cloud-dark)">
                            <ellipse cx="92" cy="96" rx="76" ry="40" />
                            <ellipse cx="158" cy="62" rx="62" ry="48" />
                            <ellipse cx="222" cy="50" rx="50" ry="40" />
                            <ellipse cx="272" cy="92" rx="66" ry="38" />
                            <ellipse cx="46" cy="110" rx="46" ry="28" />
                            <ellipse cx="318" cy="108" rx="40" ry="26" />
                            <rect x="30" y="94" width="300" height="46" rx="23" />
                        </g>
                    </symbol>
                </defs>
            </svg>

            <div className="scene-galaxy" />

            {STARS.map((star, i) => (
                <span
                    key={i}
                    className={`scene-star${star.twinkle ? " scene-star--twinkle" : ""}`}
                    style={{
                        top: `${star.top}%`,
                        left: `${star.left}%`,
                        width: `${star.size}px`,
                        height: `${star.size}px`,
                        opacity: star.opacity,
                        animationDuration: `${star.duration}s`,
                        animationDelay: `${star.delay}s`,
                        boxShadow: star.halo ? "0 0 6px 1.5px rgba(210, 233, 255, 0.8)" : undefined,
                    }}
                />
            ))}

            <div className="scene-moon" />

            {METEORS.map((meteor, i) => (
                <span
                    key={i}
                    className="scene-meteor"
                    style={{
                        top: `${meteor.top}%`,
                        left: `${meteor.left}%`,
                        width: `${meteor.width}px`,
                        animationDuration: `${meteor.duration}s`,
                        animationDelay: `${meteor.delay}s`,
                        ["--angle" as string]: `${meteor.angle}deg`,
                    }}
                />
            ))}

            {CLOUDS.map((cloud, i) => (
                <div
                    key={i}
                    className="scene-cloud"
                    style={{
                        top: `${cloud.top}%`,
                        width: `${cloud.width}vw`,
                        opacity: cloud.opacity,
                        animationDuration: `${cloud.duration}s`,
                        animationDelay: `${cloud.delay}s`,
                    }}
                >
                    <svg
                        viewBox="0 0 360 150"
                        className="w-full h-auto"
                        style={{ transform: cloud.flip ? "scaleX(-1)" : undefined }}
                    >
                        <use href={cloud.dark ? "#ns-cloudshape-dark" : "#ns-cloudshape"} />
                    </svg>
                </div>
            ))}

            <div className="scene-horizon" />

            {/* "slice" crops the sides on narrow screens instead of stretching the
                trees vertically, which turns them into spikes. */}
            <svg className="scene-trees" viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="xMidYMax slice">
                {/* Far bank: hazier, lower, slightly lifted in tone by the mist. */}
                <g fill="#18243f" opacity="0.85">
                    {CONIFERS_FAR.map((d, i) => (
                        <path key={i} d={d} />
                    ))}
                    <path d={canopyPath(0xa11ce, 216, 176, 208, 58)} />
                </g>

                {/* Near bank: taller and nearly black. */}
                <g fill="#03060f">
                    {CONIFERS_NEAR.map((d, i) => (
                        <path key={i} d={d} />
                    ))}
                    <path d={canopyPath(0xbee71, 264, 212, 252, 76)} />
                    <Palm x={232} y={266} h={64} scale={0.82} />
                    <Palm x={318} y={272} h={48} scale={0.62} flip />
                    <Palm x={1128} y={268} h={70} scale={0.9} flip />
                    <Palm x={1046} y={274} h={50} scale={0.66} />
                </g>
            </svg>

            {FIREFLIES.map((fly, i) => (
                <span
                    key={i}
                    className="scene-firefly"
                    style={{
                        left: `${fly.left}%`,
                        bottom: `${fly.bottom}%`,
                        width: `${fly.size}px`,
                        height: `${fly.size}px`,
                        animationDuration: `${fly.duration}s`,
                        animationDelay: `${fly.delay}s`,
                        ["--fx" as string]: `${fly.fx}vw`,
                        ["--fy" as string]: `${fly.fy}vh`,
                    }}
                />
            ))}
        </div>
    );
}
