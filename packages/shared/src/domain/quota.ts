export interface QuotaContext {
  baseQuota: number;
  extraTrackUses: number;
  activeContributionCount: number;
}

export const calculateRemainingQuota = ({
  baseQuota,
  extraTrackUses,
  activeContributionCount,
}: QuotaContext): number => Math.max(0, baseQuota + extraTrackUses - activeContributionCount);
