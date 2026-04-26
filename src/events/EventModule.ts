import type { ClientEvents } from "discord.js";
import type { MaybePromise } from "../core/errors.js";

export type EventName = keyof ClientEvents;

export interface EventModuleOptions<TContext, TName extends EventName> {
  name: TName;
  once?: boolean;

  execute(context: TContext, ...args: ClientEvents[TName]): MaybePromise<void>;
}

export class EventModule<TContext, TName extends EventName> {
  readonly name: TName;
  readonly once: boolean;
  readonly execute: EventModuleOptions<TContext, TName>["execute"];

  constructor(options: EventModuleOptions<TContext, TName>) {
    this.name = options.name;
    this.once = options.once ?? false;
    this.execute = options.execute;
  }
}
