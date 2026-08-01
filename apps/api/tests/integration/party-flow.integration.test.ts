import { argon2id, hash } from "argon2";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  participantSessionSchema,
  partySummarySchema,
  playlistSummarySchema,
} from "@songfest/shared";

import { createApp } from "../../src/app.js";
import { prisma } from "../../src/lib/prisma.js";
import { resolvePlaybackTargetParty } from "../../src/modules/playback/playback.service.js";

const adminPassword = "integration-password-2026";
const webOrigin = "http://127.0.0.1:5173";

const assertDedicatedTestDatabase = () => {
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl === undefined) {
    throw new Error("DATABASE_URL is required for integration tests.");
  }

  const databaseName = new URL(databaseUrl).pathname.slice(1);
  if (!databaseName.endsWith("_test")) {
    throw new Error(`Refusing to clean the non-test database "${databaseName}".`);
  }
};

const cleanDatabase = async () => {
  await prisma.auditLog.deleteMany();
  await prisma.party.deleteMany();
  await prisma.admin.deleteMany();
};

const extractCookie = (setCookieHeader: unknown, cookieName: string) => {
  const cookies = Array.isArray(setCookieHeader)
    ? setCookieHeader.filter((value): value is string => typeof value === "string")
    : typeof setCookieHeader === "string"
      ? [setCookieHeader]
      : [];
  const cookie = cookies.find((value) => value.startsWith(`${cookieName}=`));

  if (cookie === undefined) {
    throw new Error(`Missing ${cookieName} cookie.`);
  }

  const value = cookie.slice(cookieName.length + 1).split(";", 1)[0];
  if (value === undefined) {
    throw new Error(`Empty ${cookieName} cookie.`);
  }

  return value;
};

