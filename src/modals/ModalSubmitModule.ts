import type { ModalSubmitInteraction, PermissionFlagsBits } from "discord.js";
import type { MaybePromise } from "../core/errors.js";
import type { PermissionResolver } from "../core/permissions.js";

export interface ModalSubmitModuleOptions<TContext> {
  customId: string;
  permissionsRequired?: (keyof typeof PermissionFlagsBits)[];
  permissionResolver?: PermissionResolver<
    TContext,
    ModalSubmitInteraction<"cached">
  >;

  onTrigger(
    context: TContext,
    interaction: ModalSubmitInteraction<"cached">,
  ): MaybePromise<void>;
}

export class ModalSubmitModule<TContext = unknown> {
  readonly customId: string;
  readonly permissionsRequired?: (keyof typeof PermissionFlagsBits)[];
  readonly permissionResolver?: PermissionResolver<
    TContext,
    ModalSubmitInteraction<"cached">
  >;
  readonly onTrigger: ModalSubmitModuleOptions<TContext>["onTrigger"];

  constructor(options: ModalSubmitModuleOptions<TContext>) {
    this.customId = options.customId;
    this.permissionsRequired = options.permissionsRequired;
    this.permissionResolver = options.permissionResolver;
    this.onTrigger = options.onTrigger;
  }
}
