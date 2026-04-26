import type { Client, Message } from "discord.js";
import {
  type FrameworkErrorPayload,
  type MaybePromise,
} from "../core/errors.js";
import { MessageModule } from "./MessageModule.js";
import { loadDefaultModules } from "../core/files.js";

export interface MessageManagerOptions<
  TContext,
  TClient extends Client<true> = Client<true>,
> {
  client: Client<true>;
  messagesPath: string;
  createContext: (message: Message<true>) => MaybePromise<TContext>;
  onError?: (
    payload: FrameworkErrorPayload<
      MessageModule<TContext>,
      TContext,
      Message<true>
    >,
  ) => MaybePromise<void>;
  ignoreBots?: boolean;
  cacheBust?: boolean;
}

export class MessageManager<
  TContext,
  TClient extends Client<true> = Client<true>,
> {
  private readonly client_: Client<true>;
  private readonly messagesPath_: string;
  private readonly createContext_: MessageManagerOptions<TContext>["createContext"];
  private readonly onError_: MessageManagerOptions<TContext>["onError"];
  private readonly ignoreBots_: boolean;
  private readonly cacheBust_: boolean;
  private messageCache_: MessageModule<TContext>[] = [];

  constructor(options: MessageManagerOptions<TContext>) {
    this.client_ = options.client;
    this.messagesPath_ = options.messagesPath;
    this.createContext_ = options.createContext;
    this.onError_ = options.onError;
    this.ignoreBots_ = options.ignoreBots ?? true;
    this.cacheBust_ = options.cacheBust ?? true;
  }

  get messageCache(): readonly MessageModule<TContext>[] {
    return this.messageCache_;
  }

  async loadMessages(): Promise<void> {
    this.messageCache_ = await loadDefaultModules<MessageModule<TContext>>({
      directory: this.messagesPath_,
      cacheBust: this.cacheBust_,
      validate: (value): value is MessageModule<TContext> =>
        value instanceof MessageModule,
    });
  }

  listen(): void {
    this.client_.on("messageCreate", async (message) => {
      if (!message.inGuild()) return;
      if (this.ignoreBots_ && message.author.bot) return;

      const context = await this.createContext_(message);
      const firstWord = message.content.split(" ")[0]?.toLowerCase();

      for (const module of this.messageCache_) {
        try {
          if (module.trigger && firstWord !== module.trigger) continue;
          await module.execute(context, message);
        } catch (error) {
          await this.onError_?.({
            error,
            item: module,
            context,
            interaction: message,
          });
        }
      }
    });
  }

  async reloadMessages(): Promise<void> {
    this.messageCache_ = [];
    await this.loadMessages();
  }
}
