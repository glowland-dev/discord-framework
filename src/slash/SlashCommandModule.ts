import {
  ApplicationCommandType,
  type ApplicationCommandOptionData,
  type ChatInputApplicationCommandData,
  type ChatInputCommandInteraction,
} from "discord.js";
import type { MaybePromise } from "../core/errors.js";
import type { PermissionResolver } from "../core/permissions.js";

export interface SlashCommandOptions<
  TContext,
> extends ChatInputApplicationCommandData {
  devOnly?: boolean;
  permissionResolver?: PermissionResolver<
    TContext,
    ChatInputCommandInteraction<"cached">
  >;
  execute(
    context: TContext,
    interaction: ChatInputCommandInteraction<"cached">,
  ): MaybePromise<void>;
}

export class SlashCommandModule<TContext = unknown> {
  readonly name: string;
  readonly description: string;
  readonly options: readonly ApplicationCommandOptionData[] | undefined;
  readonly devOnly: boolean;
  readonly permissionResolver?: PermissionResolver<
    TContext,
    ChatInputCommandInteraction<"cached">
  >;
  readonly execute: SlashCommandOptions<TContext>["execute"];
  readonly type = ApplicationCommandType.ChatInput;

  constructor(options: SlashCommandOptions<TContext>) {
    this.name = options.name.toLowerCase().replaceAll(" ", "-");
    this.description = options.description;
    this.options = options.options;
    this.devOnly = options.devOnly ?? false;
    this.permissionResolver = options.permissionResolver;
    this.execute = options.execute;
  }

  toJSON(): ChatInputApplicationCommandData {
    return {
      name: this.name,
      description: this.description,
      type: this.type,
      ...(this.options ? { options: this.options } : {}),
    };
  }
}
