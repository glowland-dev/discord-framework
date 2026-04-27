import type { MaybePromise } from "./errors.js";

export type PermissionResolver<TContext, TInteraction> = (
  context: TContext,
  interaction: TInteraction,
) => MaybePromise<boolean>;
