# @glowland/discord-framework

A **small, typed, file-driven framework** for Discord bots on `discord.js`.

It does two things well:

1. **Load stuff from folders** (commands, buttons, menus, messages, events)
2. **Route Discord events to your code** (with types, context, and errors handled)

No magic. No DI. No hidden lifecycle.

---

## What you get

* Typed wrappers over `discord.js`
* File-based modules (drop a file → it works)
* Managers for each interaction type
* Centralized application-command registration (slash + context menus together)
* Built-in reload methods
* Minimal opinions about your app

---

## Install

```bash
npm i @glowland/discord-framework
npm i discord.js
```

---

## The rule (read this once)

> Put a module in the right folder, export the right class, call `load()`, then `listen()`.

That’s it.

---

## Folders (default idea)

```text
components/
  commands/        # slash commands
  context-menus/   # user/message context menus
  buttons/         # button handlers
  select-menus/    # select menu handlers
  messages/        # message modules
  events/          # raw discord events
```

Each manager loads ONE folder.

---

## Quick start (copy this)

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

// 1) context factory
const createContext = async (interaction) => ({
  client,
  guildDB: await client.guildDB.get(interaction.guildId)
});

// 2) managers
const slash = new SlashCommandManager({
  client,
  commandsPath: path.join(COMPONENTS_PATH, "commands"),
  createContext
});

const contextMenus = new ContextMenuManager({
  client,
  contextMenusPath: path.join(COMPONENTS_PATH, "context-menus"),
  createContext
});

const buttons = new ButtonManager({
  client,
  buttonsPath: path.join(COMPONENTS_PATH, "buttons"),
  createContext
});

const selects = new SelectMenuManager({
  client,
  selectMenusPath: path.join(COMPONENTS_PATH, "select-menus"),
  createContext
});

const messages = new MessageManager({
  client,
  messagesPath: path.join(COMPONENTS_PATH, "messages"),
  createContext: async (msg) => ({
    client,
    guildDB: await client.guildDB.get(msg.guildId)
  })
});

const events = new EventManager({
  client,
  eventsPath: path.join(COMPONENTS_PATH, "events"),
  createContext: async () => client
});

// 3) load command-like things
await slash.loadCommands();
await contextMenus.loadContextMenus();

// 4) REGISTER ONCE (IMPORTANT)
await registerApplicationCommands(
  client,
  [
    ...slash.commandCache.values(),
    ...contextMenus.contextMenuCache.values()
  ].map((c) => c.toJSON()),
  [
    ...slash.devCommandCache.values(),
    ...contextMenus.devContextMenuCache.values()
  ].map((c) => c.toJSON()),
  process.env.DEVELOPER_GUILD_ID
);

// 5) start listeners
slash.listen();
contextMenus.listen();

await buttons.loadButtons();
buttons.listen();

await selects.loadSelectMenus();
selects.listen();

await messages.loadMessages();
messages.listen();

await events.loadEvents();
events.listen();
```

---

## Why the shared registration?

Slash commands and context menus are the **same Discord registry**.

Calling `.commands.set()` twice will overwrite the previous set.

So:

* load both
* merge
* register once

Use `registerApplicationCommands` for that.

---

## Create components

### Slash command

```ts
import { SlashCommand } from "@glowland/discord-framework";

export default new SlashCommand({
  name: "ping",
  description: "Replies with Pong.",

  async execute(ctx, interaction) {
    await interaction.reply("Pong.");
  }
});
```

---

### Context menu

```ts
import { ContextMenu } from "@glowland/discord-framework";

export default new ContextMenu({
  name: "Inspect User",
  type: "User",

  async execute(ctx, interaction) {
    await interaction.reply({
      flags: "Ephemeral",
      content: interaction.targetUser.tag
    });
  }
});
```

Types:

* `User`
* `Message`

---

### Button

```ts
import { Button } from "@glowland/discord-framework";

export default new Button({
  customId: "example.ok",

  async execute(ctx, interaction) {
    await interaction.reply("ok");
  }
});
```

---

### Select menu

```ts
import { SelectMenu } from "@glowland/discord-framework";

export default new SelectMenu({
  customId: "example.select",
  type: "String",

  async execute(ctx, interaction) {
    await interaction.reply(interaction.values.join(", "));
  }
});
```

---

### Message module

```ts
import { MessageModule } from "@glowland/discord-framework";

export default new MessageModule({
  trigger: "!ping",

  async execute(ctx, message) {
    await message.reply("pong");
  }
});
```

If `trigger` is missing → runs on every message.

---

### Event module

```ts
import { EventModule } from "@glowland/discord-framework";

export default new EventModule({
  name: "ready",
  once: true,

  execute(client) {
    console.log(client.user.tag);
  }
});
```

---

## Context

Every manager calls your `createContext`.

You decide what goes in it.

```ts
createContext: async (interaction) => ({
  client,
  guildDB: await client.guildDB.get(interaction.guildId)
})
```

Keep it small.

---

## Permissions (buttons / selects)

```ts
export default new Button({
  customId: "admin",
  permission: "ManageGuild",

  async execute(ctx, i) {
    await i.reply("ok");
  }
});
```

If missing → framework blocks execution and replies.

---

## Reloading

```ts
await slash.reloadCommands();
await contextMenus.reloadContextMenus();
await buttons.reloadButtons();
await selects.reloadSelectMenus();
await messages.reloadMessages();
```

Reload = re-read files, update cache.

(No auto re-register.)

---

## Dev-only commands

```ts
devOnly: true
```

They:

* register only in `DEVELOPER_GUILD_ID`
* run only for `DEVELOPERS_IDS`

---

## Duplicate warnings

If two modules share the same key (name / customId), the framework logs a warning in dev.

Last one wins.

---

## Design goals

* explicit > implicit
* framework, not template
* minimal deps
* predictable runtime

---

## License

MIT
