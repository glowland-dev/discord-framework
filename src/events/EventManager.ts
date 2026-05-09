import type { Client, ClientEvents } from "discord.js";

import type { FrameworkErrorPayload, MaybePromise } from "../core/errors.js";
import type { EventModule } from "./EventModule.js";
import { loadDefaultModules } from "../core/files.js";

type AnyEventModule<TContext> = EventModule<TContext, keyof ClientEvents>;

export interface EventManagerOptions<
  TContext,
  TClient extends Client<true> = Client<true>,
> {
  client: TClient;
  eventsPath: string;
  createContext: (
    eventName: keyof ClientEvents,
    args: readonly unknown[],
  ) => MaybePromise<TContext>;
  onError?: (
    payload: FrameworkErrorPayload<
      AnyEventModule<TContext>,
      TContext,
      undefined
    >,
  ) => MaybePromise<void>;
  cacheBust?: boolean;
}

export class EventManager<
  TContext,
  TClient extends Client<true> = Client<true>,
> {
  private readonly client_: TClient;
  private readonly eventsPath_: string;
  private readonly createContext_: EventManagerOptions<TContext>["createContext"];
  private readonly onError_: EventManagerOptions<TContext>["onError"];
  private readonly cacheBust_: boolean;
  private eventCache_: AnyEventModule<TContext>[] = [];
  private listening_ = false;

  constructor(options: EventManagerOptions<TContext, TClient>) {
    this.client_ = options.client;
    this.eventsPath_ = options.eventsPath;
    this.createContext_ = options.createContext;
    this.onError_ = options.onError;
    this.cacheBust_ = options.cacheBust ?? true;
  }

  get eventCache(): readonly AnyEventModule<TContext>[] {
    return this.eventCache_;
  }

  async loadEvents(): Promise<void> {
    this.eventCache_ = await loadDefaultModules<AnyEventModule<TContext>>({
      directory: this.eventsPath_,
      cacheBust: this.cacheBust_,
      validate: (value): value is AnyEventModule<TContext> =>
        typeof value === "object" &&
        value !== null &&
        "name" in value &&
        "onTrigger" in value &&
        typeof (value as any).name === "string" &&
        typeof (value as any).onTrigger === "function",
    });
  }

  listen(): void {
    if (this.listening_) return;

    if (this.eventCache_.length === 0) {
      throw new Error(
        "[EventManager] Cannot call listen() before loadEvents().",
      );
    }

    this.listening_ = true;

    const seen = new Set<string>();

    for (const event of this.eventCache_) {
      const key = `${event.name}:${event.once}`;

      if (seen.has(key)) {
        console.warn(
          `[EventManager] Duplicate event detected: ${event.name} (once=${event.once}). ` +
            `This may cause multiple handlers to run.`,
        );
      }

      seen.add(key);
    }

    this.eventCache_.forEach((event) => {
      const callback = async (...args: unknown[]) => {
        let context: TContext | undefined;

        try {
          context = await this.createContext_(event.name, args);
          await event.onTrigger(context, ...(args as never));
        } catch (error) {
          try {
            await this.onError_?.({
              error,
              item: event,
              context,
            });
          } catch (err) {
            console.error("[EventManager] onError handler failed:", err);
          }
        }
      };

      if (event.once) {
        this.client_.once(
          event.name as any,
          callback as (...args: any[]) => void,
        );
      } else {
        this.client_.on(
          event.name as any,
          callback as (...args: any[]) => void,
        );
      }
    });

    if (process.env.NODE_ENV !== "production") {
      console.log(`[EventManager] Loaded ${this.eventCache_.length} events`);
    }
  }
}
