import type { VoiceState } from "discord.js";
import type { MaybePromise } from "../core/errors.js";

export interface VoiceStateUpdateModuleOptions<TContext> {
  onTrigger(
    context: TContext,
    oldState: VoiceState,
    newState: VoiceState,
  ): MaybePromise<void>;
}

export class VoiceStateUpdateModule<TContext = unknown> {
  readonly onTrigger: VoiceStateUpdateModuleOptions<TContext>["onTrigger"];

  constructor(options: VoiceStateUpdateModuleOptions<TContext>) {
    this.onTrigger = options.onTrigger;
  }
}
