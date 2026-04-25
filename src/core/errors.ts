import type { InteractionReplyOptions, RepliableInteraction } from "discord.js";

export type MaybePromise<T> = T | Promise<T>;

export interface FrameworkErrorPayload<TItem, TContext, TInteraction> {
  error: unknown;
  item: TItem;
  context?: TContext;
  interaction?: TInteraction;
}

export async function replyToInteractionError(
  interaction: RepliableInteraction,
  payload: InteractionReplyOptions = {
    flags: "Ephemeral",
    content: "An error occurred while executing this interaction."
  }
): Promise<void> {
  if (interaction.deferred || interaction.replied) {
    await interaction.followUp(payload).catch(() => undefined);
    return;
  }

  await interaction.reply(payload).catch(() => undefined);
}
