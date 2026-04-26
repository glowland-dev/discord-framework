// core/commands.ts

import type { ApplicationCommandDataResolvable, Client } from "discord.js";

export async function registerApplicationCommands(
  client: Client<true>,
  commands: ApplicationCommandDataResolvable[],
  developerCommands: ApplicationCommandDataResolvable[] = [],
  developerGuildId?: string,
): Promise<void> {
  await client.application?.commands.set(commands);

  if (!developerGuildId) return;

  const guild = client.guilds.cache.get(developerGuildId);
  await guild?.commands.set(developerCommands);
}
