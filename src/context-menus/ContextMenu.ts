import {
  ApplicationCommandType,
  PermissionFlagsBits,
  type MessageApplicationCommandData,
  type MessageContextMenuCommandInteraction,
  type UserApplicationCommandData,
  type UserContextMenuCommandInteraction,
} from "discord.js";

import type { MaybePromise } from "../core/errors.js";

export const ContextMenuType = {
  User: ApplicationCommandType.User,
  Message: ApplicationCommandType.Message,
} as const;

export type ContextType = keyof typeof ContextMenuType;

export interface ContextMenuInteractionMap {
  [ApplicationCommandType.User]: UserContextMenuCommandInteraction<"cached">;
  [ApplicationCommandType.Message]: MessageContextMenuCommandInteraction<"cached">;
}

export type ContextMenuApplicationCommandDataMap = {
  [ApplicationCommandType.User]: UserApplicationCommandData;
  [ApplicationCommandType.Message]: MessageApplicationCommandData;
};

export interface ContextMenuOptions<TContext, T extends ContextType> {
  name: string;
  type: T;
  devOnly?: boolean;
  permissionsRequired?: (keyof typeof PermissionFlagsBits)[];
  allowedRoleIds?: readonly string[];
  execute(
    context: TContext,
    interaction: ContextMenuInteractionMap[(typeof ContextMenuType)[T]],
  ): MaybePromise<void>;
}

export class ContextMenu<
  TContext = unknown,
  T extends ContextType = ContextType,
> {
  readonly name: string;
  readonly type: T;
  readonly devOnly: boolean;
  readonly permissionsRequired?: (keyof typeof PermissionFlagsBits)[];
  readonly allowedRoleIds?: readonly string[];
  readonly execute: ContextMenuOptions<TContext, T>["execute"];

  constructor(options: ContextMenuOptions<TContext, T>) {
    this.name = options.name;
    this.type = options.type;
    this.devOnly = options.devOnly ?? false;
    this.permissionsRequired = options.permissionsRequired;
    this.allowedRoleIds = options.allowedRoleIds;
    this.execute = options.execute;
  }

  toJSON(): ContextMenuApplicationCommandDataMap[(typeof ContextMenuType)[T]] {
    return {
      name: this.name,
      type: ContextMenuType[this.type],
    } as ContextMenuApplicationCommandDataMap[(typeof ContextMenuType)[T]];
  }
}
