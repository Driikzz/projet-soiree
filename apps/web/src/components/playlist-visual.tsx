import {
  MoonStars,
  Shuffle,
  SpeakerHifi,
  SquaresFour,
  SunHorizon,
  Waveform,
} from "@phosphor-icons/react";

import type { PlaylistVisualKey } from "@songfest/shared";

const visualIcons = {
  sunset: SunHorizon,
  pixel: SquaresFour,
  bass: SpeakerHifi,
  pulse: Waveform,
  midnight: MoonStars,
  free: Shuffle,
} satisfies Record<PlaylistVisualKey, typeof SunHorizon>;

interface PlaylistVisualProps {
  visualKey: PlaylistVisualKey;
  label: string;
  compact?: boolean;
}

export function PlaylistVisual({ visualKey, label, compact = false }: PlaylistVisualProps) {
  const Icon = visualIcons[visualKey];

  return (
    <div
      className={`playlist-visual visual-${visualKey}${compact ? " compact-visual" : ""}`}
      role="img"
      aria-label={`Vinyle de l’ambiance ${label}`}
    >
      <span className="playlist-vinyl" aria-hidden="true">
        <span className="playlist-vinyl-label">
          <Icon weight="fill" />
          <i />
        </span>
      </span>
      <span className="playlist-visual-catalogue" aria-hidden="true">
        ROT/MOOD
      </span>
    </div>
  );
}
