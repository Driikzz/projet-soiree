import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Disc, Lightning, UsersThree } from "@phosphor-icons/react";
import { Controller, useForm } from "react-hook-form";

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
    control,
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
    <form
      className="dashboard-settings-form rotate-settings-panel"
      onSubmit={handleSubmit(onSubmit)}
    >
      <header className="rotate-settings-catalogue">
        <span>ROT/RULES</span>
        <small>Control</small>
      </header>
      <div className="rotate-settings-title">
        <p>Règles de la rotation</p>
        <h2>Paramètres de la soirée</h2>
        <span>Les règles restent modifiables pendant la soirée.</span>
      </div>

      <fieldset className="rotate-settings-group">
        <legend>
          <span>01</span>
          <Disc aria-hidden="true" weight="fill" />
          Rotation
        </legend>
        <div className="rotate-settings-fields">
          <label className="rotate-settings-field">
            <span>
              Quota par défaut <small>Morceaux proposés par personne</small>
            </span>
            <span className="rotate-settings-input">
              <input
                aria-label="Quota par défaut"
                type="number"
                min={0}
                max={50}
                {...register("defaultTrackQuota", { valueAsNumber: true })}
              />
              <i>tracks</i>
            </span>
          </label>
          <label className="rotate-settings-field">
            <span>
              PRESS par participant <small>Ressource disponible pour toute la nuit</small>
            </span>
            <span className="rotate-settings-input">
              <input
                aria-label="PRESS par participant"
                type="number"
                min={1}
                max={50}
                {...register("flameBudgetPerParticipant", { valueAsNumber: true })}
              />
              <i>press</i>
            </span>
          </label>
          <label className="rotate-settings-field">
            <span>
              Durée maximale <small>Limite acceptée pour un morceau</small>
            </span>
            <span className="rotate-settings-input">
              <Controller
                control={control}
                name="maxTrackDurationMs"
                render={({ field }) => (
                  <input
                    aria-label="Durée maximale"
                    ref={field.ref}
                    type="number"
                    min={0.5}
                    max={60}
                    step={0.5}
                    value={Number(field.value ?? settings.maxTrackDurationMs) / 60_000}
                    onBlur={field.onBlur}
                    onChange={(event) => field.onChange(event.target.valueAsNumber * 60_000)}
                  />
                )}
              />
              <i>min</i>
            </span>
          </label>
          <label className="rotate-settings-field">
            <span>
              Blocage des répétitions <small>Avant de rejouer un même titre</small>
            </span>
            <span className="rotate-settings-input">
              <input
                aria-label="Blocage des répétitions"
                type="number"
                min={0}
                max={10_080}
                {...register("replayBlockMinutes", { valueAsNumber: true })}
              />
              <i>min</i>
            </span>
          </label>
        </div>
      </fieldset>

      <fieldset className="rotate-settings-group">
        <legend>
          <span>02</span>
          <UsersThree aria-hidden="true" weight="fill" />
          Ambiance collective
        </legend>
        <div className="rotate-settings-fields rotate-settings-fields-three">
          <label className="rotate-settings-field">
            <span>
              Votes minimum <small>Avant de pouvoir changer</small>
            </span>
            <span className="rotate-settings-input">
              <input
                aria-label="Votes minimum"
                type="number"
                min={1}
                max={1_000}
                {...register("minimumPlaylistVotes", { valueAsNumber: true })}
              />
              <i>votes</i>
            </span>
          </label>
          <label className="rotate-settings-field">
            <span>
              Pourcentage minimum <small>Part de la salle nécessaire</small>
            </span>
            <span className="rotate-settings-input">
              <input
                aria-label="Pourcentage minimum"
                type="number"
                min={1}
                max={100}
                {...register("minimumPlaylistVotePercentage", { valueAsNumber: true })}
              />
              <i>%</i>
            </span>
          </label>
          <label className="rotate-settings-field">
            <span>
              Verrouillage <small>Pause entre deux changements</small>
            </span>
            <span className="rotate-settings-input">
              <input
                aria-label="Verrouillage"
                type="number"
                min={0}
                max={1_440}
                {...register("playlistLockMinutes", { valueAsNumber: true })}
              />
              <i>min</i>
            </span>
          </label>
        </div>
        <div className="rotate-settings-toggles">
          <label className="rotate-settings-toggle">
            <span>
              <strong>Votes d’ambiance</strong>
              <small>Les invités peuvent proposer le prochain mood.</small>
            </span>
            <input
              type="checkbox"
              aria-label="Autoriser les votes de changement d’ambiance"
              {...register("playlistVotesEnabled")}
            />
          </label>
          <label className="rotate-settings-toggle">
            <span>
              <strong>Ambiance verrouillée</strong>
              <small>Le mood actuel reste sous ton contrôle.</small>
            </span>
            <input
              type="checkbox"
              aria-label="Verrouiller temporairement l’ambiance active"
              {...register("playlistChangeLockedByAdmin")}
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="rotate-settings-group rotate-settings-your-turn">
        <legend>
          <span>03</span>
          <Lightning aria-hidden="true" weight="fill" />
          Your turn
        </legend>
        <label className="rotate-settings-toggle">
          <span>
            <strong>Tirage automatique</strong>
            <small>Donner régulièrement la main à une personne.</small>
          </span>
          <input
            type="checkbox"
            aria-label="Tirer régulièrement un participant au sort"
            {...register("flashModeEnabled")}
          />
        </label>
        <div className="rotate-settings-fields">
          <label className="rotate-settings-field">
            <span>
              Intervalle entre les tirages <small>Temps entre deux YOUR TURN</small>
            </span>
            <span className="rotate-settings-input">
              <input
                aria-label="Intervalle entre les tirages"
                type="number"
                min={5}
                max={1_440}
                {...register("flashIntervalMinutes", { valueAsNumber: true })}
              />
              <i>min</i>
            </span>
          </label>
          <label className="rotate-settings-field">
            <span>
              Temps pour choisir <small>Fenêtre laissée au participant</small>
            </span>
            <span className="rotate-settings-input">
              <input
                aria-label="Temps pour choisir"
                type="number"
                min={30}
                max={600}
                step={15}
                {...register("flashSelectionWindowSeconds", { valueAsNumber: true })}
              />
              <i>sec</i>
            </span>
          </label>
        </div>
        <p className="rotate-settings-note">
          Le morceau YOUR TURN ne consomme pas le quota. Si le temps expire, la rotation continue.
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
      <button
        className="create-next-button rotate-settings-submit"
        type="submit"
        disabled={isPending}
      >
        {isPending ? "Enregistrement…" : "Enregistrer les réglages"}
        <Check aria-hidden="true" weight="bold" />
      </button>
    </form>
  );
}
