interface TrustedOriginInput {
  origin: string | undefined;
  host: string | undefined;
  protocol: string | undefined;
  configuredOrigin: string;
}

const normalizeProtocol = (protocol: string | undefined) =>
  protocol?.split(",", 1)[0]?.trim().replace(/:$/, "").toLowerCase();

const normalizeHost = (host: string | undefined) => host?.split(",", 1)[0]?.trim().toLowerCase();

export const isTrustedOrigin = ({
  origin,
  host,
  protocol,
  configuredOrigin,
}: TrustedOriginInput) => {
  if (origin === undefined) return false;

  try {
    const parsedOrigin = new URL(origin);
    if (parsedOrigin.origin === new URL(configuredOrigin).origin) return true;

    const requestHost = normalizeHost(host);
    const requestProtocol = normalizeProtocol(protocol);
    return (
      requestHost !== undefined &&
      requestProtocol !== undefined &&
      parsedOrigin.host.toLowerCase() === requestHost &&
      parsedOrigin.protocol === `${requestProtocol}:`
    );
  } catch {
    return false;
  }
};
