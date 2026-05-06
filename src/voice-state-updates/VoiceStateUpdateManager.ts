// voice-state-updates/VoiceStateUpdateManager.ts

import type { Client, VoiceState } from "discord.js";
import {
  type FrameworkErrorPayload,
  type MaybePromise,
} from "../core/errors.js";
import { loadDefaultModules } from "../core/files.js";
import { VoiceStateUpdateModule } from "./VoiceStateUpdateModule.js";

export interface VoiceStateUpdateManagerOptions<
  TContext,
  TClient extends Client<true> = Client<true>,
> {
  client: TClient;
  voiceStateUpdatesPath: string;
  createContext: (
    oldState: VoiceState,
    newState: VoiceState,
  ) => MaybePromise<TContext>;
  onError?: (
    payload: FrameworkErrorPayload<
      VoiceStateUpdateModule<TContext>,
      TContext,
      undefined
    >,
  ) => MaybePromise<void>;
  cacheBust?: boolean;
}

export class VoiceStateUpdateManager<
  TContext,
  TClient extends Client<true> = Client<true>,
> {
  private readonly client_: TClient;
  private readonly voiceStateUpdatesPath_: string;
  private readonly createContext_: VoiceStateUpdateManagerOptions<TContext>["createContext"];
  private readonly onError_: VoiceStateUpdateManagerOptions<TContext>["onError"];
  private readonly cacheBust_: boolean;
  private voiceStateUpdateCache_: VoiceStateUpdateModule<TContext>[] = [];

  constructor(options: VoiceStateUpdateManagerOptions<TContext, TClient>) {
    this.client_ = options.client;
    this.voiceStateUpdatesPath_ = options.voiceStateUpdatesPath;
    this.createContext_ = options.createContext;
    this.onError_ = options.onError;
    this.cacheBust_ = options.cacheBust ?? true;
  }

  get voiceStateUpdateCache(): readonly VoiceStateUpdateModule<TContext>[] {
    return this.voiceStateUpdateCache_;
  }

  async loadVoiceStateUpdates(): Promise<void> {
    this.voiceStateUpdateCache_ = await loadDefaultModules<
      VoiceStateUpdateModule<TContext>
    >({
      directory: this.voiceStateUpdatesPath_,
      cacheBust: this.cacheBust_,
      validate: (value): value is VoiceStateUpdateModule<TContext> =>
        value instanceof VoiceStateUpdateModule,
    });
  }

  listen(): void {
    this.client_.on("voiceStateUpdate", async (oldState, newState) => {
      const context = await this.createContext_(oldState, newState);

      for (const module of this.voiceStateUpdateCache_) {
        try {
          await module.onTrigger(context, oldState, newState);
        } catch (error) {
          await this.onError_?.({
            error,
            item: module,
            context,
          });
        }
      }
    });
  }

  async reloadVoiceStateUpdates(): Promise<void> {
    this.voiceStateUpdateCache_ = [];
    await this.loadVoiceStateUpdates();
  }
}
