import { Gift } from "@phosphor-icons/react";
import { useState } from "react";

import { rewardTypeSchema, type RewardType } from "@songfest/shared";

const rewardLabels: Record<RewardType, string> = {
  EXTRA_TRACK: "Ajout supplémentaire",
  PRIORITY_TRACK: "Morceau prioritaire",
  DOUBLE_TRACK: "Deux morceaux à la suite",
  CHOOSE_NEXT_PLAYLIST: "Choisir la prochaine ambiance",
};

interface RewardAssignmentProps {
  participantName: string;
  disabled: boolean;
  onAssign: (type: RewardType) => void;
}

export function RewardAssignment({ participantName, disabled, onAssign }: RewardAssignmentProps) {
  const [type, setType] = useState<RewardType>("DOUBLE_TRACK");

  return (
    <div className="reward-assignment">
      <label>
        <span className="sr-only">Récompense pour {participantName}</span>
        <select
          value={type}
          onChange={(event) => setType(rewardTypeSchema.parse(event.target.value))}
        >
          {Object.entries(rewardLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <button
        className="secondary-button"
        type="button"
        disabled={disabled}
        onClick={() => onAssign(type)}
      >
        <Gift aria-hidden="true" weight="fill" />
        Attribuer
      </button>
    </div>
  );
}
