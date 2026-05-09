import type {
  APIInteractionGuildMember,
  Client,
  GuildMember,
  InteractionReplyOptions,
  ModalSubmitInteraction,
} from "discord.js";

import {
  replyToInteractionError,
  type FrameworkErrorPayload,
  type MaybePromise,
} from "../core/errors.js";

import { loadDefaultModules } from "../core/files.js";
import { warnDuplicate } from "../core/duplicates.js";
import { ModalSubmitModule } from "./ModalSubmitModule.js";

export interface ModalSubmitManagerOptions<
  TContext,
  TClient extends Client<true> = Client<true>,
> {
  client: TClient;
  modalsPath: string;
  createContext: (
    interaction: ModalSubmitInteraction<"cached">,
  ) => MaybePromise<TContext>;
  onError?: (
    payload: FrameworkErrorPayload<
      ModalSubmitModule<TContext>,
      TContext,
      ModalSubmitInteraction<"cached">
    >,
  ) => MaybePromise<void>;
  permissionReply?:
    | ((interaction: {
        member: GuildMember | APIInteractionGuildMember | null;
      }) => InteractionReplyOptions)
    | InteractionReplyOptions
    | false;
  errorReply?: InteractionReplyOptions | false;
  cacheBust?: boolean;
}

export class ModalSubmitManager<
  TContext,
  TClient extends Client<true> = Client<true>,
> {
  private readonly client_: TClient;
  private readonly modalsPath_: string;
  private readonly createContext_: ModalSubmitManagerOptions<TContext>["createContext"];
  private readonly onError_: ModalSubmitManagerOptions<TContext>["onError"];
  private readonly permissionReply_?:
    | ((interaction: {
        member: GuildMember | APIInteractionGuildMember | null;
      }) => InteractionReplyOptions)
    | InteractionReplyOptions
    | false;
  private readonly errorReply_: InteractionReplyOptions | false;
  private readonly cacheBust_: boolean;
  private readonly modalCache_ = new Map<string, ModalSubmitModule<TContext>>();

  constructor(options: ModalSubmitManagerOptions<TContext, TClient>) {
    this.client_ = options.client;
    this.modalsPath_ = options.modalsPath;
    this.createContext_ = options.createContext;
    this.onError_ = options.onError;
    this.permissionReply_ = options.permissionReply ?? {
      flags: "Ephemeral",
      content: "You don't have permission to use this modal.",
    };
    this.errorReply_ = options.errorReply ?? {
      flags: "Ephemeral",
      content: "An error occurred while executing this modal.",
    };
    this.cacheBust_ = options.cacheBust ?? true;
  }

  get modalCache(): ReadonlyMap<string, ModalSubmitModule<TContext>> {
    return this.modalCache_;
  }

  async loadModals(): Promise<void> {
    const modals = await loadDefaultModules<ModalSubmitModule<TContext>>({
      directory: this.modalsPath_,
      cacheBust: this.cacheBust_,
      validate: (value): value is ModalSubmitModule<TContext> =>
        value instanceof ModalSubmitModule,
    });

    for (const modal of modals) {
      if (this.modalCache_.has(modal.customId)) {
        warnDuplicate("ModalSubmitManager", modal.customId);
      }

      this.modalCache_.set(modal.customId, modal);
    }
  }

  listen(): void {
    this.client_.on("interactionCreate", async (interaction) => {
      if (!interaction.isModalSubmit() || !interaction.inCachedGuild()) return;

      const modal = this.modalCache_.get(interaction.customId);
      if (!modal) return;

      let context: TContext | undefined;

      try {
        context = await this.createContext_(interaction);

        const hasRequiredPermissions =
          modal.permissionsRequired?.every((permission) =>
            interaction.memberPermissions.has(permission),
          ) ?? true;

        const hasResolvedPermission = modal.permissionResolver
          ? await modal.permissionResolver(context, interaction)
          : hasRequiredPermissions;

        if (!hasResolvedPermission) {
          if (this.permissionReply_ !== false && interaction.isRepliable()) {
            await replyToInteractionError(interaction, this.permissionReply_);
          }

          return;
        }

        await modal.onTrigger(context, interaction);
      } catch (error) {
        await this.onError_?.({ error, item: modal, context, interaction });
        if (this.errorReply_ !== false && interaction.isRepliable()) {
          await replyToInteractionError(interaction, this.errorReply_);
        }
      }
    });
  }

  async reloadModals(): Promise<void> {
    this.modalCache_.clear();
    await this.loadModals();
  }
}
