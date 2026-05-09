import type {
  APIInteractionGuildMember,
  GuildMember,
  InteractionReplyOptions,
  RepliableInteraction,
} from "discord.js";

export type MaybePromise<T> = T | Promise<T>;

export interface FrameworkErrorPayload<TItem, TContext, TInteraction> {
  error: unknown;
  item: TItem;
  context?: TContext;
  interaction?: TInteraction;
}

export async function replyToInteractionError(
  interaction: RepliableInteraction,
  payload:
    | ((interaction: {
        member: GuildMember | APIInteractionGuildMember | null;
      }) => InteractionReplyOptions)
    | InteractionReplyOptions = {
    flags: "Ephemeral",
    content: "An error occurred while executing this interaction.",
  },
): Promise<void> {
  if (interaction.deferred || interaction.replied) {
    await interaction
      .followUp(typeof payload === "function" ? payload(interaction) : payload)
      .catch(() => undefined);
    return;
  }

  await interaction
    .reply(typeof payload === "function" ? payload(interaction) : payload)
    .catch(() => undefined);
}
