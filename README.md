# @glowland/discord-framework

A **small, typed, file-driven framework** for Discord bots built on `discord.js`.

It handles the boring runtime work:

1. Load modules from folders.
2. Route Discord interactions, messages, voice updates, and events to those modules.
3. Inject your app context.
4. Handle permissions, errors, reloads, and command registration.

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
* Voice state update manager
* Event manager
* Shared application-command registration
* Developer-only application commands
* Built-in reload methods
* Dynamic permission system (`permissionResolver`)
* Duplicate component warnings in development
* Minimal assumptions about your project structure

---

## Installation

```bash
npm i @glowland/discord-framework discord.js
```

---

## Breaking changes

### Module renames

```ts
SlashCommand -> SlashCommandModule
ContextMenu -> ContextMenuModule
Button -> ButtonModule
SelectMenu -> SelectMenuModule
```

### Permissions system

`allowedRoleIds` was removed.

Use `permissionResolver` instead.

---

## Mental model

> Put a module in the right folder, export the right class, load the folder, then listen.

That is the whole framework.

You keep your bot architecture. The framework just gives you clean routing.

---

## Suggested folder structure

```text
components/
  commands/
  context-menus/
  buttons/
  select-menus/
  messages/
  voice-state-updates/
  events/
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
  VoiceStateUpdateManager,
  EventManager,
  registerApplicationCommands,
} from "@glowland/discord-framework";

const componentsPath = process.env.COMPONENTS_PATH!;

const createInteractionContext = async (interaction) => ({
  client,
  guildDB: await client.guildDB.get(interaction.guildId),
});
```

---

## Permissions

Buttons, select menus, and context menus support permission checks.

### Discord permissions

```ts
permissionsRequired: ["ManageGuild"]
```

### Dynamic permissions (recommended)

```ts
permissionResolver: (context, interaction) => {
  const roles = context.guildDB.data.adminRoles;
  return interaction.member.roles.cache.some(r => roles.includes(r.id));
}
```

### Access rule

```text
permissionResolver OR all required permissions
```

So a user can run the component if:

* the resolver returns `true`, or
* they have every permission listed in `permissionsRequired`

If access fails, the framework replies and does not execute the module.

---

## Modules

### Slash command

```ts
export default new SlashCommandModule({
  name: "ping",
  description: "Replies with Pong.",

  async execute(context, interaction) {
    await interaction.reply("Pong.");
  },
});
```

---

### Button

```ts
export default new ButtonModule({
  customId: "example.confirm",

  permissionResolver: (context, interaction) =>
    interaction.memberPermissions.has("ManageGuild"),

  async execute(context, interaction) {
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: "Confirmed.",
    });
  },
});
```

---

### Select menu

```ts
export default new SelectMenuModule({
  customId: "example.select",
  type: "String",

  async execute(context, interaction) {
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: interaction.values.join(", "),
    });
  },
});
```

---

### Message

```ts
export default new MessageModule({
  trigger: "!ping",

  async execute(context, message) {
    await message.reply("pong");
  },
});
```

---

### Event

```ts
export default new EventModule({
  name: "ready",
  once: true,

  execute(client) {
    console.log(`Ready as ${client.user.tag}`);
  },
});
```

---

## Context

Every manager receives a `createContext` function.

You control what goes inside.

```ts
createContext: async (interaction) => ({
  client,
  guildDB: await client.guildDB.get(interaction.guildId),
})
```

---

## Reloading

```ts
await buttons.reloadButtons();
```

Reloading = clear cache → re-import modules

---

## Design goals

* explicit over implicit
* small core
* strong typing without killing DX
* framework, not template
* no hidden lifecycle

---

## License

MIT
