import type {
  AutocompleteInteraction,
  Client,
  InteractionReplyOptions,
} from "discord.js";

import {
  type FrameworkErrorPayload,
  type MaybePromise,
} from "../core/errors.js";

import { warnDuplicate } from "../core/duplicates.js";
import { loadDefaultModules } from "../core/files.js";
import { AutocompleteModule } from "./AutocompleteModule.js";

export interface AutocompleteManagerOptions<
  TContext,
  TClient extends Client<true> = Client<true>,
> {
  client: TClient;
  autocompletesPath: string;
  createContext: (
    interaction: AutocompleteInteraction<"cached">,
  ) => MaybePromise<TContext>;
  onError?: (
    payload: FrameworkErrorPayload<
      AutocompleteModule<TContext>,
      TContext,
      AutocompleteInteraction<"cached">
    >,
  ) => MaybePromise<void>;
  permissionReply?: InteractionReplyOptions | false;
  errorReply?: InteractionReplyOptions | false;
  cacheBust?: boolean;
}

export class AutocompleteManager<
  TContext,
  TClient extends Client<true> = Client<true>,
> {
  private readonly client_: TClient;
  private readonly autocompletesPath_: string;
  private readonly createContext_: AutocompleteManagerOptions<TContext>["createContext"];
  private readonly onError_: AutocompleteManagerOptions<TContext>["onError"];
  private readonly permissionReply_: InteractionReplyOptions | false;
  private readonly errorReply_: InteractionReplyOptions | false;
  private readonly cacheBust_: boolean;

  private readonly autocompleteCache_ = new Map<
    string,
    AutocompleteModule<TContext>
  >();

  constructor(options: AutocompleteManagerOptions<TContext, TClient>) {
    this.client_ = options.client;
    this.autocompletesPath_ = options.autocompletesPath;
    this.createContext_ = options.createContext;
    this.onError_ = options.onError;
    this.permissionReply_ = options.permissionReply ?? false;
    this.errorReply_ = options.errorReply ?? false;
    this.cacheBust_ = options.cacheBust ?? true;
  }

  get autocompleteCache(): ReadonlyMap<string, AutocompleteModule<TContext>> {
    return this.autocompleteCache_;
  }

  async loadAutocompletes(): Promise<void> {
    const autocompletes = await loadDefaultModules<
      AutocompleteModule<TContext>
    >({
      directory: this.autocompletesPath_,
      cacheBust: this.cacheBust_,
      validate: (value): value is AutocompleteModule<TContext> =>
        value instanceof AutocompleteModule,
    });

    for (const autocomplete of autocompletes) {
      if (this.autocompleteCache_.has(autocomplete.cacheKey)) {
        warnDuplicate("AutocompleteManager", autocomplete.cacheKey);
      }

      this.autocompleteCache_.set(autocomplete.cacheKey, autocomplete);
    }
  }

  listen(): void {
    this.client_.on("interactionCreate", async (interaction) => {
      if (!interaction.isAutocomplete() || !interaction.inCachedGuild()) return;

      const focusedOption = interaction.options.getFocused(true);

      const exactKey = `${interaction.commandName}:${focusedOption.name}`;
      const fallbackKey = interaction.commandName;

      const autocomplete =
        this.autocompleteCache_.get(exactKey) ??
        this.autocompleteCache_.get(fallbackKey);

      if (!autocomplete) return;

      let context: TContext | undefined;

      try {
        context = await this.createContext_(interaction);

        const hasRequiredPermissions =
          autocomplete.permissionsRequired?.every((permission) =>
            interaction.memberPermissions.has(permission),
          ) ?? true;

        const hasResolvedPermission = autocomplete.permissionResolver
          ? await autocomplete.permissionResolver(context, interaction)
          : hasRequiredPermissions;

        if (!hasResolvedPermission) {
          if (this.permissionReply_ !== false) {
            await interaction.respond([]);
          }

          return;
        }

        const choices = await autocomplete.resolveChoices(context, interaction);
        await interaction.respond(choices);
      } catch (error) {
        await this.onError_?.({
          error,
          item: autocomplete,
          context,
          interaction,
        });

        if (this.errorReply_ !== false) {
          await interaction.respond([]);
        }
      }
    });
  }

  async reloadAutocompletes(): Promise<void> {
    this.autocompleteCache_.clear();
    await this.loadAutocompletes();
  }
}
