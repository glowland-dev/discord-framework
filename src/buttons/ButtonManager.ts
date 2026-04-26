import type {
  ButtonInteraction,
  Client,
  InteractionReplyOptions,
} from "discord.js";
import {
  replyToInteractionError,
  type FrameworkErrorPayload,
  type MaybePromise,
} from "../core/errors.js";
import { ButtonModule } from "./ButtonModule.js";
import { loadDefaultModules } from "../core/files.js";
import { warnDuplicate } from "../core/duplicates.js";

export interface ButtonManagerOptions<
  TContext,
  TClient extends Client<true> = Client<true>,
> {
  client: Client<true>;
  buttonsPath: string;
  createContext: (
    interaction: ButtonInteraction<"cached">,
  ) => MaybePromise<TContext>;
  onError?: (
    payload: FrameworkErrorPayload<
      ButtonModule<TContext>,
      TContext,
      ButtonInteraction<"cached">
    >,
  ) => MaybePromise<void>;
  permissionReply?: InteractionReplyOptions | false;
  errorReply?: InteractionReplyOptions | false;
  cacheBust?: boolean;
}

export class ButtonManager<
  TContext,
  TClient extends Client<true> = Client<true>,
> {
  private readonly client_: Client<true>;
  private readonly buttonsPath_: string;
  private readonly createContext_: ButtonManagerOptions<TContext>["createContext"];
  private readonly onError_: ButtonManagerOptions<TContext>["onError"];
  private readonly permissionReply_: InteractionReplyOptions | false;
  private readonly errorReply_: InteractionReplyOptions | false;
  private readonly cacheBust_: boolean;
  private readonly buttonCache_ = new Map<string, ButtonModule<TContext>>();

  constructor(options: ButtonManagerOptions<TContext>) {
    this.client_ = options.client;
    this.buttonsPath_ = options.buttonsPath;
    this.createContext_ = options.createContext;
    this.onError_ = options.onError;
    this.permissionReply_ = options.permissionReply ?? {
      flags: "Ephemeral",
      content: "You don't have permission to use this button.",
    };
    this.errorReply_ = options.errorReply ?? {
      flags: "Ephemeral",
      content: "An error occurred while executing this button.",
    };
    this.cacheBust_ = options.cacheBust ?? true;
  }

  get buttonCache(): ReadonlyMap<string, ButtonModule<TContext>> {
    return this.buttonCache_;
  }

  async loadButtons(): Promise<void> {
    const buttons = await loadDefaultModules<ButtonModule<TContext>>({
      directory: this.buttonsPath_,
      cacheBust: this.cacheBust_,
      validate: (value): value is ButtonModule<TContext> =>
        value instanceof ButtonModule,
    });

    for (const button of buttons) {
      if (this.buttonCache_.has(button.customId)) {
        warnDuplicate("ButtonManager", button.customId);
      }

      this.buttonCache_.set(button.customId, button);
    }
  }

  listen(): void {
    this.client_.on("interactionCreate", async (interaction) => {
      if (!interaction.isButton() || !interaction.inCachedGuild()) return;

      const button = this.buttonCache_.get(interaction.customId);
      if (!button) return;

      const hasAllowedRole =
        button.allowedRoleIds?.some((id) =>
          interaction.member.roles.cache.has(id),
        ) ?? false;

      const hasRequiredPermissions =
        button.permissionsRequired?.every((permission) =>
          interaction.memberPermissions.has(permission),
        ) ?? true;

      // allow if either condition passes
      if (!hasAllowedRole && !hasRequiredPermissions) {
        if (this.permissionReply_ !== false && interaction.isRepliable()) {
          await replyToInteractionError(interaction, this.permissionReply_);
        }

        return;
      }

      let context: TContext | undefined;

      try {
        context = await this.createContext_(interaction);
        await button.execute(context, interaction);
      } catch (error) {
        await this.onError_?.({ error, item: button, context, interaction });
        if (this.errorReply_ !== false && interaction.isRepliable()) {
          await replyToInteractionError(interaction, this.errorReply_);
        }
      }
    });
  }

  async reloadButtons(): Promise<void> {
    this.buttonCache_.clear();
    await this.loadButtons();
  }
}
