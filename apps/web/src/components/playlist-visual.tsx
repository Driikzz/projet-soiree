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
      aria-label={`Illustration ${label}`}
    >
      <Icon aria-hidden="true" weight="fill" />
      <span aria-hidden="true" />
      <span aria-hidden="true" />
    </div>
  );
}
