import type { AutocompleteInteraction, PermissionFlagsBits } from "discord.js";

import type { MaybePromise } from "../core/errors.js";
import type { PermissionResolver } from "../core/permissions.js";

export interface AutocompleteChoice {
  name: string;
  value: string | number;
}

export interface AutocompleteModuleOptions<TContext> {
  commandName: string;
  optionName?: string;

  choices:
    | AutocompleteChoice[]
    | ((
        context: TContext,
        interaction: AutocompleteInteraction<"cached">,
      ) => MaybePromise<AutocompleteChoice[]>);

  permissionsRequired?: (keyof typeof PermissionFlagsBits)[];
  permissionResolver?: PermissionResolver<
    TContext,
    AutocompleteInteraction<"cached">
  >;

  filter?: (
    choice: AutocompleteChoice,
    focused: string,
    context: TContext,
    interaction: AutocompleteInteraction<"cached">,
  ) => boolean;
}

export class AutocompleteModule<TContext = unknown> {
  readonly commandName: string;
  readonly optionName?: string;
  readonly choices: AutocompleteModuleOptions<TContext>["choices"];
  readonly filter?: AutocompleteModuleOptions<TContext>["filter"];

  readonly permissionsRequired?: (keyof typeof PermissionFlagsBits)[];
  readonly permissionResolver?: PermissionResolver<
    TContext,
    AutocompleteInteraction<"cached">
  >;

  constructor(options: AutocompleteModuleOptions<TContext>) {
    this.commandName = options.commandName;
    this.optionName = options.optionName;
    this.choices = options.choices;
    this.filter = options.filter;
  }

  get cacheKey(): string {
    return this.optionName
      ? `${this.commandName}:${this.optionName}`
      : this.commandName;
  }

  async resolveChoices(
    context: TContext,
    interaction: AutocompleteInteraction<"cached">,
  ): Promise<AutocompleteChoice[]> {
    const focused = interaction.options.getFocused().toLowerCase();

    const choices =
      typeof this.choices === "function"
        ? await this.choices(context, interaction)
        : this.choices;

    return choices
      .filter((choice) =>
        this.filter
          ? this.filter(choice, focused, context, interaction)
          : choice.name.toLowerCase().includes(focused),
      )
      .slice(0, 25);
  }
}
