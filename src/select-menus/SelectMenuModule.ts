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
import type { PermissionResolver } from "../core/permissions.js";

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
  readonly permissionResolver?: PermissionResolver<
    TContext,
    SelectMenuInteractionMap[(typeof SelectMenuType)[T]]
  >;
  onTrigger(
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
  readonly permissionResolver?: PermissionResolver<
    TContext,
    SelectMenuInteractionMap[(typeof SelectMenuType)[T]]
  >;
  readonly onTrigger: SelectMenuOptions<TContext, T>["onTrigger"];

  constructor(options: SelectMenuOptions<TContext, T>) {
    this.customId = options.customId;
    this.type = options.type;
    this.permissionsRequired = options.permissionsRequired;
    this.permissionResolver = options.permissionResolver;
    this.onTrigger = options.onTrigger;
  }
}
