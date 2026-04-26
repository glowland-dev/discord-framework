import type { ButtonInteraction, PermissionFlagsBits } from "discord.js";
import type { MaybePromise } from "../core/errors.js";

export interface ButtonOptions<TContext> {
  customId: string;
  permissionsRequired?: (keyof typeof PermissionFlagsBits)[];
  allowedRoleIds?: readonly string[];
  execute(
    context: TContext,
    interaction: ButtonInteraction<"cached">,
  ): MaybePromise<void>;
}

export class Button<TContext = unknown> {
  readonly customId: string;
  readonly permissionsRequired?: (keyof typeof PermissionFlagsBits)[];
  readonly allowedRoleIds?: readonly string[];
  readonly execute: ButtonOptions<TContext>["execute"];

  constructor(options: ButtonOptions<TContext>) {
    this.customId = options.customId;
    this.permissionsRequired = options.permissionsRequired;
    this.allowedRoleIds = options.allowedRoleIds;
    this.execute = options.execute;
  }
}
