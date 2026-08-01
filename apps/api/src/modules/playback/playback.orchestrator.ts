import { logger } from "../../lib/logger.js";
import { prisma } from "../../lib/prisma.js";
import { synchronizeFlashTurnsForParty } from "../flash/flash.service.js";
import { synchronizePartyPlayback } from "./playback.service.js";

let playbackTimer: NodeJS.Timeout | undefined;

const reportCycleFailure = (error: unknown) => {
  logger.error(
    {
      errorCode: error instanceof Error && "code" in error ? String(error.code) : "unknown",
    },
    "Playback cycle failed",
  );
};

const synchronizeActiveParties = async () => {
  const parties = await prisma.party.findMany({
    where: {
      status: "ACTIVE",
    },
    select: {
      id: true,
      activePlaylistId: true,
      selectedDeviceId: true,
    },
  });

  const results = await Promise.allSettled(
    parties.map(async (party) => {
      await synchronizeFlashTurnsForParty(party.id);
      if (party.activePlaylistId !== null && party.selectedDeviceId !== null) {
        await synchronizePartyPlayback(party.id);
      }
    }),
  );
  results.forEach((result, index) => {
    if (result.status === "rejected") {
      logger.warn(
        {
          partyId: parties[index]?.id,
          errorCode:
            result.reason instanceof Error && "code" in result.reason
              ? String(result.reason.code)
              : "unknown",
        },
        "Playback synchronization failed",
      );
    }
  });
};

export const startPlaybackOrchestrator = (intervalMs: number) => {
  if (playbackTimer !== undefined) {
    return;
  }

  void synchronizeActiveParties().catch(reportCycleFailure);
  playbackTimer = setInterval(() => {
    void synchronizeActiveParties().catch(reportCycleFailure);
  }, intervalMs);
  playbackTimer.unref();
};

export const stopPlaybackOrchestrator = () => {
  if (playbackTimer !== undefined) {
    clearInterval(playbackTimer);
    playbackTimer = undefined;
  }
};
