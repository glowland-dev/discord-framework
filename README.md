# @glowland/discord-framework

A small, typed, file-driven framework for Discord bots built on `discord.js`.

It handles the repetitive runtime work so you can focus on your actual bot architecture.

- Load modules from folders
- Route Discord interactions and events
- Inject application context
- Handle permissions and errors
- Reload components without restarting
- Register application commands

No DI container. No decorators. No hidden lifecycle.

---

## Features

- Typed wrappers over `discord.js`
- File-based module loading
- Slash command manager
- Context menu manager
- Button manager
- Select menu manager
- Modal submit manager
- Autocomplete manager
- Message manager
- Voice state update manager
- Event manager
- Shared application-command registration
- Developer-only application commands
- Built-in hot reload methods
- Dynamic permission system
- Duplicate module warnings in development
- Minimal assumptions about project structure

---

## Installation

```bash
npm i @glowland/discord-framework discord.js
```

---

## Mental model

> Put a module in the right folder, export the right class, load the folder, then listen.

That is the framework.

You keep your architecture.
The framework only handles routing and runtime orchestration.

---

## Suggested folder structure

```text
components/
  commands/
  context-menus/
  buttons/
  select-menus/
  modals/
  autocompletes/
  messages/
  voice-state-updates/
  events/
```

Each manager loads one folder.

---

## Quick start

```ts
import {
  SlashCommandManager,
  ContextMenuManager,
  ButtonManager,
  SelectMenuManager,
  ModalSubmitManager,
  AutocompleteManager,
  MessageManager,
  VoiceStateUpdateManager,
  EventManager,
  registerApplicationCommands,
} from "@glowland/discord-framework";

const createInteractionContext = async (interaction) => ({
  client,
  guildDB: await client.guildDB.get(interaction.guildId),
});
```

---

## Permissions

Interaction-based modules support permission checks.

### Discord permissions

```ts
permissionsRequired: ["ManageGuild"]
```

### Dynamic permissions

```ts
permissionResolver: (context, interaction) => {
  const roles = context.guildDB.data.adminRoles;

  return interaction.member.roles.cache.some((role) =>
    roles.includes(role.id),
  );
}
```

### Access rule

```text
permissionResolver OR all required permissions
```

A user can access the module if:

- `permissionResolver` returns `true`, or
- they have every permission listed in `permissionsRequired`

If access fails, the framework replies automatically and the module is not triggered.

---

# Modules

## Slash command

```ts
export default new SlashCommandModule({
  name: "ping",
  description: "Replies with Pong.",

  async onTrigger(context, interaction) {
    await interaction.reply("Pong.");
  },
});
```

---

## Button

```ts
export default new ButtonModule({
  customId: "example.confirm",

  async onTrigger(context, interaction) {
    await interaction.reply({
      flags: "Ephemeral",
      content: "Confirmed.",
    });
  },
});
```

---

## Select menu

```ts
export default new SelectMenuModule({
  customId: "example.select",
  type: "String",

  async onTrigger(context, interaction) {
    await interaction.reply({
      flags: "Ephemeral",
      content: interaction.values.join(", "),
    });
  },
});
```

---

## Modal

```ts
export default new ModalModule({
  customId: "example.modal",

  build() {
    return new ModalBuilder()
      .setCustomId("example.modal")
      .setTitle("Example");
  },

  async onTrigger(context, interaction) {
    await interaction.reply({
      flags: "Ephemeral",
      content: "Modal submitted.",
    });
  },
});
```

---

## Autocomplete

```ts
export default new AutocompleteModule({
  commandName: "config",
  optionName: "module",

  choices: [
    { name: "Automod", value: "automod" },
    { name: "Suggestions", value: "suggestions" },
    { name: "Auto Voice", value: "auto_voice" },
  ],
});
```

Dynamic choices are also supported.

```ts
export default new AutocompleteModule({
  commandName: "warp",
  optionName: "target",

  async choices(context) {
    return context.guildDB.data.warps.map((warp) => ({
      name: warp.name,
      value: warp.id,
    }));
  },
});
```

The framework automatically:
- filters choices using the focused value
- limits responses to 25 choices
- responds to the interaction

---

## Message

```ts
export default new MessageModule({
  trigger: "!ping",

  async onTrigger(context, message) {
    await message.reply("pong");
  },
});
```

---

## Voice state update

```ts
export default new VoiceStateUpdateModule({
  async onTrigger(context, oldState, newState) {
    console.log(`${newState.member?.user.tag} joined a voice channel.`);
  },
});
```

---

## Event

```ts
export default new EventModule({
  name: "ready",
  once: true,

  onTrigger(client) {
    console.log(`Ready as ${client.user.tag}`);
  },
});
```

---

# Context

Every manager receives a `createContext` function.

You decide what goes inside.

```ts
createContext: async (interaction) => ({
  client,
  guildDB: await client.guildDB.get(interaction.guildId),
})
```

---

# Reloading

```ts
await buttons.reloadButtons();
```

Reloading works by:
1. clearing the internal cache
2. re-importing every module

No process restart required.

---

# Design goals

- explicit over implicit
- strong typing without killing DX
- framework, not template
- minimal abstractions
- predictable runtime behavior
- no hidden lifecycle

---

# License

MIT