describe("PostgreSQL party journey", () => {
  const app = createApp({ readinessCheck: async () => true });

  beforeAll(async () => {
    assertDedicatedTestDatabase();
    await cleanDatabase();

    const passwordHash = await hash(adminPassword, {
      type: argon2id,
      memoryCost: 19_456,
      timeCost: 2,
      parallelism: 1,
    });

    await prisma.admin.createMany({
      data: [
        { username: "organizer", passwordHash },
        { username: "other-organizer", passwordHash },
      ],
    });
  });

  afterAll(async () => {
    await cleanDatabase();
    await prisma.$disconnect();
  });

  it("creates, opens and joins a party while enforcing sessions, ownership and unique votes", async () => {
    const adminAgent = request.agent(app);
    const loginResponse = await adminAgent
      .post("/api/admin/auth/login")
      .set("Origin", webOrigin)
      .send({ username: "organizer", password: adminPassword })
      .expect(200);
    const adminCsrf = extractCookie(loginResponse.headers["set-cookie"], "songfest_admin_csrf");

    const createPartyResponse = await adminAgent
      .post("/api/admin/parties")
      .set("Origin", webOrigin)
      .set("X-CSRF-Token", adminCsrf)
      .send({ name: "Intégration SongFest" })
      .expect(201);
    const party = partySummarySchema.parse(createPartyResponse.body.party);

    expect(party.status).toBe("DRAFT");
    expect(party.code).toHaveLength(6);
    await request(app).get(`/api/parties/${party.code}`).expect(200);

    const otherAdminAgent = request.agent(app);
    const otherLoginResponse = await otherAdminAgent
      .post("/api/admin/auth/login")
      .set("Origin", webOrigin)
      .send({ username: "other-organizer", password: adminPassword })
      .expect(200);
    expect(
      extractCookie(otherLoginResponse.headers["set-cookie"], "songfest_admin_csrf"),
    ).toBeTruthy();
    await otherAdminAgent.get(`/api/admin/parties/${party.id}`).expect(404);
    await otherAdminAgent.get(`/api/admin/parties/${party.id}/spotify/status`).expect(404);

    await adminAgent
      .get(`/api/admin/parties/${party.id}/spotify/status`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({ isConfigured: false, isConnected: false });
      });

    await adminAgent
      .post(`/api/admin/parties/${party.id}/open`)
      .set("Origin", webOrigin)
      .set("X-CSRF-Token", adminCsrf)
      .expect(200);

    const createPlaylistResponse = await adminAgent
      .post(`/api/admin/parties/${party.id}/playlists`)
      .set("Origin", webOrigin)
      .set("X-CSRF-Token", adminCsrf)
      .send({
        name: "Classiques",
        description: "Les morceaux partagés par tout le monde.",
        visualKey: "sunset",
        quotaPerParticipant: 5,
        isOpen: true,
        trackVotesEnabled: true,
        explicitContentAllowed: false,
      })
      .expect(201);
    const playlist = playlistSummarySchema.parse(createPlaylistResponse.body.playlist);

    await adminAgent
      .post(`/api/admin/playlists/${playlist.id}/activate`)
      .set("Origin", webOrigin)
      .set("X-CSRF-Token", adminCsrf)
      .expect(200);

    const participantAgent = request.agent(app);
    const joinResponse = await participantAgent
      .post(`/api/parties/${party.code}/join`)
      .set("Origin", webOrigin)
      .send({ nickname: "Camille" })
      .expect(201);
    const participantSession = participantSessionSchema.parse(joinResponse.body);
    const participantCsrf = extractCookie(
      joinResponse.headers["set-cookie"],
      "songfest_guest_csrf",
    );

    await request(app)
      .post(`/api/parties/${party.code}/join`)
      .set("Origin", webOrigin)
      .send({ nickname: "camille" })
      .expect(409)
      .expect(({ body }) => {
        expect(body.error.code).toBe("NICKNAME_TAKEN");
      });

    const track = await prisma.playlistTrack.create({
      data: {
        playlistId: playlist.id,
        proposedByParticipantId: participantSession.participant.id,
        spotifyTrackId: "integration-track",
        spotifyUri: "spotify:track:integration-track",
        spotifyUrl: "https://open.spotify.com/track/integration-track",
        title: "Morceau d’intégration",
        artistNames: ["SongFest Tests"],
        spotifyArtistIds: ["integration-artist"],
        durationMs: 180_000,
      },
    });

    const voteRequest = () =>
      participantAgent
        .post(`/api/tracks/${track.id}/votes`)
        .set("Origin", webOrigin)
        .set("X-CSRF-Token", participantCsrf);

    await voteRequest()
      .expect(201)
      .expect(({ body }) => {
        expect(body.vote).toMatchObject({ voteCount: 1, participantHasVoted: true });
      });
    await voteRequest()
      .expect(201)
      .expect(({ body }) => {
        expect(body.vote).toMatchObject({ voteCount: 1, participantHasVoted: true });
      });

    expect(
      await prisma.trackVote.count({
        where: { trackId: track.id, participantId: participantSession.participant.id },
      }),
    ).toBe(1);

    const flashTrack = await prisma.playlistTrack.create({
      data: {
        playlistId: playlist.id,
        proposedByParticipantId: participantSession.participant.id,
        spotifyTrackId: "integration-flash-track",
        spotifyUri: "spotify:track:integration-flash-track",
        spotifyUrl: "https://open.spotify.com/track/integration-flash-track",
        title: "Morceau Flash d’intégration",
        artistNames: ["SongFest Flash"],
        spotifyArtistIds: ["integration-flash-artist"],
        durationMs: 170_000,
      },
    });
    await prisma.flashTurn.create({
      data: {
        partyId: party.id,
        playlistId: playlist.id,
        participantId: participantSession.participant.id,
        trackId: flashTrack.id,
        status: "SUBMITTED",
        expiresAt: new Date(Date.now() + 120_000),
        submittedAt: new Date(),
      },
    });

    await participantAgent
      .get(`/api/parties/${party.id}/playlists`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.playlists[0]).toMatchObject({
          id: playlist.id,
          isActive: true,
          participantTrackCount: 1,
          remainingTrackQuota: 4,
        });
      });

    await adminAgent
      .get(`/api/admin/parties/${party.id}/dashboard`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.participants[0]).toMatchObject({ contributionCount: 1 });
      });

    await prisma.participant.create({
      data: {
        partyId: party.id,
        nickname: "Morgan",
        normalizedNickname: "morgan",
        avatarSeed: "morgan",
      },
    });
    await prisma.party.update({
      where: { id: party.id },
      data: { status: "ACTIVE", startedAt: new Date() },
    });
    await prisma.playlistTrack.update({
      where: { id: track.id },
      data: { status: "PLAYING", playingAt: new Date() },
    });
    await prisma.playbackState.update({
      where: { partyId: party.id },
      data: {
        currentTrackId: track.id,
        spotifyTrackId: track.spotifyTrackId,
        durationMs: track.durationMs,
        isPlaying: true,
      },
    });

    const skipVoteRequest = () =>
      participantAgent
        .post(`/api/parties/${party.id}/playback/skip-vote`)
        .set("Origin", webOrigin)
        .set("X-CSRF-Token", participantCsrf);

    await skipVoteRequest()
      .expect(200)
      .expect(({ body }) => {
        expect(body.skipVote).toEqual({
          voteCount: 1,
          requiredVotes: 2,
          participantHasVoted: true,
          isAvailable: true,
        });
      });
    await skipVoteRequest().expect(200);
    expect(await prisma.trackSkipVote.count({ where: { trackId: track.id } })).toBe(1);

    await participantAgent
      .delete(`/api/parties/${party.id}/playback/skip-vote`)
      .set("Origin", webOrigin)
      .set("X-CSRF-Token", participantCsrf)
      .expect(200)
      .expect(({ body }) => {
        expect(body.skipVote.voteCount).toBe(0);
      });

    const [emptyPlaylist, nextPlaylist] = await Promise.all([
      prisma.partyPlaylist.create({
        data: {
          partyId: party.id,
          name: "Ambiance vide",
          visualKey: "midnight",
        },
      }),
      prisma.partyPlaylist.create({
        data: {
          partyId: party.id,
          name: "Ambiance suivante",
          visualKey: "electric",
        },
      }),
    ]);
    await prisma.playlistTrack.updateMany({
      where: { playlistId: playlist.id },
      data: { status: "PLAYED", playedAt: new Date() },
    });
    await prisma.playlistTrack.create({
      data: {
        playlistId: nextPlaylist.id,
        spotifyTrackId: "integration-next-playlist-track",
        spotifyUri: "spotify:track:integration-next-playlist-track",
        spotifyUrl: "https://open.spotify.com/track/integration-next-playlist-track",
        title: "Morceau de l’ambiance suivante",
        artistNames: ["SongFest Continuity"],
        spotifyArtistIds: ["integration-continuity-artist"],
        durationMs: 190_000,
      },
    });

    const playbackTarget = await resolvePlaybackTargetParty(party.id);

    expect(emptyPlaylist.id).not.toBe(nextPlaylist.id);
    expect(playbackTarget?.scheduledPlaylistId).toBe(nextPlaylist.id);
    expect(
      await prisma.party.findUnique({
        where: { id: party.id },
        select: { scheduledPlaylistId: true },
      }),
    ).toEqual({ scheduledPlaylistId: nextPlaylist.id });
  });
});
