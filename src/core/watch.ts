import { watch } from "node:fs";

export interface ModuleWatcher {
  close(): void;
}

export interface WatchModulesOptions {
  directory: string;
  debounceMs?: number;
  onChange: () => void | Promise<void>;
  onError?: (error: unknown) => void | Promise<void>;
}

export function watchModules(options: WatchModulesOptions): ModuleWatcher {
  let timeout: NodeJS.Timeout | undefined;
  let reloading = false;
  let queued = false;

  const run = async () => {
    if (reloading) {
      queued = true;
      return;
    }

    reloading = true;

    try {
      await options.onChange();
    } catch (error) {
      await options.onError?.(error);
    } finally {
      reloading = false;

      if (queued) {
        queued = false;
        void run();
      }
    }
  };

  const watcher = watch(options.directory, { recursive: true }, () => {
    clearTimeout(timeout);

    timeout = setTimeout(() => {
      void run();
    }, options.debounceMs ?? 300);
  });

  return {
    close() {
      clearTimeout(timeout);
      watcher.close();
    },
  };
}
