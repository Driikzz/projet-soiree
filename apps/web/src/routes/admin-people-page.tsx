import { DotsThree, Gift, LockKey, UsersThree } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";

import type { AdminParticipant, AssignRewardRequest, RewardType } from "@songfest/shared";

import { AdminPartyNav } from "../components/admin-party-nav";
import { AvatarMark } from "../components/avatar-mark";
import { FormError } from "../components/form-error";
import { LoadingPage } from "../components/loading-page";
import { RewardAssignment } from "../components/reward-assignment";
import { RotReference } from "../components/rot-reference";
import { assignAdminReward, blockAdminParticipant, getAdminDashboard } from "../lib/api/admin";
import { getAdminParty } from "../lib/api/parties";
import { usePartyRealtime } from "../lib/realtime/use-party-realtime";

const rewardShortLabels: Record<RewardType, string> = {
  EXTRA_TRACK: "Ajout +1",
  PRIORITY_TRACK: "Prioritaire",
  DOUBLE_TRACK: "Double titre",
  CHOOSE_NEXT_PLAYLIST: "Choix ambiance",
};

const getAvailableRewardCount = (participant: AdminParticipant) =>
  participant.rewards
    .filter((reward) => reward.status === "AVAILABLE")
    .reduce((total, reward) => total + reward.usesRemaining, 0);

const formatJoinTime = (joinedAt: string) =>
  new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(joinedAt));

export function AdminPeoplePage() {
  const { partyId = "" } = useParams();
  const queryClient = useQueryClient();
  usePartyRealtime(partyId);

  const partyQuery = useQuery({
    queryKey: ["admin-party", partyId],
    queryFn: ({ signal }) => getAdminParty(partyId, signal),
    enabled: partyId !== "",
  });
  const dashboardQuery = useQuery({
    queryKey: ["admin-dashboard", partyId],
    queryFn: ({ signal }) => getAdminDashboard(partyId, signal),
    enabled: partyId !== "",
  });

  const refreshPeople = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard", partyId] }),
      queryClient.invalidateQueries({ queryKey: ["admin-party", partyId] }),
    ]);
  };
  const blockMutation = useMutation({
    mutationFn: (participantId: string) => blockAdminParticipant(partyId, participantId),
    onSuccess: refreshPeople,
  });
  const rewardMutation = useMutation({
    mutationFn: (input: AssignRewardRequest) => assignAdminReward(input),
    onSuccess: refreshPeople,
  });

  if (partyQuery.isPending || dashboardQuery.isPending) {
    return <LoadingPage />;
  }

  const party = partyQuery.data?.party;
  const dashboard = dashboardQuery.data;
  if (party === undefined || dashboard === undefined) {
    const error = partyQuery.error ?? dashboardQuery.error;
    return (
      <main className="page-shell compact-shell">
        <p className="eyebrow">People indisponible</p>
        <h1 className="screen-title">La liste ne peut pas être chargée.</h1>
        <FormError message={error instanceof Error ? error.message : undefined} />
      </main>
    );
  }

  const activeCount = dashboard.participants.filter(
    (participant) => participant.isActive && !participant.isBlocked,
  ).length;
  const contributionCount = dashboard.participants.reduce(
    (total, participant) => total + participant.contributionCount,
    0,
  );
  const actionError = blockMutation.error ?? rewardMutation.error;

  const requestBlock = (participant: AdminParticipant) => {
    if (
      window.confirm(
        `Exclure ${participant.nickname} de la rotation ? La personne perdra immédiatement son accès.`,
      )
    ) {
      blockMutation.mutate(participant.id);
    }
  };

  return (
    <main className="page-shell host-party-shell admin-people-shell">
      <AdminPartyNav partyId={partyId} partyName={party.name} />

      <header className="host-people-heading">
        <div>
          <RotReference code={party.code} live={party.status === "ACTIVE"} />
          <p className="eyebrow">The people</p>
          <h1>La soirée, c’est eux.</h1>
        </div>
        <dl>
          <div>
            <dt>Dans la salle</dt>
            <dd>{activeCount.toString().padStart(2, "0")}</dd>
          </div>
          <div>
            <dt>Morceaux proposés</dt>
            <dd>{contributionCount.toString().padStart(2, "0")}</dd>
          </div>
        </dl>
      </header>

      <FormError message={actionError instanceof Error ? actionError.message : undefined} />

      <section className="host-people-register" aria-labelledby="host-people-title">
        <header>
          <h2 id="host-people-title">Participants</h2>
          <span>
            {dashboard.participants.length} personne
            {dashboard.participants.length === 1 ? "" : "s"}
          </span>
        </header>

        {dashboard.participants.length === 0 ? (
          <div className="host-people-empty">
            <UsersThree aria-hidden="true" weight="light" />
            <h3>La face est encore vide.</h3>
            <p>Le premier invité apparaîtra ici dès qu’il aura rejoint la rotation.</p>
          </div>
        ) : (
          <div className="host-people-list">
            {dashboard.participants.map((participant, index) => {
              const availableRewards = participant.rewards.filter(
                (reward) => reward.status === "AVAILABLE",
              );
              return (
                <article
                  className={`host-person${participant.isBlocked ? " is-blocked" : ""}`}
                  key={participant.id}
                >
                  <span className="host-person-index" aria-hidden="true">
                    {(index + 1).toString().padStart(2, "0")}
                  </span>
                  <AvatarMark seed={participant.avatarSeed} label={participant.nickname} />
                  <div className="host-person-copy">
                    <div>
                      <h3>{participant.nickname}</h3>
                      <span
                        className={`host-person-state${
                          participant.isActive && !participant.isBlocked ? " is-online" : ""
                        }`}
                      >
                        {participant.isBlocked
                          ? "Exclu"
                          : participant.isActive
                            ? "Dans la salle"
                            : "Hors ligne"}
                      </span>
                    </div>
                    <p>
                      {participant.contributionCount} track
                      {participant.contributionCount === 1 ? "" : "s"} · entré à{" "}
                      {formatJoinTime(participant.joinedAt)}
                    </p>
                    {availableRewards.length > 0 && (
                      <div className="host-person-rewards" aria-label="Ressources disponibles">
                        {availableRewards.map((reward) => (
                          <span key={reward.id}>
                            {rewardShortLabels[reward.type]} ×{reward.usesRemaining}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="host-person-resource" aria-label="Ressources restantes">
                    <Gift aria-hidden="true" weight="fill" />
                    <strong>{getAvailableRewardCount(participant)}</strong>
                    <small>ressources</small>
                  </div>
                  <details className="host-person-actions">
                    <summary aria-label={`Gérer ${participant.nickname}`}>
                      <DotsThree aria-hidden="true" weight="bold" />
                    </summary>
                    <div>
                      <RewardAssignment
                        participantName={participant.nickname}
                        disabled={rewardMutation.isPending || participant.isBlocked}
                        onAssign={(type) =>
                          rewardMutation.mutate({
                            partyId,
                            participantId: participant.id,
                            type,
                            uses: 1,
                          })
                        }
                      />
                      <button
                        className="host-person-block"
                        type="button"
                        disabled={participant.isBlocked || blockMutation.isPending}
                        onClick={() => requestBlock(participant)}
                      >
                        <LockKey aria-hidden="true" />
                        {participant.isBlocked ? "Déjà exclu" : "Exclure de la rotation"}
                      </button>
                    </div>
                  </details>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
