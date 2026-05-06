import {
  type AnySelectMenuInteraction,
  type Client,
  type InteractionReplyOptions,
} from "discord.js";

import {
  replyToInteractionError,
  type FrameworkErrorPayload,
  type MaybePromise,
} from "../core/errors.js";
import { loadDefaultModules } from "../core/files.js";

import {
  SelectMenuModule,
  SelectMenuType,
  type SelectType,
} from "./SelectMenuModule.js";
import { warnDuplicate } from "../core/duplicates.js";

type AnySelectMenu<TContext> = SelectMenuModule<TContext, SelectType>;

export interface SelectMenuManagerOptions<
  TContext,
  TClient extends Client<true> = Client<true>,
> {
  client: Client<true>;
  selectMenusPath: string;
  createContext: (
    interaction: AnySelectMenuInteraction<"cached">,
  ) => MaybePromise<TContext>;
  onError?: (
    payload: FrameworkErrorPayload<
      AnySelectMenu<TContext>,
      TContext,
      AnySelectMenuInteraction<"cached">
    >,
  ) => MaybePromise<void>;
  permissionReply?: InteractionReplyOptions | false;
  errorReply?: InteractionReplyOptions | false;
  cacheBust?: boolean;
}

export class SelectMenuManager<
  TContext,
  TClient extends Client<true> = Client<true>,
> {
  private readonly client_: Client<true>;
  private readonly selectMenusPath_: string;
  private readonly createContext_: SelectMenuManagerOptions<TContext>["createContext"];
  private readonly onError_: SelectMenuManagerOptions<TContext>["onError"];
  private readonly permissionReply_: InteractionReplyOptions | false;
  private readonly errorReply_: InteractionReplyOptions | false;
  private readonly cacheBust_: boolean;

  private readonly selectMenuCache_ = new Map<
    string,
    AnySelectMenu<TContext>
  >();

  constructor(options: SelectMenuManagerOptions<TContext>) {
    this.client_ = options.client;
    this.selectMenusPath_ = options.selectMenusPath;
    this.createContext_ = options.createContext;
    this.onError_ = options.onError;

    this.permissionReply_ = options.permissionReply ?? {
      flags: "Ephemeral",
      content: "You don't have permission to use this select menu.",
    };

    this.errorReply_ = options.errorReply ?? {
      flags: "Ephemeral",
      content: "An error occurred while executing this select menu.",
    };

    this.cacheBust_ = options.cacheBust ?? true;
  }

  get selectMenuCache(): ReadonlyMap<string, AnySelectMenu<TContext>> {
    return this.selectMenuCache_;
  }

  async loadSelectMenus(): Promise<void> {
    const selectMenus = await loadDefaultModules<AnySelectMenu<TContext>>({
      directory: this.selectMenusPath_,
      cacheBust: this.cacheBust_,
      validate: (value): value is AnySelectMenu<TContext> =>
        value instanceof SelectMenuModule,
    });

    for (const selectMenu of selectMenus) {
      if (this.selectMenuCache_.has(selectMenu.customId)) {
        warnDuplicate("SelectMenuManager", selectMenu.customId);
      }

      this.selectMenuCache_.set(selectMenu.customId, selectMenu);
    }
  }

  listen(): void {
    this.client_.on("interactionCreate", async (interaction) => {
      if (!interaction.isAnySelectMenu() || !interaction.inCachedGuild())
        return;

      const selectMenu = this.selectMenuCache_.get(interaction.customId);
      if (!selectMenu) return;

      if (interaction.componentType !== SelectMenuType[selectMenu.type]) return;

      let context: TContext | undefined;

      try {
        context = await this.createContext_(interaction);

        const hasRequiredPermissions =
          selectMenu.permissionsRequired?.every((permission) =>
            interaction.memberPermissions.has(permission),
          ) ?? true;

        const hasResolvedPermission = selectMenu.permissionResolver
          ? await selectMenu.permissionResolver(context, interaction as never)
          : hasRequiredPermissions;

        if (!hasResolvedPermission) {
          if (this.permissionReply_ !== false && interaction.isRepliable()) {
            await replyToInteractionError(interaction, this.permissionReply_);
          }

          return;
        }

        await selectMenu.onTrigger(context, interaction as never);
      } catch (error) {
        await this.onError_?.({
          error,
          item: selectMenu,
          context,
          interaction,
        });

        if (this.errorReply_ !== false && interaction.isRepliable()) {
          await replyToInteractionError(interaction, this.errorReply_);
        }
      }
    });
  }

  async reloadSelectMenus(): Promise<void> {
    this.selectMenuCache_.clear();
    await this.loadSelectMenus();
  }
}
