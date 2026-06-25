import type { CliCommand } from '@open-tomato/cli-core';

export interface CommandModule {
  default: (...args: unknown[]) => unknown;
  meta?: CliCommand;
}

export interface CommandListEntry {
  tool: string;
  command: string;
  meta: CliCommand | undefined;
}

export class CommandRegistry {
  private readonly byTool = new Map<string, Map<string, CommandModule>>();

  register(tool: string, command: string, module: CommandModule): void {
    let commands = this.byTool.get(tool);
    if (!commands) {
      commands = new Map<string, CommandModule>();
      this.byTool.set(tool, commands);
    }
    commands.set(command, module);
  }

  get(tool: string, command: string): CommandModule | null {
    return this.byTool.get(tool)?.get(command) ?? null;
  }

  list(): CommandListEntry[] {
    const entries: CommandListEntry[] = [];
    for (const [tool, commands] of this.byTool) {
      for (const [command, module] of commands) {
        entries.push({ tool, command, meta: module.meta });
      }
    }
    return entries;
  }
}
