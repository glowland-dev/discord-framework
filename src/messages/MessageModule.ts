import type { Message } from "discord.js";
import type { MaybePromise } from "../core/errors.js";

export interface MessageModuleOptions<TContext> {
  trigger?: string;
  onTrigger(context: TContext, message: Message<true>): MaybePromise<void>;
}

export class MessageModule<TContext = unknown> {
  readonly trigger: string | undefined;
  readonly onTrigger: MessageModuleOptions<TContext>["onTrigger"];

  constructor(options: MessageModuleOptions<TContext>) {
    this.trigger = options.trigger?.toLowerCase();
    this.onTrigger = options.onTrigger;
  }
}
