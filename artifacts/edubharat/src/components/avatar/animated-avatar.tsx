import { useEffect, useState } from "react";
import type { AvatarProps } from "./types";
import { useMouthLevel, type MouthLevel } from "@/lib/use-edge-tts";

const sizeClasses: Record<string, { container: string; image: string; ring: string; px: number }> = {
  sm: { container: "w-16 h-16", image: "w-16 h-16", ring: "w-16 h-16", px: 64 },
  md: { container: "w-24 h-24", image: "w-24 h-24", ring: "w-24 h-24", px: 96 },
  lg: { container: "w-32 h-32", image: "w-32 h-32", ring: "w-32 h-32", px: 128 },
  xl: { container: "w-40 h-40", image: "w-40 h-40", ring: "w-40 h-40", px: 160 },
};

/** Fallback cartoon SVG when no real image is available */
function FallbackSVG({
  gender,
  isSpeaking,
  isThinking,
  size,
  mouth,
}: {
  gender: "male" | "female";
  isSpeaking: boolean;
  isThinking: boolean;
  size: string;
  mouth: MouthLevel;
}) {
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 140);
    }, 3500 + Math.random() * 1500);
    return () => clearInterval(id);
  }, []);

  const hairColor = gender === "female" ? "#7A4BCB" : "#3F2510";
  const accentColor = gender === "female" ? "#F472B6" : "#60A5FA";
  const sz = sizeClasses[size] ?? sizeClasses.md;

  // Continuous mouth shape driven by real audio: openness controls how far
  // the lower lip drops (and how visible the dark "inside" ellipse is);
  // width nudges the corners narrower for brighter/higher sounds and wider
  // for open vowels — two cheap signals, but enough to read as a mouth
  // actually forming shapes rather than a single flap toggling on/off.
  const openness = isSpeaking ? mouth.openness : 0;
  const width = isSpeaking ? mouth.width : 0;
  const halfSpread = 28 - width * 4;
  const controlY = 128 + 4 + openness * 16;
  const mouthPath = `M ${100 - halfSpread} 128 Q 100 ${controlY.toFixed(1)} ${100 + halfSpread} 128`;

  return (
    <div className={`${sz.container} relative rounded-2xl overflow-hidden bg-gradient-to-b from-orange-50 via-white to-primary/10 border-2 border-primary/20`}>
      <svg viewBox="0 0 200 200" className="w-full h-full">
        <defs>
          <radialGradient id="skin-fb" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#FFE1C2" />
            <stop offset="100%" stopColor="#E8AA78" />
          </radialGradient>
        </defs>
        <path d="M 38 195 Q 100 160 162 195 L 162 200 L 38 200 Z" fill="url(#skin-fb)" />
        <path d="M 82 158 L 100 178 L 118 158 L 100 154 Z" fill={accentColor} opacity="0.85" />
        <ellipse cx="100" cy="76" rx="79" ry="82" fill={hairColor} />
        <ellipse cx="100" cy="100" rx="70" ry="78" fill="url(#skin-fb)" />
        <path d={`M 24 78 Q 32 16 100 16 Q 168 16 176 78 Q 160 34 100 36 Q 40 34 24 78`} fill={hairColor} />
        <path d="M 61 74 Q 78 67 90 72" stroke={hairColor} strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M 110 72 Q 122 67 139 74" stroke={hairColor} strokeWidth="4" fill="none" strokeLinecap="round" />
        <ellipse cx="75" cy="90" rx="11" ry={blink ? 2 : 14} fill="#243043" />
        <ellipse cx="125" cy="90" rx="11" ry={blink ? 2 : 14} fill="#243043" />
        {!blink && <>
          <circle cx="79" cy="85" r="3.5" fill="white" />
          <circle cx="129" cy="85" r="3.5" fill="white" />
        </>}
        <path d="M 97 108 Q 100 116 103 108" stroke="#C68642" strokeWidth="2" fill="none" strokeLinecap="round" />
        <ellipse cx="65" cy="118" rx="14" ry="9" fill="#F4A261" opacity="0.18" />
        <ellipse cx="135" cy="118" rx="14" ry="9" fill="#F4A261" opacity="0.18" />
        {/* Dark mouth interior — only visible once the mouth actually opens */}
        <ellipse
          cx="100" cy={128 + openness * 5}
          rx={halfSpread - 8} ry={1.5 + openness * 11}
          fill="#7A2020" opacity={openness > 0.06 ? 0.85 : 0}
        />
        <path d={mouthPath} stroke="#B91C1C" strokeWidth="3" fill="none" strokeLinecap="round" />
        {isThinking && (
          <g>
            {[80, 100, 120].map((cx, i) => (
              <circle key={cx} cx={cx} cy="170" r="5" fill={hairColor} opacity="0.7">
                <animate attributeName="opacity" values="0.7;0.2;0.7" dur="1.2s" repeatCount="indefinite" begin={`${i * 0.4}s`} />
              </circle>
            ))}
          </g>
        )}
      </svg>
    </div>
  );
}

