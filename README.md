# @glowland/discord-framework

Typed, modular framework for building Discord bots with discord.js.

Designed around **separation of concerns**, **dynamic module loading**, and **explicit control** over runtime behavior.

---

## Features

* Typed abstractions over `discord.js`
* Modular architecture (commands, components, messages, events)
* Dynamic file-based loading
* Built-in reload APIs
* Minimal assumptions about your app structure
* Full access to low-level events when needed

---

## Installation

```bash
npm install @glowland/discord-framework
```

Peer dependency:

```bash
npm install discord.js
```

---

## Quick Example

### Slash Command

```ts
import { SlashCommand } from "@glowland/discord-framework/slash";

export default new SlashCommand({
  name: "ping",
  description: "Replies with Pong.",

  async execute(ctx, interaction) {
    await interaction.reply("Pong.");
  }
});
```

---

### Registering Managers

```ts
import path from "node:path";
import { SlashCommandManager } from "@glowland/discord-framework/slash";

const commands = new SlashCommandManager({
  client,
  commandsPath: path.join(process.env.COMPONENTS_PATH!, "commands"),

  createContext: async (interaction) => ({
    client,
    guildDB: await client.guildDB.get(interaction.guildId)
  })
});

await commands.loadCommands();
await commands.registerCommands();
commands.listen();
```

---

## Architecture

The framework is built in layers:

### High-level managers

* SlashCommandManager
* ButtonManager
* SelectMenuManager
* MessageManager

These provide:

* structured pipelines
* permission handling
* context injection

---

### Low-level access

* EventManager
* EventModule

Use this when you need full control over raw `discord.js` events.

```ts
export default new EventModule({
  name: "ready",

  async execute(client) {
    console.log(`Ready as ${client.user.tag}`);
  }
});
```

---

## Context System

Every manager receives a `createContext` function:

```ts
createContext: async (interaction) => ({
  client,
  guildDB: await client.guildDB.get(interaction.guildId)
})
```

This keeps the framework:

* unopinionated
* decoupled from your services

---

## Reloading

Managers include built-in reload methods:

```ts
await commands.reloadCommands();
await buttons.reloadButtons();
await messages.reloadMessages();
```

You can implement your own file watchers or trigger reloads manually.

---

## Design Goals

* No hidden magic
* Strong typing without breaking DX
* Explicit over implicit
* Framework, not a template

---

## License

MIT
