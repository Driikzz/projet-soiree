import type { RealtimeResource } from "@songfest/shared";

import type { SongFestSocket } from "./socket";

type ResourceListener = (partyId: string, resources: readonly RealtimeResource[]) => void;

export const bindRealtimeListeners = (
  socket: SongFestSocket,
  onResourcesChanged: ResourceListener,
) => {
  const handlePartyChange = (event: { partyId: string }) => {
    onResourcesChanged(event.partyId, ["party", "participants"]);
  };
  const handleParticipantChange = (event: { partyId: string }) => {
    onResourcesChanged(event.partyId, ["party", "participants", "tracks"]);
  };
  const handlePlaylistChange = (event: { partyId: string }) => {
    onResourcesChanged(event.partyId, ["party", "playlists", "tracks"]);
  };
  const handleTrackChange = (event: { partyId: string }) => {
    onResourcesChanged(event.partyId, ["playlists", "tracks"]);
  };
  const handlePlaybackChange = (event: { partyId: string }) => {
    onResourcesChanged(event.partyId, ["playback"]);
  };
  const handleRewardChange = (event: { partyId: string }) => {
    onResourcesChanged(event.partyId, ["rewards"]);
  };
  const handleFlashChange = (event: { partyId: string }) => {
    onResourcesChanged(event.partyId, ["flash", "tracks", "playback"]);
  };
  const handleResync = (event: {
    partyId: string;
    data: { resources: readonly RealtimeResource[] };
  }) => {
    onResourcesChanged(event.partyId, event.data.resources);
  };

  socket.on("party:joined", handlePartyChange);
  socket.on("party:participant-joined", handleParticipantChange);
  socket.on("party:participant-left", handleParticipantChange);
  socket.on("party:settings-updated", handlePartyChange);
  socket.on("party:ended", handlePartyChange);
  socket.on("playlist:created", handlePlaylistChange);
  socket.on("playlist:updated", handlePlaylistChange);
  socket.on("playlist:activated", handlePlaylistChange);
  socket.on("playlist:scheduled", handlePlaylistChange);
  socket.on("playlist:vote-updated", handlePlaylistChange);
  socket.on("track:added", handleTrackChange);
  socket.on("track:removed", handleTrackChange);
  socket.on("track:vote-updated", handleTrackChange);
  socket.on("track:selected", handleTrackChange);
  socket.on("track:playing", handleTrackChange);
  socket.on("track:played", handleTrackChange);
  socket.on("playback:updated", handlePlaybackChange);
  socket.on("playback:skip-vote-updated", handlePlaybackChange);
  socket.on("reward:assigned", handleRewardChange);
  socket.on("reward:used", handleRewardChange);
  socket.on("flash:started", handleFlashChange);
  socket.on("flash:submitted", handleFlashChange);
  socket.on("flash:expired", handleFlashChange);
  socket.on("flash:cancelled", handleFlashChange);
  socket.on("flash:played", handleFlashChange);
  socket.on("state:resync-required", handleResync);

  return () => {
    socket.off("party:joined", handlePartyChange);
    socket.off("party:participant-joined", handleParticipantChange);
    socket.off("party:participant-left", handleParticipantChange);
    socket.off("party:settings-updated", handlePartyChange);
    socket.off("party:ended", handlePartyChange);
    socket.off("playlist:created", handlePlaylistChange);
    socket.off("playlist:updated", handlePlaylistChange);
    socket.off("playlist:activated", handlePlaylistChange);
    socket.off("playlist:scheduled", handlePlaylistChange);
    socket.off("playlist:vote-updated", handlePlaylistChange);
    socket.off("track:added", handleTrackChange);
    socket.off("track:removed", handleTrackChange);
    socket.off("track:vote-updated", handleTrackChange);
    socket.off("track:selected", handleTrackChange);
    socket.off("track:playing", handleTrackChange);
    socket.off("track:played", handleTrackChange);
    socket.off("playback:updated", handlePlaybackChange);
    socket.off("playback:skip-vote-updated", handlePlaybackChange);
    socket.off("reward:assigned", handleRewardChange);
    socket.off("reward:used", handleRewardChange);
    socket.off("flash:started", handleFlashChange);
    socket.off("flash:submitted", handleFlashChange);
    socket.off("flash:expired", handleFlashChange);
    socket.off("flash:cancelled", handleFlashChange);
    socket.off("flash:played", handleFlashChange);
    socket.off("state:resync-required", handleResync);
  };
};