/**
 * Real-audio-driven "talking mouth" for real portrats. We isolate a tight
 * band over the mouth/chin (~49%-66% of the portrait height) via a CSS mask
 * and apply a small jaw-drop hinged at the upper lip — the same visual
 * technique as before, but now the drop amount is the ACTUAL decoded
 * loudness of the audio currently playing (`mouth.openness`, 0-1), not a
 * randomised timer. `mouth.width` adds a hair of horizontal narrowing for
 * brighter/higher sounds. A short CSS transition smooths the ~30-60fps
 * updates into continuous motion without any JS-side easing math. Only
 * mounts while speaking, so the idle photo is pixel-identical to before.
 */
function PhotoMouth({ imageSrc, px, mouth }: { imageSrc: string; px: number; mouth: MouthLevel }) {
  // Keep the portrait completely locked in its frame. The previous jaw-drop
  // translated the masked copy of the whole photo, which made the face bob up
  // and down. This tiny scale is confined to the mouth band by the mask, so
  // only the lips/chin give a speaking cue; the head, shoulders, and frame stay still.
  // The mouth band is deliberately stronger than the old 1.8% puppet-jaw.
  // At portrait size that was effectively invisible. Keep the motion confined
  // to the mouth/chin mask so the face never looks stretched.
  const scaleY = (1 + 0.008 + mouth.openness * 0.052).toFixed(3);
  const scaleX = (1 - mouth.width * 0.018).toFixed(3);
  const jawDrop = (mouth.openness * 1.8).toFixed(2);

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        // Only a tight band over the mouth/chin is part of the animated copy; the
        // upper face and everything below the chin (neck, collar, chest) is fully
        // masked out so it can never move.
        //
        // IMPORTANT: gradient stops use ONE colour (white) with only the alpha
        // varying — never transparent-vs-black. CSS mask gradients are read as
        // *luminance* by some browsers/engines and *alpha* by others; black has
        // zero luminance either way, so a transparent→black→black→transparent
        // gradient can collapse to "fully hidden everywhere" under a luminance
        // reading. That un-masks nothing, so the WHOLE photo — not just the
        // mouth band — is what visibly moves. White has maximum luminance AND
        // carries the alpha, so this gradient masks correctly under either
        // interpretation. Do not change these back to transparent/black.
        WebkitMaskImage: "linear-gradient(to bottom, rgba(255,255,255,0) 49%, rgba(255,255,255,1) 54%, rgba(255,255,255,1) 61%, rgba(255,255,255,0) 66%)",
        maskImage: "linear-gradient(to bottom, rgba(255,255,255,0) 49%, rgba(255,255,255,1) 54%, rgba(255,255,255,1) 61%, rgba(255,255,255,0) 66%)",
      }}
      aria-hidden="true"
    >
      <img
        src={imageSrc}
        alt=""
        width={px}
        height={px}
        className="w-full h-full object-cover object-top"
        style={{
          transformOrigin: "50% 55%",
          transform: `translateY(${jawDrop}px) scaleY(${scaleY}) scaleX(${scaleX})`,
          transition: "transform 55ms linear",
        }}
        draggable={false}
      />
    </div>
  );
}

export function AnimatedAvatar({
  name,
  subtitle,
  isSpeaking,
  isThinking = false,
  gender = "female",
  size = "md",
  imageSrc,
  hideCaption = false,
}: AvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);
  // Live, audio-driven mouth shape — closed (0,0) whenever this avatar isn't
  // the one currently speaking, so idle avatars never react to someone else.
  const mouth = useMouthLevel(isSpeaking);

  // Reset failure state whenever the source changes so switching tutors works correctly
  useEffect(() => { setImgFailed(false); }, [imageSrc]);

  const sz = sizeClasses[size] ?? sizeClasses.md;
  const hasImage = imageSrc && !imgFailed;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative">
        {hasImage ? (
          <div
            className={`${sz.container} rounded-2xl overflow-hidden shadow-lg relative ${isSpeaking ? "avatar-speaking" : ""}`}
          >
            <img
              src={imageSrc}
              alt={name}
              width={sz.px}
              height={sz.px}
              className={`w-full h-full object-cover object-top transition-all duration-75 ${isSpeaking ? "brightness-105" : ""}`}
              onError={() => setImgFailed(true)}
              draggable={false}
            />
            {/* Talking mouth — real-audio-driven jaw movement on the photo while speaking */}
            {isSpeaking && imageSrc && <PhotoMouth imageSrc={imageSrc} px={sz.px} mouth={mouth} />}
            {/* Thinking indicator */}
            {isThinking && !isSpeaking && (
              <div className="absolute bottom-0 left-0 right-0 flex justify-center pb-1.5">
                <span className="text-[8px] font-bold text-white bg-black/40 rounded-full px-2 py-0.5">
                  thinking…
                </span>
              </div>
            )}
          </div>
        ) : (
          <FallbackSVG
            gender={gender}
            isSpeaking={isSpeaking}
            isThinking={isThinking}
            size={size}
            mouth={mouth}
          />
        )}

        {/* AI badge */}
        <span className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground text-[9px] font-extrabold rounded-full px-1.5 py-0.5 leading-none shadow-md border border-white">
          AI
        </span>
      </div>

      {!hideCaption && (
        <div className="text-center">
          <p className="text-xs font-bold text-secondary leading-tight">{name}</p>
          <p className="text-[10px] text-muted-foreground leading-tight">{subtitle}</p>
        </div>
      )}
    </div>
  );
}
