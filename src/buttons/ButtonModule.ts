import type { ButtonInteraction, PermissionFlagsBits } from "discord.js";
import type { MaybePromise } from "../core/errors.js";
import type { PermissionResolver } from "../core/permissions.js";

export interface ButtonOptions<TContext> {
  customId: string | RegExp;
  permissionsRequired?: (keyof typeof PermissionFlagsBits)[];
  permissionResolver?: PermissionResolver<
    TContext,
    ButtonInteraction<"cached">
  >;
  onTrigger(
    context: TContext,
    interaction: ButtonInteraction<"cached">,
  ): MaybePromise<void>;
}

export class ButtonModule<TContext = unknown> {
  readonly customId: string | RegExp;
  readonly permissionsRequired?: (keyof typeof PermissionFlagsBits)[];
  readonly permissionResolver?: PermissionResolver<
    TContext,
    ButtonInteraction<"cached">
  >;
  readonly onTrigger: ButtonOptions<TContext>["onTrigger"];

  constructor(options: ButtonOptions<TContext>) {
    this.customId = options.customId;
    this.permissionsRequired = options.permissionsRequired;
    this.permissionResolver = options.permissionResolver;
    this.onTrigger = options.onTrigger;
  }
}
