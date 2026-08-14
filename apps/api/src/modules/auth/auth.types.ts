export interface AdminAuthentication {
  sessionId: string;
  csrfTokenHash: string;
  admin: {
    id: string;
    username: string | null;
    displayName: string;
    email: string | null;
  };
}

export interface ParticipantAuthentication {
  sessionId: string;
  csrfTokenHash: string;
  participant: {
    id: string;
    partyId: string;
    nickname: string;
    avatarSeed: string;
    isBlocked: boolean;
  };
}
