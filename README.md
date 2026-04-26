# @glowland/discord-framework

A **small, typed, file-driven framework** for Discord bots built on `discord.js`.

It handles the boring runtime work:

1. Load modules from folders.
2. Route Discord interactions/events to those modules.
3. Inject your app context.
4. Handle permissions, errors, reloads, and registration.

No DI container. No hidden lifecycle. No template prison.

---

## Features

* Typed wrappers over `discord.js`
* File-based module loading
* Slash command manager
* Context menu manager
* Button manager
* Select menu manager
* Message module manager
* Event manager
* Shared application-command registration
* Developer-only application commands
* Built-in reload methods
* Permission checks with role bypass support
* Duplicate component warnings in development
* Minimal assumptions about your project structure

---

## Installation

```bash
npm i @glowland/discord-framework discord.js
```

---

## Mental model

> Put a module in the right folder, export the right class, load the folder, then listen.

That is the whole framework.

You keep your bot architecture. The framework just gives you clean routing.

---

## Suggested folder structure

```text
components/
  commands/        # slash commands
  context-menus/   # user/message context menus
  buttons/         # button handlers
  select-menus/    # select menu handlers
  messages/        # message modules
  events/          # raw discord.js events
```

Each manager loads one folder.

---

## Quick start

```ts
import path from "node:path";
import {
  SlashCommandManager,
  ContextMenuManager,
  ButtonManager,
  SelectMenuManager,
  MessageManager,
  EventManager,
  registerApplicationCommands
} from "@glowland/discord-framework";

const componentsPath = process.env.COMPONENTS_PATH!;

const createContext = async (interaction: { guildId: string }) => ({
  client,
  guildDB: await client.guildDB.get(interaction.guildId)
});

const slashCommands = new SlashCommandManager({
  client,
  commandsPath: path.join(componentsPath, "commands"),
  developerGuildId: process.env.DEVELOPER_GUILD_ID,
  developerIds: process.env.DEVELOPERS_IDS?.split(",").map((id) => id.trim()) ?? [],
  createContext
});

const contextMenus = new ContextMenuManager({
  client,
  contextMenusPath: path.join(componentsPath, "context-menus"),
  developerGuildId: process.env.DEVELOPER_GUILD_ID,
  developerIds: process.env.DEVELOPERS_IDS?.split(",").map((id) => id.trim()) ?? [],
  createContext
});

const buttons = new ButtonManager({
  client,
  buttonsPath: path.join(componentsPath, "buttons"),
  createContext
});

const selectMenus = new SelectMenuManager({
  client,
  selectMenusPath: path.join(componentsPath, "select-menus"),
  createContext
});

const messages = new MessageManager({
  client,
  messagesPath: path.join(componentsPath, "messages"),
  createContext: async (message) => ({
    client,
    guildDB: await client.guildDB.get(message.guildId)
  })
});

const events = new EventManager({
  client,
  eventsPath: path.join(componentsPath, "events"),
  createContext: async () => client
});

await slashCommands.loadCommands();
await contextMenus.loadContextMenus();

await registerApplicationCommands(
  client,
  [
    ...slashCommands.commandCache.values(),
    ...contextMenus.contextMenuCache.values()
  ].map((command) => command.toJSON()),
  [
    ...slashCommands.devCommandCache.values(),
    ...contextMenus.devContextMenuCache.values()
  ].map((command) => command.toJSON()),
  process.env.DEVELOPER_GUILD_ID
);

slashCommands.listen();
contextMenus.listen();

await buttons.loadButtons();
buttons.listen();

await selectMenus.loadSelectMenus();
selectMenus.listen();

await messages.loadMessages();
messages.listen();

await events.loadEvents();
events.listen();
```

---

## Important: register slash commands and context menus together

Slash commands and context menus both live in Discord's application command registry.

Calling `.commands.set(...)` replaces the full command list for that scope.

So do this:

1. Load slash commands.
2. Load context menus.
3. Merge both lists.
4. Register once.

Use:

```ts
await registerApplicationCommands(client, globalCommands, developerCommands, developerGuildId);
```

Do **not** independently register slash commands and context menus unless you intentionally want to replace one set with the other.

---

## Components

### Slash command

```ts
import { SlashCommand } from "@glowland/discord-framework";

export default new SlashCommand({
  name: "ping",
  description: "Replies with Pong.",

  async execute(context, interaction) {
    await interaction.reply("Pong.");
  }
});
```

Slash command names are normalized to lowercase and spaces are replaced with hyphens.

---

### Context menu

```ts
import { ContextMenu } from "@glowland/discord-framework";

export default new ContextMenu({
  name: "Inspect User",
  type: "User",

  async execute(context, interaction) {
    await interaction.reply({
      flags: "Ephemeral",
      content: interaction.targetUser.tag
    });
  }
});
```

Supported types:

* `User`
* `Message`

The `type` field narrows the interaction type.

---

### Button

```ts
import { Button } from "@glowland/discord-framework";

export default new Button({
  customId: "example.confirm",

  async execute(context, interaction) {
    await interaction.reply({
      flags: "Ephemeral",
      content: "Confirmed."
    });
  }
});
```

Buttons are matched by `customId`.

---

