const ACTION_WINDOW_MS = 60_000;
const MAX_ACTIONS_PER_WINDOW = 30;

export const consumeSocketAction = (timestamps: number[], now = Date.now()) => {
  const windowStartsAt = now - ACTION_WINDOW_MS;
  const recentTimestamps = timestamps.filter((timestamp) => timestamp > windowStartsAt);

  if (recentTimestamps.length >= MAX_ACTIONS_PER_WINDOW) {
    return { allowed: false, timestamps: recentTimestamps };
  }

  recentTimestamps.push(now);
  return { allowed: true, timestamps: recentTimestamps };
};
