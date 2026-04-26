import {
  ComponentType,
  type ChannelSelectMenuInteraction,
  type MentionableSelectMenuInteraction,
  type PermissionFlagsBits,
  type RoleSelectMenuInteraction,
  type StringSelectMenuInteraction,
  type UserSelectMenuInteraction,
} from "discord.js";
import type { MaybePromise } from "../core/errors.js";

export const SelectMenuType = {
  String: ComponentType.StringSelect,
  User: ComponentType.UserSelect,
  Role: ComponentType.RoleSelect,
  Mentionable: ComponentType.MentionableSelect,
  Channel: ComponentType.ChannelSelect,
} as const;

export type SelectType = keyof typeof SelectMenuType;

export interface SelectMenuInteractionMap {
  [ComponentType.StringSelect]: StringSelectMenuInteraction<"cached">;
  [ComponentType.UserSelect]: UserSelectMenuInteraction<"cached">;
  [ComponentType.RoleSelect]: RoleSelectMenuInteraction<"cached">;
  [ComponentType.MentionableSelect]: MentionableSelectMenuInteraction<"cached">;
  [ComponentType.ChannelSelect]: ChannelSelectMenuInteraction<"cached">;
}

export interface SelectMenuOptions<TContext, T extends SelectType> {
  customId: string;
  type: T;
  readonly permissionsRequired?: (keyof typeof PermissionFlagsBits)[];
  readonly allowedRoleIds?: readonly string[];
  execute(
    context: TContext,
    interaction: SelectMenuInteractionMap[(typeof SelectMenuType)[T]],
  ): MaybePromise<void>;
}

export class SelectMenuModule<
  TContext = unknown,
  T extends SelectType = SelectType,
> {
  readonly customId: string;
  readonly type: T;
  readonly permissionsRequired?: (keyof typeof PermissionFlagsBits)[];
  readonly allowedRoleIds?: readonly string[];
  readonly execute: SelectMenuOptions<TContext, T>["execute"];

  constructor(options: SelectMenuOptions<TContext, T>) {
    this.customId = options.customId;
    this.type = options.type;
    this.permissionsRequired = options.permissionsRequired;
    this.allowedRoleIds = options.allowedRoleIds;
    this.execute = options.execute;
  }
}
