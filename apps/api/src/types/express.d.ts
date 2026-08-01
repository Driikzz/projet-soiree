import type { AdminAuthentication, ParticipantAuthentication } from "../modules/auth/auth.types.js";

declare global {
  namespace Express {
    interface Request {
      adminAuth?: AdminAuthentication;
      participantAuth?: ParticipantAuthentication;
    }
  }
}

export {};
