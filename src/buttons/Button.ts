import type { ButtonInteraction, PermissionFlagsBits } from "discord.js";
import type { MaybePromise } from "../core/errors.js";

export interface ButtonOptions<TContext> {
  customId: string;
  permission?: keyof typeof PermissionFlagsBits;
  execute(
    context: TContext,
    interaction: ButtonInteraction<"cached">,
  ): MaybePromise<void>;
}

export class Button<TContext = unknown> {
  readonly customId: string;
  readonly permission: keyof typeof PermissionFlagsBits | undefined;
  readonly execute: ButtonOptions<TContext>["execute"];

  constructor(options: ButtonOptions<TContext>) {
    this.customId = options.customId;
    this.permission = options.permission;
    this.execute = options.execute;
  }
}
