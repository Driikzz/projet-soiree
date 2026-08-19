const getMarkVariant = (seed: string) => {
  let hash = 0;
  for (const character of seed) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return (hash % 6) + 1;
};

export function AvatarMark({ seed, label }: { seed: string; label: string }) {
  return (
    <span
      className={`rotate-avatar-mark mark-${getMarkVariant(seed)}`}
      role="img"
      aria-label={`Mark de ${label}`}
    >
      <i />
      <i />
    </span>
  );
}