### Select menu

```ts
import { SelectMenu } from "@glowland/discord-framework";

export default new SelectMenu({
  customId: "example.select",
  type: "String",

  async execute(context, interaction) {
    await interaction.reply({
      flags: "Ephemeral",
      content: interaction.values.join(", ")
    });
  }
});
```

Supported types:

* `String`
* `User`
* `Role`
* `Mentionable`
* `Channel`

The `type` field narrows the interaction type.

---

### Message module

```ts
import { MessageModule } from "@glowland/discord-framework";

export default new MessageModule({
  trigger: "!ping",

  async execute(context, message) {
    await message.reply("pong");
  }
});
```

If `trigger` is omitted, the module runs for every guild message.

Use global message modules carefully.

---

### Event module

```ts
import { EventModule } from "@glowland/discord-framework";

export default new EventModule({
  name: "ready",
  once: true,

  execute(client) {
    console.log(`Ready as ${client.user.tag}`);
  }
});
```

Event modules map directly to `discord.js` client events.

---

## Context

Every manager receives a `createContext` function.

The framework does not decide what your context is. You do.

```ts
createContext: async (interaction) => ({
  client,
  guildDB: await client.guildDB.get(interaction.guildId)
})
```

Keep it small. Put shared services there.

---

## Cleaner app-specific aliases

The framework stays generic, but your bot can create nicer local aliases.

```ts
import {
  SlashCommand,
  Button,
  MessageModule,
  ContextMenu,
  SelectMenu,
  type ContextMenuOptions,
  type ContextType,
  type SelectMenuOptions,
  type SelectType
} from "@glowland/discord-framework";
import type { GlowContext } from "./GlowContext.js";

export const GlowCommand = SlashCommand<GlowContext>;
export const GlowButton = Button<GlowContext>;
export const GlowMessage = MessageModule<GlowContext>;

export class GlowContextMenu<T extends ContextType> extends ContextMenu<GlowContext, T> {
  constructor(options: ContextMenuOptions<GlowContext, T>) {
    super(options);
  }
}

export class GlowSelectMenu<T extends SelectType> extends SelectMenu<GlowContext, T> {
  constructor(options: SelectMenuOptions<GlowContext, T>) {
    super(options);
  }
}
```

Then component files stay clean:

```ts
import { GlowCommand } from "../../framework/aliases.js";

export default new GlowCommand({
  name: "ping",
  description: "Replies with Pong.",

  async execute(context, interaction) {
    await interaction.reply("Pong.");
  }
});
```

This gives you app-specific ergonomics without forcing magic into the framework.

---

## Permissions

Buttons, select menus, and context menus support permission checks.

Use `permissionsRequired` when a user must have Discord permissions:

```ts
export default new Button({
  customId: "admin.confirm",
  permissionsRequired: ["ManageGuild"],

  async execute(context, interaction) {
    await interaction.reply({
      flags: "Ephemeral",
      content: "Allowed."
    });
  }
});
```

Use `allowedRoleIds` as a bypass:

```ts
export default new Button({
  customId: "staff.confirm",
  permissionsRequired: ["ManageGuild"],
  allowedRoleIds: ["123456789012345678"],

  async execute(context, interaction) {
    await interaction.reply({
      flags: "Ephemeral",
      content: "Allowed."
    });
  }
});
```

Access rule:

```text
allowed role OR all required permissions
```

So a user can run the component if:

* they have one of the allowed roles, or
* they have every permission listed in `permissionsRequired`

If access fails, the framework replies and does not execute the module.

---

## Developer-only commands

Slash commands and context menus can be marked as developer-only.

```ts
devOnly: true
```

Developer-only commands:

* register to `DEVELOPER_GUILD_ID`
* only run for users listed in `developerIds`

Example manager setup:

```ts
new SlashCommandManager({
  client,
  commandsPath,
  developerGuildId: process.env.DEVELOPER_GUILD_ID,
  developerIds: process.env.DEVELOPERS_IDS?.split(",").map((id) => id.trim()) ?? [],
  createContext
});
```

---

## Reloading

Managers include reload methods:

```ts
await slashCommands.reloadCommands();
await contextMenus.reloadContextMenus();
await buttons.reloadButtons();
await selectMenus.reloadSelectMenus();
await messages.reloadMessages();
```

Reloading means:

```text
clear cache → re-read files → rebuild cache
```

Reloading slash commands or context menus does **not** automatically re-register with Discord.

After reloading command-like modules, call `registerApplicationCommands` again.

---

## Duplicate warnings

In development, the framework warns when two modules register the same key.

Examples:

* same slash command name
* same context menu `type:name`
* same button `customId`
* same select menu `customId`

Last loaded module wins.

---

## Error handling

Each manager accepts an optional `onError` callback.

Example:

```ts
new ButtonManager({
  client,
  buttonsPath,
  createContext,

  onError: ({ error, item, context, interaction }) => {
    console.error(`Button failed: ${item.customId}`, error);
  }
});
```

Interaction managers can also send an error reply when execution fails.

---

## Design goals

* explicit over implicit
* small core
* strong typing without killing DX
* framework, not template
* runtime behavior you can trace
* no hidden service container
* no forced project structure

---

## License
