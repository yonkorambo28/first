// Tiny JSON-file persistence. Good enough for a demo; swap for Postgres before real launch.
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { freshState, type State } from "./engine.ts";

export function load(file: string): State {
  if (existsSync(file)) return JSON.parse(readFileSync(file, "utf8")) as State;
  return freshState();
}

export function saver(file: string, state: () => State, delayMs = 500) {
  let timer: NodeJS.Timeout | null = null;
  const flush = () => {
    timer = null;
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(`${file}.tmp`, JSON.stringify(state()));
    renameSync(`${file}.tmp`, file);
  };
  return {
    schedule() {
      timer ??= setTimeout(flush, delayMs);
    },
    flush,
  };
}
