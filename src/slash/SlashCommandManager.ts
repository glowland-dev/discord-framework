import type {
  ChatInputCommandInteraction,
  Client,
  InteractionReplyOptions,
} from "discord.js";
import {
  replyToInteractionError,
  type FrameworkErrorPayload,
  type MaybePromise,
} from "../core/errors.js";
import { loadDefaultModules } from "../core/files.js";
import { SlashCommandModule } from "./SlashCommandModule.js";
import { warnDuplicate } from "../core/duplicates.js";

export interface SlashCommandManagerOptions<
  TContext,
  TClient extends Client<true> = Client<true>,
> {
  client: TClient;
  commandsPath: string;
  developerGuildId?: string;
  developerIds?: readonly string[];
  createContext: (
    interaction: ChatInputCommandInteraction<"cached">,
  ) => MaybePromise<TContext>;
  onError?: (
    payload: FrameworkErrorPayload<
      SlashCommandModule<TContext>,
      TContext,
      ChatInputCommandInteraction<"cached">
    >,
  ) => MaybePromise<void>;
  permissionReply?: InteractionReplyOptions | false;
  errorReply?: InteractionReplyOptions | false;
  cacheBust?: boolean;
}

export class SlashCommandManager<
  TContext = unknown,
  TClient extends Client<true> = Client<true>,
> {
  private readonly client_: TClient;
  private readonly commandsPath_: string;
  private readonly developerGuildId_: string | undefined;
  private readonly developerIds_: readonly string[];
  private readonly createContext_: SlashCommandManagerOptions<TContext>["createContext"];
  private readonly onError_: SlashCommandManagerOptions<TContext>["onError"];
  private readonly permissionReply_: InteractionReplyOptions | false;
  private readonly errorReply_: InteractionReplyOptions | false;
  private readonly cacheBust_: boolean;

  private readonly commandCache_ = new Map<
    string,
    SlashCommandModule<TContext>
  >();
  private readonly devCommandCache_ = new Map<
    string,
    SlashCommandModule<TContext>
  >();

  constructor(options: SlashCommandManagerOptions<TContext, TClient>) {
    this.client_ = options.client;
    this.commandsPath_ = options.commandsPath;
    this.developerGuildId_ = options.developerGuildId;
    this.developerIds_ = options.developerIds ?? [];
    this.createContext_ = options.createContext;
    this.onError_ = options.onError;
    this.permissionReply_ = options.permissionReply ?? {
      flags: "Ephemeral",
      content: "You don't have permission to use this command.",
    };
    this.errorReply_ = options.errorReply ?? {
      flags: "Ephemeral",
      content: "An error occurred while executing this command.",
    };
    this.cacheBust_ = options.cacheBust ?? true;
  }

  get commandCache(): ReadonlyMap<string, SlashCommandModule<TContext>> {
    return this.commandCache_;
  }

  get devCommandCache(): ReadonlyMap<string, SlashCommandModule<TContext>> {
    return this.devCommandCache_;
  }

  async loadCommands(): Promise<void> {
    const commands = await loadDefaultModules<SlashCommandModule<TContext>>({
      directory: this.commandsPath_,
      cacheBust: this.cacheBust_,
      validate: (value): value is SlashCommandModule<TContext> =>
        value instanceof SlashCommandModule,
    });

    for (const command of commands) {
      const cache = command.devOnly
        ? this.devCommandCache_
        : this.commandCache_;

      if (cache.has(command.name)) {
        warnDuplicate("SlashCommandManager", command.name);
      }

      cache.set(command.name, command);
    }
  }

  listen(): void {
    this.client_.on("interactionCreate", async (interaction) => {
      if (!interaction.isChatInputCommand() || !interaction.inCachedGuild())
        return;

      const command =
        this.commandCache_.get(interaction.commandName) ??
        this.devCommandCache_.get(interaction.commandName);
      if (!command) return;

      if (command.devOnly) {
        const isDeveloper = this.developerIds_.includes(interaction.user.id);
        const isDeveloperGuild = interaction.guildId === this.developerGuildId_;
        if (!isDeveloper || !isDeveloperGuild) return;
      }

      let context: TContext | undefined;

      try {
        context = await this.createContext_(interaction);

        const hasResolvedPermission = command.permissionResolver
          ? await command.permissionResolver(context, interaction)
          : true;

        if (!hasResolvedPermission) {
          if (this.permissionReply_ !== false && interaction.isRepliable()) {
            await replyToInteractionError(interaction, this.permissionReply_);
          }

          return;
        }

        await command.execute(context, interaction);
      } catch (error) {
        await this.onError_?.({ error, item: command, context, interaction });
        if (this.errorReply_ !== false && interaction.isRepliable()) {
          await replyToInteractionError(interaction, this.errorReply_);
        }
      }
    });
  }

  async reloadCommands(): Promise<void> {
    this.commandCache_.clear();
    this.devCommandCache_.clear();
    await this.loadCommands();
  }
}
