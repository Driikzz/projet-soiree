import { AppError } from "../../errors/app-error.js";
import { prisma } from "../../lib/prisma.js";
import {
  SPOTIFY_ACCESS_TOKEN_MARGIN_MS,
  SPOTIFY_ACCOUNTS_URL,
  SPOTIFY_API_URL,
  SPOTIFY_SCOPES,
} from "./spotify.constants.js";
import {
  spotifyErrorResponseSchema,
  spotifyProfileSchema,
  spotifyTokenResponseSchema,
} from "./spotify.external-schemas.js";
import { getSpotifyConfiguration, isSpotifyConfigured } from "./spotify.config.js";
import { decryptToken, encryptToken } from "./token-encryption.js";

const refreshes = new Map<string, Promise<string>>();

const parseJson = async (response: Response): Promise<unknown> =>
  response.json().catch(() => undefined);

const spotifyBasicAuthorization = (clientId: string, clientSecret: string) =>
  `Basic ${Buffer.from(`${clientId}:${clientSecret}`, "utf8").toString("base64")}`;

const createRefreshTokenExpiry = (from: Date) => {
  const expiry = new Date(from);
  expiry.setUTCMonth(expiry.getUTCMonth() + 6);
  return expiry;
};

const requestToken = async (body: URLSearchParams) => {
  const configuration = getSpotifyConfiguration();
  const response = await fetch(`${SPOTIFY_ACCOUNTS_URL}/api/token`, {
    method: "POST",
    headers: {
      Authorization: spotifyBasicAuthorization(configuration.clientId, configuration.clientSecret),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  }).catch(() => {
    throw new AppError(502, "SPOTIFY_REQUEST_FAILED", "Spotify est momentanément inaccessible.");
  });
  const payload = await parseJson(response);

  if (!response.ok) {
    const spotifyError = spotifyErrorResponseSchema.safeParse(payload);
    const errorName =
      spotifyError.success && typeof spotifyError.data.error === "string"
        ? spotifyError.data.error
        : undefined;

    if (errorName === "invalid_grant") {
      throw new AppError(
        401,
        "SPOTIFY_AUTH_REQUIRED",
        "Spotify a refusé le code OAuth. Vérifie l’URL de callback puis reconnecte le compte.",
        {
          spotifyError: errorName,
          ...(spotifyError.success && spotifyError.data.error_description !== undefined
            ? { spotifyDescription: spotifyError.data.error_description }
            : {}),
        },
      );
    }

    throw new AppError(502, "SPOTIFY_OAUTH_FAILED", "Spotify a refusé l’authentification.", {
      ...(errorName === undefined ? {} : { spotifyError: errorName }),
      ...(spotifyError.success && spotifyError.data.error_description !== undefined
        ? { spotifyDescription: spotifyError.data.error_description }
        : {}),
    });
  }

  const parsedToken = spotifyTokenResponseSchema.safeParse(payload);
  if (!parsedToken.success) {
    throw new AppError(
      502,
      "SPOTIFY_OAUTH_FAILED",
      "Spotify a renvoyé une réponse d’authentification invalide.",
    );
  }

  return parsedToken.data;
};

const getSpotifyProfile = async (accessToken: string) => {
  const response = await fetch(`${SPOTIFY_API_URL}/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  }).catch(() => {
    throw new AppError(502, "SPOTIFY_REQUEST_FAILED", "Spotify est momentanément inaccessible.");
  });
  const payload = await parseJson(response);
  const profile = spotifyProfileSchema.safeParse(payload);

  if (!response.ok || !profile.success) {
    throw new AppError(502, "SPOTIFY_OAUTH_FAILED", "Le profil Spotify n’a pas pu être vérifié.");
  }

  const accountId = profile.data.account_id ?? profile.data.id;
  if (accountId === undefined) {
    throw new AppError(
      502,
      "SPOTIFY_OAUTH_FAILED",
      "Le profil Spotify ne contient aucun identifiant de compte.",
    );
  }

  return accountId;
};

export const exchangeSpotifyAuthorizationCode = async (adminId: string, code: string) => {
  const configuration = getSpotifyConfiguration();
  const token = await requestToken(
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: configuration.redirectUri,
    }),
  );

  if (token.refresh_token === undefined) {
    throw new AppError(
      502,
      "SPOTIFY_OAUTH_FAILED",
      "Spotify n’a pas fourni de jeton de renouvellement.",
    );
  }
  const refreshToken = token.refresh_token;

  const scopes = token.scope.split(" ").filter(Boolean);
  const missingScope = SPOTIFY_SCOPES.find((scope) => !scopes.includes(scope));
  if (missingScope !== undefined) {
    throw new AppError(
      403,
      "SPOTIFY_OAUTH_FAILED",
      "Les autorisations Spotify nécessaires n’ont pas toutes été accordées.",
    );
  }

  const spotifyAccountId = await getSpotifyProfile(token.access_token);
  const now = new Date();
  const accessTokenExpiresAt = new Date(now.getTime() + token.expires_in * 1_000);
  const refreshTokenExpiresAt = createRefreshTokenExpiry(now);

  await prisma.$transaction(async (transaction) => {
    await transaction.spotifyConnection.deleteMany({
      where: { spotifyAccountId, adminId: { not: adminId } },
    });
    await transaction.spotifyConnection.upsert({
      where: { adminId },
      update: {
        spotifyAccountId,
        accessTokenEncrypted: encryptToken(token.access_token, configuration.encryptionKey),
        refreshTokenEncrypted: encryptToken(refreshToken, configuration.encryptionKey),
        accessTokenExpiresAt,
        refreshTokenExpiresAt,
        scopes,
        connectedAt: now,
      },
      create: {
        adminId,
        spotifyAccountId,
        accessTokenEncrypted: encryptToken(token.access_token, configuration.encryptionKey),
        refreshTokenEncrypted: encryptToken(refreshToken, configuration.encryptionKey),
        accessTokenExpiresAt,
        refreshTokenExpiresAt,
        scopes,
      },
    });
    await transaction.auditLog.create({
      data: {
        actorType: "ADMIN",
        adminActorId: adminId,
        action: "spotify.connected",
        entityType: "SpotifyConnection",
      },
    });
  });
};

const refreshSpotifyAccessToken = async (adminId: string) => {
  const connection = await prisma.spotifyConnection.findUnique({
    where: { adminId },
  });
  if (connection === null || connection.refreshTokenExpiresAt <= new Date()) {
    if (connection !== null) {
      await prisma.spotifyConnection.delete({ where: { adminId } });
    }
    throw new AppError(
      401,
      "SPOTIFY_AUTH_REQUIRED",
      "La connexion Spotify a expiré. Reconnecte le compte.",
    );
  }

  const configuration = getSpotifyConfiguration();
  const refreshToken = decryptToken(connection.refreshTokenEncrypted, configuration.encryptionKey);

  try {
    const token = await requestToken(
      new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    );
    const accessTokenExpiresAt = new Date(Date.now() + token.expires_in * 1_000);

    await prisma.spotifyConnection.update({
      where: { adminId },
      data: {
        accessTokenEncrypted: encryptToken(token.access_token, configuration.encryptionKey),
        accessTokenExpiresAt,
        scopes: token.scope === "" ? connection.scopes : token.scope.split(" ").filter(Boolean),
        ...(token.refresh_token === undefined
          ? {}
          : {
              refreshTokenEncrypted: encryptToken(token.refresh_token, configuration.encryptionKey),
            }),
      },
    });

    return token.access_token;
  } catch (error: unknown) {
    if (error instanceof AppError && error.code === "SPOTIFY_AUTH_REQUIRED") {
      await prisma.spotifyConnection.delete({ where: { adminId } }).catch(() => undefined);
    }
    throw error;
  }
};

export const getSpotifyAccessToken = async (adminId: string, forceRefresh = false) => {
  const connection = await prisma.spotifyConnection.findUnique({
    where: { adminId },
    select: {
      accessTokenEncrypted: true,
      accessTokenExpiresAt: true,
      refreshTokenExpiresAt: true,
    },
  });
  if (connection === null) {
    throw new AppError(
      401,
      "SPOTIFY_AUTH_REQUIRED",
      "Connecte le compte Spotify de l’organisateur.",
    );
  }

  const configuration = getSpotifyConfiguration();
  const accessTokenIsUsable =
    !forceRefresh &&
    connection.accessTokenEncrypted !== null &&
    connection.accessTokenExpiresAt.getTime() > Date.now() + SPOTIFY_ACCESS_TOKEN_MARGIN_MS;

  if (accessTokenIsUsable && connection.accessTokenEncrypted !== null) {
    return decryptToken(connection.accessTokenEncrypted, configuration.encryptionKey);
  }

  const activeRefresh = refreshes.get(adminId);
  if (activeRefresh !== undefined) {
    return activeRefresh;
  }

  const refresh = refreshSpotifyAccessToken(adminId).finally(() => {
    refreshes.delete(adminId);
  });
  refreshes.set(adminId, refresh);
  return refresh;
};

export const getSpotifyConnectionStatus = async (adminId: string) => {
  if (!isSpotifyConfigured()) {
    return {
      isConfigured: false,
      isConnected: false,
      redirectUri: null,
      connectedAt: null,
      refreshTokenExpiresAt: null,
      scopes: [],
    };
  }

  const connection = await prisma.spotifyConnection.findUnique({
    where: { adminId },
    select: {
      connectedAt: true,
      refreshTokenExpiresAt: true,
      scopes: true,
    },
  });

  return {
    isConfigured: true,
    isConnected: connection !== null && connection.refreshTokenExpiresAt.getTime() > Date.now(),
    redirectUri: getSpotifyConfiguration().redirectUri,
    connectedAt: connection?.connectedAt.toISOString() ?? null,
    refreshTokenExpiresAt: connection?.refreshTokenExpiresAt.toISOString() ?? null,
    scopes: connection?.scopes ?? [],
  };
};
