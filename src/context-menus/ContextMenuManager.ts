import {
  ApplicationCommandType,
  type Client,
  type ContextMenuCommandInteraction,
  type InteractionReplyOptions,
} from "discord.js";

import {
  replyToInteractionError,
  type FrameworkErrorPayload,
  type MaybePromise,
} from "../core/errors.js";
import { loadDefaultModules } from "../core/files.js";

import {
  ContextMenu,
  ContextMenuType,
  type ContextType,
} from "./ContextMenu.js";

type AnyContextMenu<TContext> = ContextMenu<TContext, ContextType>;

export interface ContextMenuManagerOptions<
  TContext,
  TClient extends Client<true> = Client<true>,
> {
  client: TClient;
  contextMenusPath: string;
  developerGuildId?: string;
  developerIds?: readonly string[];
  createContext: (
    interaction: ContextMenuCommandInteraction<"cached">,
  ) => MaybePromise<TContext>;
  onError?: (
    payload: FrameworkErrorPayload<
      AnyContextMenu<TContext>,
      TContext,
      ContextMenuCommandInteraction<"cached">
    >,
  ) => MaybePromise<void>;
  errorReply?: InteractionReplyOptions | false;
  cacheBust?: boolean;
}

export class ContextMenuManager<
  TContext = unknown,
  TClient extends Client<true> = Client<true>,
> {
  private readonly client_: TClient;
  private readonly contextMenusPath_: string;
  private readonly developerGuildId_: string | undefined;
  private readonly developerIds_: readonly string[];
  private readonly createContext_: ContextMenuManagerOptions<TContext>["createContext"];
  private readonly onError_: ContextMenuManagerOptions<TContext>["onError"];
  private readonly errorReply_: InteractionReplyOptions | false;
  private readonly cacheBust_: boolean;

  private readonly contextMenuCache_ = new Map<
    string,
    AnyContextMenu<TContext>
  >();
  private readonly devContextMenuCache_ = new Map<
    string,
    AnyContextMenu<TContext>
  >();

  constructor(options: ContextMenuManagerOptions<TContext, TClient>) {
    this.client_ = options.client;
    this.contextMenusPath_ = options.contextMenusPath;
    this.developerGuildId_ = options.developerGuildId;
    this.developerIds_ = options.developerIds ?? [];
    this.createContext_ = options.createContext;
    this.onError_ = options.onError;
    this.errorReply_ = options.errorReply ?? {
      flags: "Ephemeral",
      content: "An error occurred while executing this context menu.",
    };
    this.cacheBust_ = options.cacheBust ?? true;
  }

  get contextMenuCache(): ReadonlyMap<string, AnyContextMenu<TContext>> {
    return this.contextMenuCache_;
  }

  get devContextMenuCache(): ReadonlyMap<string, AnyContextMenu<TContext>> {
    return this.devContextMenuCache_;
  }

  async loadContextMenus(): Promise<void> {
    const contextMenus = await loadDefaultModules<AnyContextMenu<TContext>>({
      directory: this.contextMenusPath_,
      cacheBust: this.cacheBust_,
      validate: (value): value is AnyContextMenu<TContext> =>
        value instanceof ContextMenu,
    });

    for (const contextMenu of contextMenus) {
      const cacheKey = this.createCacheKey_(
        contextMenu.name,
        ContextMenuType[contextMenu.type],
      );

      if (contextMenu.devOnly) {
        this.devContextMenuCache_.set(cacheKey, contextMenu);
      } else {
        this.contextMenuCache_.set(cacheKey, contextMenu);
      }
    }
  }

  async registerContextMenus(): Promise<void> {
    if (this.developerGuildId_) {
      await this.client_.guilds.cache
        .get(this.developerGuildId_)
        ?.commands.set(
          [...this.devContextMenuCache_.values()].map((contextMenu) =>
            contextMenu.toJSON(),
          ),
        );
    }

    await this.client_.application?.commands.set(
      [...this.contextMenuCache_.values()].map((contextMenu) =>
        contextMenu.toJSON(),
      ),
    );
  }

  listen(): void {
    this.client_.on("interactionCreate", async (interaction) => {
      if (!interaction.isContextMenuCommand() || !interaction.inCachedGuild())
        return;

      const cacheKey = this.createCacheKey_(
        interaction.commandName,
        interaction.commandType,
      );

      const contextMenu =
        this.contextMenuCache_.get(cacheKey) ??
        this.devContextMenuCache_.get(cacheKey);

      if (!contextMenu) return;

      if (interaction.commandType !== ContextMenuType[contextMenu.type]) return;

      if (contextMenu.devOnly) {
        const isDeveloper = this.developerIds_.includes(interaction.user.id);
        const isDeveloperGuild = interaction.guildId === this.developerGuildId_;
        if (!isDeveloper || !isDeveloperGuild) return;
      }

      let context: TContext | undefined;

      try {
        context = await this.createContext_(interaction);
        await contextMenu.execute(context, interaction as never);
      } catch (error) {
        await this.onError_?.({
          error,
          item: contextMenu,
          context,
          interaction,
        });

        if (this.errorReply_ !== false && interaction.isRepliable()) {
          await replyToInteractionError(interaction, this.errorReply_);
        }
      }
    });
  }

  async reloadContextMenus(): Promise<void> {
    this.contextMenuCache_.clear();
    this.devContextMenuCache_.clear();
    await this.loadContextMenus();
    await this.registerContextMenus();
  }

  private createCacheKey_(
    name: string,
    type: ApplicationCommandType.User | ApplicationCommandType.Message,
  ): string {
    return `${type}:${name}`;
  }
}
