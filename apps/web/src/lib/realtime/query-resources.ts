import type { RealtimeResource } from "@songfest/shared";

export const getQueryKeysForResources = (
  partyId: string,
  resources: readonly RealtimeResource[],
): readonly (readonly unknown[])[] => {
  const keys: (readonly unknown[])[] = [];
  if (resources.length > 0) {
    keys.push(["admin-dashboard", partyId]);
  }

  if (resources.includes("party") || resources.includes("participants")) {
    keys.push(["admin-party", partyId], ["participant-session"]);
  }
  if (resources.includes("playlists")) {
    keys.push(["admin-playlists", partyId], ["participant-playlists", partyId]);
  }
  if (resources.includes("tracks")) {
    keys.push(["playlist-tracks"]);
  }
  if (resources.includes("playback")) {
    keys.push(["spotify-playback", partyId], ["party-playback", partyId]);
  }
  if (resources.includes("rewards")) {
    keys.push(["participant-rewards"], ["admin-rewards", partyId]);
  }
  if (resources.includes("flash")) {
    keys.push(["party-flash", partyId]);
  }

  return keys;
};
