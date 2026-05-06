import type { ClientEvents } from "discord.js";
import type { MaybePromise } from "../core/errors.js";

export type EventName = keyof ClientEvents;

export interface EventModuleOptions<TContext, TName extends EventName> {
  name: TName;
  once?: boolean;

  onTrigger(
    context: TContext,
    ...args: ClientEvents[TName]
  ): MaybePromise<void>;
}

export class EventModule<TContext, TName extends EventName> {
  readonly name: TName;
  readonly once: boolean;
  readonly onTrigger: EventModuleOptions<TContext, TName>["onTrigger"];

  constructor(options: EventModuleOptions<TContext, TName>) {
    this.name = options.name;
    this.once = options.once ?? false;
    this.onTrigger = options.onTrigger;
  }
}
