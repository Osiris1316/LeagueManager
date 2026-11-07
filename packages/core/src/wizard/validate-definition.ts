// packages/core/src/wizard/validate-definition.ts

export type Scope = "mine" | "opponent" | "global";

export interface SequenceTurn {
  actor?: string;   // "host" | "guest" | future "prev_loser" — kept open, not an enum
  action: string;   // "ban" | "pick" | "auto_survivor" | future "snipe"
  scope?: Scope;    // absent ⇒ global (correct for maps; explicit for civs)
}

export interface SequenceDefinition {
  kind: "sequence";
  turns: SequenceTurn[];
}

export interface SimultaneousDefinition {
  kind: "simultaneous";
  timer_seconds: number | null;  // null ⇒ untimed
  on_timeout?: string;           // "random" | ...
  hidden?: boolean;
}

export type Definition = SequenceDefinition | SimultaneousDefinition;

export interface ValidationContext {
  poolSize: number;  // season_maps count for this season
  bestOf: number;    // match.best_of, e.g. 3
}

export type ValidationResult =
  | { valid: true; definition: Definition }
  | { valid: false; errors: string[] };

const KNOWN_ACTIONS = new Set(["ban", "pick", "auto_survivor"]);
const KNOWN_SCOPES = new Set(["mine", "opponent", "global"]);
const KNOWN_TIMEOUTS = new Set(["random"]);

export function validateDefinition(
  raw: string,
  ctx: ValidationContext
): ValidationResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { valid: false, errors: ["definition is not valid JSON"] };
  }
  if (typeof parsed !== "object" || parsed === null) {
    return { valid: false, errors: ["definition must be a JSON object"] };
  }

  const kind = (parsed as { kind?: unknown }).kind;
  if (kind === "sequence") return validateSequence(parsed as SequenceDefinition, ctx);
  if (kind === "simultaneous") return validateSimultaneous(parsed as SimultaneousDefinition);

  return {
    valid: false,
    errors: [`unknown kind ${JSON.stringify(kind)} (expected "sequence" or "simultaneous")`],
  };
}

function validateSequence(def: SequenceDefinition, ctx: ValidationContext): ValidationResult {
  if (!Array.isArray(def.turns)) {
    return { valid: false, errors: ['sequence must have a "turns" array'] };
  }
  if (def.turns.length === 0) {
    return { valid: false, errors: ['"turns" must not be empty'] };
  }

  const errors: string[] = [];
  let bans = 0, picks = 0, survivors = 0;
  const lastIndex = def.turns.length - 1;

  def.turns.forEach((rawTurn, i) => {
    // Treat each turn as untrusted until checked — this is JSON, not a guarantee.
    const turn = rawTurn as { actor?: unknown; action?: unknown; scope?: unknown } | null;

    if (typeof turn !== "object" || turn === null) {
      errors.push(`turn ${i}: must be an object`);
      return;
    }
    const action = turn.action;
    if (typeof action !== "string" || !KNOWN_ACTIONS.has(action)) {
      errors.push(`turn ${i}: invalid action ${JSON.stringify(action)} (v1: ban, pick, auto_survivor)`);
      return;
    }
    if (typeof turn.scope === "string" && !KNOWN_SCOPES.has(turn.scope)) {
      errors.push(`turn ${i}: unknown scope "${turn.scope}" (mine, opponent, global)`);
    }
    if (action === "ban" || action === "pick") {
      if (typeof turn.actor !== "string") {
        errors.push(`turn ${i}: ${action} requires an "actor"`);
      }
      action === "ban" ? bans++ : picks++;
    } else if (action === "auto_survivor") {
      survivors++;
      if (i !== lastIndex) errors.push(`turn ${i}: auto_survivor must be the last turn`);
    }
  });

  if (survivors > 1) errors.push(`at most one auto_survivor allowed (found ${survivors})`);

  const consumed = bans + picks + survivors;
  if (consumed !== ctx.poolSize) {
    errors.push(`maps consumed (${consumed} = ${bans} ban + ${picks} pick + ${survivors} survivor) must equal pool size (${ctx.poolSize})`);
  }

  const setSize = picks + survivors;
  if (setSize !== ctx.bestOf) {
    errors.push(`selected maps (${setSize} = ${picks} pick + ${survivors} survivor) must equal best_of (${ctx.bestOf})`);
  }

  return errors.length ? { valid: false, errors } : { valid: true, definition: def };
}

function validateSimultaneous(def: SimultaneousDefinition): ValidationResult {
  const errors: string[] = [];
  const t = def.timer_seconds as number | null | undefined; // may be absent in raw JSON

  if (t !== null && t !== undefined && (typeof t !== "number" || t <= 0)) {
    errors.push('"timer_seconds" must be a positive number or null');
  }
  if (def.on_timeout !== undefined && !KNOWN_TIMEOUTS.has(def.on_timeout)) {
    errors.push(`unknown on_timeout "${def.on_timeout}" (v1: "random")`);
  }
  if (typeof t === "number" && t > 0 && def.on_timeout === undefined) {
    errors.push('a timed pick should specify "on_timeout"');
  }
  if (def.hidden !== undefined && typeof def.hidden !== "boolean") {
    errors.push('"hidden" must be a boolean');
  }

  return errors.length ? { valid: false, errors } : { valid: true, definition: def };
}