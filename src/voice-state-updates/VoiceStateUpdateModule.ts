import type { VoiceState } from "discord.js";
import type { MaybePromise } from "../core/errors.js";

export interface VoiceStateUpdateModuleOptions<TContext> {
  execute(
    context: TContext,
    oldState: VoiceState,
    newState: VoiceState,
  ): MaybePromise<void>;
}

export class VoiceStateUpdateModule<TContext = unknown> {
  readonly execute: VoiceStateUpdateModuleOptions<TContext>["execute"];

  constructor(options: VoiceStateUpdateModuleOptions<TContext>) {
    this.execute = options.execute;
  }
}
