import type {
  ChatInputCommandInteraction,
  Client,
  InteractionReplyOptions,
} from "discord.js";
import {
  replyToInteractionError,
  type FrameworkErrorPayload,
  type MaybePromise,
} from "../core/index.js";
import { loadDefaultModules } from "../core/files.js";
import { SlashCommand } from "./SlashCommand.js";

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
      SlashCommand<TContext>,
      TContext,
      ChatInputCommandInteraction<"cached">
    >,
  ) => MaybePromise<void>;
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
  private readonly errorReply_: InteractionReplyOptions | false;
  private readonly cacheBust_: boolean;

  private readonly commandCache_ = new Map<string, SlashCommand<TContext>>();
  private readonly devCommandCache_ = new Map<string, SlashCommand<TContext>>();

  constructor(options: SlashCommandManagerOptions<TContext, TClient>) {
    this.client_ = options.client;
    this.commandsPath_ = options.commandsPath;
    this.developerGuildId_ = options.developerGuildId;
    this.developerIds_ = options.developerIds ?? [];
    this.createContext_ = options.createContext;
    this.onError_ = options.onError;
    this.errorReply_ = options.errorReply ?? {
      flags: "Ephemeral",
      content: "An error occurred while executing this command.",
    };
    this.cacheBust_ = options.cacheBust ?? true;
  }

  get commandCache(): ReadonlyMap<string, SlashCommand<TContext>> {
    return this.commandCache_;
  }

  get devCommandCache(): ReadonlyMap<string, SlashCommand<TContext>> {
    return this.devCommandCache_;
  }

  async loadCommands(): Promise<void> {
    const commands = await loadDefaultModules<SlashCommand<TContext>>({
      directory: this.commandsPath_,
      cacheBust: this.cacheBust_,
      validate: (value): value is SlashCommand<TContext> =>
        value instanceof SlashCommand,
    });

    for (const command of commands) {
      if (command.devOnly) this.devCommandCache_.set(command.name, command);
      else this.commandCache_.set(command.name, command);
    }
  }

  async registerCommands(): Promise<void> {
    if (this.developerGuildId_) {
      await this.client_.guilds.cache
        .get(this.developerGuildId_)
        ?.commands.set(
          [...this.devCommandCache_.values()].map((command) =>
            command.toJSON(),
          ),
        );
    }

    await this.client_.application?.commands.set(
      [...this.commandCache_.values()].map((command) => command.toJSON()),
    );
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
    await this.registerCommands();
  }
}
