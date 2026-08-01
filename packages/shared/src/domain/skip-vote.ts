export const calculateRequiredSkipVotes = (activeParticipantCount: number) =>
  Math.floor(Math.max(0, activeParticipantCount) / 2) + 1;
