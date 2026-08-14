import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import {
  updatePartySettingsRequestSchema,
  type PartySettings,
  type UpdatePartySettingsRequest,
} from "@songfest/shared";

import { FormError } from "./form-error";

interface PartySettingsFormProps {
  settings: PartySettings;
  isPending: boolean;
  errorMessage?: string;
  onSubmit: (input: UpdatePartySettingsRequest) => void;
}

export function PartySettingsForm({
  settings,
  isPending,
  errorMessage,
  onSubmit,
}: PartySettingsFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdatePartySettingsRequest>({
    resolver: zodResolver(updatePartySettingsRequestSchema),
    defaultValues: {
      defaultTrackQuota: settings.defaultTrackQuota,
      flameBudgetPerParticipant: settings.flameBudgetPerParticipant,
      maxTrackDurationMs: settings.maxTrackDurationMs,
      replayBlockMinutes: settings.replayBlockMinutes,
      minimumPlaylistVotes: settings.minimumPlaylistVotes,
      minimumPlaylistVotePercentage: settings.minimumPlaylistVotePercentage,
      playlistLockMinutes: settings.playlistLockMinutes,
      playlistVotesEnabled: settings.playlistVotesEnabled,
      playlistChangeLockedByAdmin: settings.playlistChangeLockedByAdmin,
      flashModeEnabled: settings.flashModeEnabled,
      flashIntervalMinutes: settings.flashIntervalMinutes,
      flashSelectionWindowSeconds: settings.flashSelectionWindowSeconds,
    },
  });

  return (
    <form className="dashboard-settings-form" onSubmit={handleSubmit(onSubmit)}>
      <div className="settings-fields">
        <label>
          Quota par défaut
          <input
            type="number"
            min={0}
            max={50}
            {...register("defaultTrackQuota", { valueAsNumber: true })}
          />
        </label>
        <label>
          Flammes par participant
          <input
            type="number"
            min={1}
            max={50}
            {...register("flameBudgetPerParticipant", { valueAsNumber: true })}
          />
        </label>
        <label>
          Durée maximale (ms)
          <input
            type="number"
            min={30_000}
            max={3_600_000}
            step={30_000}
            {...register("maxTrackDurationMs", { valueAsNumber: true })}
          />
        </label>
        <label>
          Votes minimum
          <input
            type="number"
            min={1}
            max={1_000}
            {...register("minimumPlaylistVotes", { valueAsNumber: true })}
          />
        </label>
        <label>
          Pourcentage minimum
          <input
            type="number"
            min={1}
            max={100}
            {...register("minimumPlaylistVotePercentage", { valueAsNumber: true })}
          />
        </label>
        <label>
          Verrouillage (minutes)
          <input
            type="number"
            min={0}
            max={1_440}
            {...register("playlistLockMinutes", { valueAsNumber: true })}
          />
        </label>
        <label>
          Blocage des répétitions (minutes)
          <input
            type="number"
            min={0}
            max={10_080}
            {...register("replayBlockMinutes", { valueAsNumber: true })}
          />
        </label>
      </div>
      <label className="check-field">
        <input type="checkbox" {...register("playlistVotesEnabled")} />
        Autoriser les votes de changement d’ambiance
      </label>
      <label className="check-field">
        <input type="checkbox" {...register("playlistChangeLockedByAdmin")} />
        Verrouiller temporairement l’ambiance active
      </label>
      <fieldset className="flash-settings-fieldset">
        <legend>Musique Flash</legend>
        <label className="check-field">
          <input type="checkbox" {...register("flashModeEnabled")} />
          Tirer régulièrement un participant au sort
        </label>
        <div className="settings-fields flash-settings-grid">
          <label>
            Intervalle entre les tirages (minutes)
            <input
              type="number"
              min={5}
              max={1_440}
              {...register("flashIntervalMinutes", { valueAsNumber: true })}
            />
          </label>
          <label>
            Temps pour choisir (secondes)
            <input
              type="number"
              min={30}
              max={600}
              step={15}
              {...register("flashSelectionWindowSeconds", { valueAsNumber: true })}
            />
          </label>
        </div>
        <p>
          Le morceau Flash ne consomme pas le quota. S’il n’est pas choisi à temps, la playlist
          continue sans interruption.
        </p>
      </fieldset>
      <FormError
        message={
          errorMessage ??
          Object.values(errors)
            .map((error) => error?.message)
            .find((message): message is string => message !== undefined)
        }
      />
      <button className="primary-button" type="submit" disabled={isPending}>
        {isPending ? "Enregistrement…" : "Enregistrer les réglages"}
      </button>
    </form>
  );
}
