import type { Message } from "discord.js";
import type { MaybePromise } from "../core/index.js";

export interface MessageModuleOptions<TContext> {
  trigger?: string;
  execute(context: TContext, message: Message<true>): MaybePromise<void>;
}

export class MessageModule<TContext = unknown> {
  readonly trigger: string | undefined;
  readonly execute: MessageModuleOptions<TContext>["execute"];

  constructor(options: MessageModuleOptions<TContext>) {
    this.trigger = options.trigger?.toLowerCase();
    this.execute = options.execute;
  }
}
