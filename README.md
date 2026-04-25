# @glowland/discord-framework

Small typed framework for loading and dispatching `discord.js` modules.

This package is extracted from Glow's internal handler pattern: file-system driven slash commands, buttons, select menus, messages, and events with app-specific state injected through a generic context.

## Install

```bash
npm install @glowland/discord-framework discord.js
```

## Slash commands

```ts
import path from "node:path";
import { SlashCommandManager } from "@glowland/discord-framework/slash";

type GlowContext = {
  client: Bot;
  guildDB: GuildDB;
};

const slashCommands = new SlashCommandManager<GlowContext>({
  client,
  commandsPath: path.join(process.env.COMPONENTS_PATH!, "commands"),
  developerGuildId: process.env.DEVELOPER_GUILD_ID,
  developerIds: process.env.DEVELOPERS_IDS!.split(",").map((id) => id.trim()),

  createContext: async (interaction) => ({
    client,
    guildDB: await client.guildDB.get(interaction.guildId)
  }),

  onError: ({ error, item }) => {
    void client.bus.emit("alert", {
      name: `COMMAND_EXECUTION_FAILURE:${item.name}`,
      severity: item.devOnly ? "warning" : "critical",
      error
    });
  }
});

await slashCommands.loadCommands();
await slashCommands.registerCommands();
slashCommands.listen();
```

Command module:

```ts
import { SlashCommand } from "@glowland/discord-framework/slash";

export default new SlashCommand<GlowContext>({
  name: "ping",
  description: "Replies with pong.",

  async execute({ client, guildDB }, interaction) {
    await interaction.reply("Pong.");
  }
});
```

## Buttons

```ts
import { Button } from "@glowland/discord-framework/buttons";

export default new Button<GlowContext>({
  customId: "music.stop",
  permission: "ManageGuild",

  async execute({ client, guildDB }, interaction) {
    await interaction.deferUpdate();
  }
});
```

## Select menus

```ts
import { SelectMenu, SelectMenuType } from "@glowland/discord-framework/select-menus";

export default new SelectMenu<GlowContext, "String">({
  customId: "settings.language",
  type: "String",

  async execute(context, interaction) {
    const selected = interaction.values[0];
    await interaction.reply({ flags: "Ephemeral", content: selected });
  }
});
```

## Messages

```ts
import { MessageModule } from "@glowland/discord-framework/messages";

export default new MessageModule<GlowContext>({
  trigger: "!ping",

  async execute(context, message) {
    await message.reply("Pong.");
  }
});
```

## Events

```ts
import { EventModule } from "@glowland/discord-framework/events";

export default new EventModule<GlowContext, "ready">({
  name: "ready",
  once: true,

  async execute({ client }) {
    console.log(`${client.user.tag} ready`);
  }
});
```

## Design

The package intentionally does not know about your `Bot`, database layer, event bus, colors, emojis, or environment variables. Those belong in the app. Managers receive a `createContext` hook and optional error/permission replies so your bot keeps full control.

## Notes

- Node.js 20+ recommended.
- `discord.js` is a peer dependency.
- Dynamic imports use cache busting by default so reload methods can pick up edited files during development.
