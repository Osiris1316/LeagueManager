import { useEffect, useState } from 'react';

const MAP_POOL = [
  { id: 'dry-arabia', name: 'Dry Arabia' },
  { id: 'lipany', name: 'Lipany' },
  { id: 'golden-heights', name: 'Golden Heights' },
  { id: 'hideout', name: 'Hideout' },
  { id: 'four-lakes', name: 'Four Lakes' },
  { id: 'hill-and-dale', name: 'Hill and Dale' },
  { id: 'boulder-bay', name: 'Boulder Bay' },
];

const CIV_POOL = [
  { id: 'aoe4.Rus', name: 'Rus' },
  { id: 'aoe4.HolyRomanEmpire', name: 'Holy Roman Empire' },
  { id: 'aoe4.Chinese', name: 'Chinese' },
  { id: 'aoe4.English', name: 'English' },
  { id: 'aoe4.DelhiSultanate', name: 'Delhi Sultanate' },
  { id: 'aoe4.Mongols', name: 'Mongols' },
  { id: 'aoe4.AbbasidDynasty', name: 'Abbasid Dynasty' },
  { id: 'aoe4.French', name: 'French' },
  { id: 'aoe4.Ottomans', name: 'Ottomans' },
  { id: 'aoe4.Malians', name: 'Malians' },
  { id: 'aoe4.Byzantines', name: 'Byzantines' },
  { id: 'aoe4.Japanese', name: 'Japanese' },
  { id: 'aoe4.Ayyubids', name: 'Ayyubids' },
  { id: 'aoe4.ZhuXiLegacy', name: "Zhu Xi's Legacy" },
  { id: 'aoe4.JeanneDArc', name: "Jeanne d'Arc" },
  { id: 'aoe4.OrderOfTheDragon', name: 'Order of the Dragon' },
  { id: 'aoe4.HouseOfLancaster', name: 'House of Lancaster' },
  { id: 'aoe4.KnightsTemplar', name: 'Knights Templar' },
  { id: 'aoe4.GoldenHorde', name: 'Golden Horde' },
  { id: 'aoe4.MacedonianDynasty', name: 'Macedonian Dynasty' },
  { id: 'aoe4.SengokuDaimyo', name: 'Sengoku Daimyo' },
  { id: 'aoe4.TughlaqDynasty', name: 'Tughlaq Dynasty' },
  { id: 'aoe4.JinDynasty', name: 'Jin Dynasty' },
];

const HOST_NAME = 'Alice';
const GUEST_NAME = 'Bob';
const CIV_PICK_SECONDS = 30;
const REVEAL_HOLD_MS = 1200;

type Role = 'host' | 'guest';

type Phase =
  | { kind: 'pre_match' }
  | { kind: 'map_ban'; actor: Role }
  | { kind: 'map_pick'; actor: Role }
  | { kind: 'map_auto_select' }
  | { kind: 'map_pick_by_loser'; gameNumber: number }
  | { kind: 'map_auto_assign_last'; gameNumber: number }
  | { kind: 'civ_pick'; gameNumber: number }
  | { kind: 'civ_reveal'; gameNumber: number }
  | { kind: 'play_game'; gameNumber: number }
  | { kind: 'report_result'; gameNumber: number }
  | { kind: 'confirm_result'; gameNumber: number }
  | { kind: 'match_complete' };

function buildPhases(): Phase[] {
  const phases: Phase[] = [
    { kind: 'pre_match' },
    { kind: 'map_ban', actor: 'host' },
    { kind: 'map_ban', actor: 'guest' },
    { kind: 'map_pick', actor: 'host' },
    { kind: 'map_pick', actor: 'guest' },
    { kind: 'map_ban', actor: 'host' },
    { kind: 'map_ban', actor: 'guest' },
    { kind: 'map_auto_select' },
  ];

  for (const gameNumber of [1, 2, 3]) {
    if (gameNumber === 2) {
      phases.push({ kind: 'map_pick_by_loser', gameNumber });
    }
    if (gameNumber === 3) {
      phases.push({ kind: 'map_auto_assign_last', gameNumber });
    }
    phases.push(
      { kind: 'civ_pick', gameNumber },
      { kind: 'civ_reveal', gameNumber },
      { kind: 'play_game', gameNumber },
      { kind: 'report_result', gameNumber },
      { kind: 'confirm_result', gameNumber },
    );
  }

  phases.push({ kind: 'match_complete' });
  return phases;
}

const PHASES = buildPhases();

interface GameRecord {
  gameNumber: number;
  mapId: string | null;
  hostCiv: string | null;
  guestCiv: string | null;
  winner: Role | null;
}

interface DraftState {
  phaseIndex: number;
  hostReady: boolean;
  guestReady: boolean;
  banned: { mapId: string; by: Role }[];
  picked: { mapId: string; by: Role }[];
  survivor: string | null;
  games: GameRecord[];
  civPickStartedAt: number | null;
  hostCivLockedIn: string | null;
  guestCivLockedIn: string | null;
  timerPaused: boolean;
  pausedRemainingMs: number | null;
  revealStartedAt: number | null;
  tentativeWinner: Role | null;
  nowTick: number; // re-render trigger for timer display
}

const INITIAL_STATE: DraftState = {
  phaseIndex: 0,
  hostReady: false,
  guestReady: false,
  banned: [],
  picked: [],
  survivor: null,
  games: [
    { gameNumber: 1, mapId: null, hostCiv: null, guestCiv: null, winner: null },
    { gameNumber: 2, mapId: null, hostCiv: null, guestCiv: null, winner: null },
    { gameNumber: 3, mapId: null, hostCiv: null, guestCiv: null, winner: null },
  ],
  civPickStartedAt: null,
  hostCivLockedIn: null,
  guestCivLockedIn: null,
  timerPaused: false,
  pausedRemainingMs: null,
  revealStartedAt: null,
  tentativeWinner: null,
  nowTick: 0,
};

function getRemainingMaps(state: DraftState) {
  const used = new Set([
    ...state.banned.map(b => b.mapId),
    ...state.picked.map(p => p.mapId),
  ]);
  return MAP_POOL.filter(m => !used.has(m.id));
}

function countWins(games: GameRecord[]): { host: number; guest: number } {
  return games.reduce(
    (acc, g) => {
      if (g.winner === 'host') acc.host++;
      if (g.winner === 'guest') acc.guest++;
      return acc;
    },
    { host: 0, guest: 0 },
  );
}

function getReservedPicksRemaining(state: DraftState): string[] {
  const playedMapIds = new Set(state.games.map(g => g.mapId).filter(Boolean) as string[]);
  return state.picked.map(p => p.mapId).filter(mapId => !playedMapIds.has(mapId));
}

function pickRandomCiv(): string {
  const idx = Math.floor(Math.random() * CIV_POOL.length);
  const civ = CIV_POOL[idx];
  return civ ? civ.id : 'aoe4.French';
}

function applyAutoAdvances(state: DraftState, now: number): DraftState {
  let s = state;
  for (let safety = 0; safety < 10; safety++) {
    const phase = PHASES[s.phaseIndex];
    if (!phase) break;
    const next = advanceOne(s, phase, now);
    if (next === s) break;
    s = next;
  }
  return s;
}

function advanceOne(s: DraftState, phase: Phase, now: number): DraftState {
  switch (phase.kind) {
    case 'pre_match':
      if (s.hostReady && s.guestReady) {
        return { ...s, phaseIndex: s.phaseIndex + 1 };
      }
      return s;

    case 'map_auto_select': {
      const remaining = getRemainingMaps(s);
      const survivor = remaining[0];
      if (remaining.length === 1 && survivor) {
        const games = s.games.map(g =>
          g.gameNumber === 1 ? { ...g, mapId: survivor.id } : g,
        );
        return { ...s, survivor: survivor.id, games, phaseIndex: s.phaseIndex + 1 };
      }
      return s;
    }

    case 'map_auto_assign_last': {
      const wins = countWins(s.games);
      if (wins.host === 2 || wins.guest === 2) {
        return { ...s, phaseIndex: PHASES.findIndex(p => p.kind === 'match_complete') };
      }
      const remaining = getReservedPicksRemaining(s);
      const last = remaining[0];
      if (remaining.length >= 1 && last) {
        const games = s.games.map(g =>
          g.gameNumber === phase.gameNumber ? { ...g, mapId: last } : g,
        );
        return { ...s, games, phaseIndex: s.phaseIndex + 1 };
      }
      return s;
    }

    case 'civ_pick': {
      if (s.civPickStartedAt === null) {
        return {
          ...s,
          civPickStartedAt: now,
          hostCivLockedIn: null,
          guestCivLockedIn: null,
          timerPaused: false,
          pausedRemainingMs: null,
        };
      }
      const elapsed = now - s.civPickStartedAt;
      const timerExpired = !s.timerPaused && elapsed >= CIV_PICK_SECONDS * 1000;
      const bothLocked = s.hostCivLockedIn !== null && s.guestCivLockedIn !== null;
      if (bothLocked || timerExpired) {
        const hostCiv = s.hostCivLockedIn ?? pickRandomCiv();
        const guestCiv = s.guestCivLockedIn ?? pickRandomCiv();
        const games = s.games.map(g =>
          g.gameNumber === phase.gameNumber ? { ...g, hostCiv, guestCiv } : g,
        );
        return {
          ...s,
          games,
          hostCivLockedIn: hostCiv,
          guestCivLockedIn: guestCiv,
          civPickStartedAt: null,
          phaseIndex: s.phaseIndex + 1,
        };
      }
      return s;
    }

    case 'civ_reveal': {
      if (s.revealStartedAt === null) {
        return { ...s, revealStartedAt: now };
      }
      if (now - s.revealStartedAt >= REVEAL_HOLD_MS) {
        return { ...s, revealStartedAt: null, phaseIndex: s.phaseIndex + 1 };
      }
      return s;
    }

    case 'confirm_result':
      return s; // awaits user confirmation

    default:
      return s;
  }
}

export default function WizardPrototypePage() {
  const [state, setState] = useState<DraftState>(INITIAL_STATE);

  // Tick: drive timer + reveal hold + re-render via nowTick.
  useEffect(() => {
    const id = setInterval(() => {
      setState(s => {
        const advanced = applyAutoAdvances(s, Date.now());
        return { ...advanced, nowTick: advanced.nowTick + 1 };
      });
    }, 200);
    return () => clearInterval(id);
  }, []);

  const phase = PHASES[state.phaseIndex];
  const remainingMaps = getRemainingMaps(state);

  function update(updater: (s: DraftState) => DraftState) {
    setState(s => applyAutoAdvances(updater(s), Date.now()));
  }

  function markReady(role: Role) {
    update(s => ({
      ...s,
      hostReady: role === 'host' ? true : s.hostReady,
      guestReady: role === 'guest' ? true : s.guestReady,
    }));
  }

  function banMap(role: Role, mapId: string) {
    if (!phase || phase.kind !== 'map_ban' || phase.actor !== role) return;
    update(s => ({
      ...s,
      banned: [...s.banned, { mapId, by: role }],
      phaseIndex: s.phaseIndex + 1,
    }));
  }

  function pickMap(role: Role, mapId: string) {
    if (!phase || phase.kind !== 'map_pick' || phase.actor !== role) return;
    update(s => ({
      ...s,
      picked: [...s.picked, { mapId, by: role }],
      phaseIndex: s.phaseIndex + 1,
    }));
  }

  function pickMapByLoser(role: Role, mapId: string) {
    if (!phase || phase.kind !== 'map_pick_by_loser') return;
    const prevGame = state.games.find(g => g.gameNumber === phase.gameNumber - 1);
    if (!prevGame || !prevGame.winner) return;
    const loser: Role = prevGame.winner === 'host' ? 'guest' : 'host';
    if (role !== loser) return;
    update(s => {
      const games = s.games.map(g =>
        g.gameNumber === phase.gameNumber ? { ...g, mapId } : g,
      );
      return { ...s, games, phaseIndex: s.phaseIndex + 1 };
    });
  }

  function lockInCiv(role: Role, civId: string) {
    if (!phase || phase.kind !== 'civ_pick') return;
    update(s => {
      const already = role === 'host' ? s.hostCivLockedIn : s.guestCivLockedIn;
      if (already) return s;
      return {
        ...s,
        hostCivLockedIn: role === 'host' ? civId : s.hostCivLockedIn,
        guestCivLockedIn: role === 'guest' ? civId : s.guestCivLockedIn,
      };
    });
  }

  function toggleTimerPause() {
    if (!phase || phase.kind !== 'civ_pick' || state.civPickStartedAt === null) return;
    setState(s => {
      if (s.civPickStartedAt === null) return s;
      if (!s.timerPaused) {
        const elapsed = Date.now() - s.civPickStartedAt;
        const remaining = Math.max(0, CIV_PICK_SECONDS * 1000 - elapsed);
        return { ...s, timerPaused: true, pausedRemainingMs: remaining };
      } else {
        const remaining = s.pausedRemainingMs ?? CIV_PICK_SECONDS * 1000;
        const newStart = Date.now() - (CIV_PICK_SECONDS * 1000 - remaining);
        return { ...s, timerPaused: false, pausedRemainingMs: null, civPickStartedAt: newStart };
      }
    });
  }

  function tapWinner(winner: Role) {
    if (!phase || phase.kind !== 'report_result') return;
    update(s => ({
      ...s,
      tentativeWinner: winner,
      phaseIndex: s.phaseIndex + 1, // → confirm_result
    }));
  }

  function confirmWinner() {
    if (!phase || phase.kind !== 'confirm_result') return;
    update(s => {
      const winner = s.tentativeWinner;
      if (!winner) return s;
      const games = s.games.map(g =>
        g.gameNumber === phase.gameNumber ? { ...g, winner } : g,
      );
      const wins = countWins(games);
      let nextIndex = s.phaseIndex + 1;
      if ((wins.host === 2 || wins.guest === 2) && phase.gameNumber < 3) {
        nextIndex = PHASES.findIndex(p => p.kind === 'match_complete');
      }
      return {
        ...s,
        games,
        tentativeWinner: null,
        phaseIndex: nextIndex,
      };
    });
  }

  function cancelConfirm() {
    if (!phase || phase.kind !== 'confirm_result') return;
    update(s => ({
      ...s,
      tentativeWinner: null,
      phaseIndex: s.phaseIndex - 1,
    }));
  }

  function backToWizardFromPlay() {
    if (!phase || phase.kind !== 'play_game') return;
    update(s => ({ ...s, phaseIndex: s.phaseIndex + 1 }));
  }

  if (!phase) {
    return (
      <div style={{ padding: 20 }}>
        Phase out of bounds — <button onClick={() => setState(INITIAL_STATE)}>reset</button>
      </div>
    );
  }

  const wins = countWins(state.games);

  return (
    <div style={{ padding: 20, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 18, margin: 0 }}>Wizard Prototype — Code B</h1>
        <button
          onClick={() => setState(INITIAL_STATE)}
          style={{ padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}
        >
          Reset
        </button>
        {phase.kind === 'civ_pick' && (
          <button
            onClick={toggleTimerPause}
            style={{ padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}
          >
            {state.timerPaused ? '▶ Resume timer' : '⏸ Pause timer'}
          </button>
        )}
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>
          Score: <strong>{wins.host}–{wins.guest}</strong> · Phase: <code>{phase.kind}{('gameNumber' in phase) ? ` G${phase.gameNumber}` : ''}{('actor' in phase) ? ` (${phase.actor})` : ''}</code>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <PlayerColumn
          role="host"
          name={HOST_NAME}
          opponentName={GUEST_NAME}
          state={state}
          phase={phase}
          remainingMaps={remainingMaps}
          onReady={() => markReady('host')}
          onBan={(mapId) => banMap('host', mapId)}
          onPick={(mapId) => pickMap('host', mapId)}
          onPickByLoser={(mapId) => pickMapByLoser('host', mapId)}
          onLockInCiv={(civId) => lockInCiv('host', civId)}
          onTapWinner={tapWinner}
          onConfirmWinner={confirmWinner}
          onCancelConfirm={cancelConfirm}
          onBackFromPlay={backToWizardFromPlay}
        />
        <PlayerColumn
          role="guest"
          name={GUEST_NAME}
          opponentName={HOST_NAME}
          state={state}
          phase={phase}
          remainingMaps={remainingMaps}
          onReady={() => markReady('guest')}
          onBan={(mapId) => banMap('guest', mapId)}
          onPick={(mapId) => pickMap('guest', mapId)}
          onPickByLoser={(mapId) => pickMapByLoser('guest', mapId)}
          onLockInCiv={(civId) => lockInCiv('guest', civId)}
          onTapWinner={tapWinner}
          onConfirmWinner={confirmWinner}
          onCancelConfirm={cancelConfirm}
          onBackFromPlay={backToWizardFromPlay}
        />
      </div>
    </div>
  );
}

interface ColumnProps {
  role: Role;
  name: string;
  opponentName: string;
  state: DraftState;
  phase: Phase;
  remainingMaps: typeof MAP_POOL;
  onReady: () => void;
  onBan: (mapId: string) => void;
  onPick: (mapId: string) => void;
  onPickByLoser: (mapId: string) => void;
  onLockInCiv: (civId: string) => void;
  onTapWinner: (role: Role) => void;
  onConfirmWinner: () => void;
  onCancelConfirm: () => void;
  onBackFromPlay: () => void;
}

function PlayerColumn(p: ColumnProps) {
  const ready = p.role === 'host' ? p.state.hostReady : p.state.guestReady;

  return (
    <div style={{
      border: '1px solid var(--border-color)',
      borderRadius: 8,
      padding: 16,
      background: 'var(--bg-card)',
      minHeight: 420,
    }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
        {p.role}'s view
      </div>
      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>{p.name}</div>

      {p.phase.kind === 'pre_match' && (
        <PanelPreMatch opponentName={p.opponentName} ready={ready} onReady={p.onReady} />
      )}

      {(p.phase.kind === 'map_ban' || p.phase.kind === 'map_pick') && (
        <PanelMapAction
          phase={p.phase}
          role={p.role}
          opponentName={p.opponentName}
          state={p.state}
          remainingMaps={p.remainingMaps}
          onBan={p.onBan}
          onPick={p.onPick}
        />
      )}

      {p.phase.kind === 'map_auto_select' && (
        <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Resolving final map…</div>
      )}

      {p.phase.kind === 'map_pick_by_loser' && (
        <PanelMapPickByLoser
          phase={p.phase}
          role={p.role}
          opponentName={p.opponentName}
          state={p.state}
          onPickByLoser={p.onPickByLoser}
        />
      )}

      {p.phase.kind === 'map_auto_assign_last' && (
        <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Assigning last map…</div>
      )}

      {p.phase.kind === 'civ_pick' && (
        <PanelCivPick
          phase={p.phase}
          role={p.role}
          opponentName={p.opponentName}
          state={p.state}
          onLockInCiv={p.onLockInCiv}
        />
      )}

      {p.phase.kind === 'civ_reveal' && (
        <PanelCivReveal phase={p.phase} role={p.role} state={p.state} />
      )}

      {p.phase.kind === 'play_game' && (
        <PanelPlayGame
          phase={p.phase}
          role={p.role}
          opponentName={p.opponentName}
          state={p.state}
          onBackFromPlay={p.onBackFromPlay}
        />
      )}

      {p.phase.kind === 'report_result' && (
        <PanelReportResult
          phase={p.phase}
          hostName={p.role === 'host' ? p.name : p.opponentName}
          guestName={p.role === 'guest' ? p.name : p.opponentName}
          onTapWinner={p.onTapWinner}
        />
      )}

      {p.phase.kind === 'confirm_result' && (
        <PanelConfirmResult
          phase={p.phase}
          state={p.state}
          hostName={p.role === 'host' ? p.name : p.opponentName}
          guestName={p.role === 'guest' ? p.name : p.opponentName}
          onConfirm={p.onConfirmWinner}
          onCancel={p.onCancelConfirm}
        />
      )}

      {p.phase.kind === 'match_complete' && (
        <PanelMatchComplete
          state={p.state}
          hostName={p.role === 'host' ? p.name : p.opponentName}
          guestName={p.role === 'guest' ? p.name : p.opponentName}
        />
      )}
    </div>
  );
}

function PanelPreMatch({ opponentName, ready, onReady }: {
  opponentName: string;
  ready: boolean;
  onReady: () => void;
}) {
  return (
    <div>
      <p style={{ marginBottom: 10 }}>
        You're playing <strong>{opponentName}</strong> in a Bo3.
      </p>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
        Tier rules: Code B — pick any civilization in any game, no restrictions.
      </p>
      <button
        onClick={onReady}
        disabled={ready}
        style={{
          padding: '10px 16px',
          fontSize: 14,
          background: ready ? 'var(--bg-highlight)' : 'var(--p1-color)',
          color: ready ? 'var(--text-muted)' : '#000',
          border: 'none',
          borderRadius: 6,
          cursor: ready ? 'default' : 'pointer',
          fontWeight: 500,
        }}
      >
        {ready ? 'Ready ✓ — waiting for opponent…' : "I'm ready to begin"}
      </button>
    </div>
  );
}

function PanelMapAction({ phase, role, opponentName, state, remainingMaps, onBan, onPick }: {
  phase: { kind: 'map_ban' | 'map_pick'; actor: Role };
  role: Role;
  opponentName: string;
  state: DraftState;
  remainingMaps: typeof MAP_POOL;
  onBan: (mapId: string) => void;
  onPick: (mapId: string) => void;
}) {
  const isMyTurn = phase.actor === role;
  const actionWord = phase.kind === 'map_ban' ? 'ban' : 'pick';
  const actionColor = phase.kind === 'map_ban' ? 'var(--loss-color)' : 'var(--win-color)';

  return (
    <div>
      <div style={{ marginBottom: 4, fontSize: 14, fontWeight: 500 }}>
        {isMyTurn
          ? <>Your turn to <span style={{ color: actionColor }}>{actionWord}</span> a map</>
          : <>Waiting for {opponentName} to {actionWord}…</>
        }
      </div>
      <div style={{ marginBottom: 12, fontSize: 12, color: 'var(--text-muted)' }}>
        {isMyTurn ? 'Tap a map below.' : ''}
      </div>

      <DraftStatusBar state={state} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 12 }}>
        {remainingMaps.map(map => (
          <button
            key={map.id}
            onClick={() => isMyTurn && (phase.kind === 'map_ban' ? onBan(map.id) : onPick(map.id))}
            disabled={!isMyTurn}
            style={{
              padding: '10px 12px',
              fontSize: 13,
              background: isMyTurn ? 'var(--bg-surface)' : 'var(--bg-base)',
              border: '1px solid var(--border-color)',
              borderRadius: 4,
              color: 'var(--text-primary)',
              cursor: isMyTurn ? 'pointer' : 'default',
              opacity: isMyTurn ? 1 : 0.5,
              textAlign: 'left',
              fontFamily: 'inherit',
            }}
          >
            {map.name}
          </button>
        ))}
      </div>
    </div>
  );
}

function PanelMapPickByLoser({ phase, role, opponentName, state, onPickByLoser }: {
  phase: { kind: 'map_pick_by_loser'; gameNumber: number };
  role: Role;
  opponentName: string;
  state: DraftState;
  onPickByLoser: (mapId: string) => void;
}) {
  const prevGame = state.games.find(g => g.gameNumber === phase.gameNumber - 1);
  if (!prevGame || !prevGame.winner) {
    return <div>Waiting for previous game result…</div>;
  }
  const loser: Role = prevGame.winner === 'host' ? 'guest' : 'host';
  const isMyTurn = role === loser;
  const reservedIds = getReservedPicksRemaining(state);
  const reservedMaps = MAP_POOL.filter(m => reservedIds.includes(m.id));

  return (
    <div>
      <div style={{ marginBottom: 4, fontSize: 14, fontWeight: 500 }}>
        {isMyTurn
          ? <>You lost Game {phase.gameNumber - 1}. Pick the map for Game {phase.gameNumber}:</>
          : <>Waiting for {opponentName} to pick the map for Game {phase.gameNumber}…</>
        }
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 6, marginTop: 12 }}>
        {reservedMaps.map(map => (
          <button
            key={map.id}
            onClick={() => isMyTurn && onPickByLoser(map.id)}
            disabled={!isMyTurn}
            style={{
              padding: '12px 14px',
              fontSize: 14,
              background: isMyTurn ? 'var(--bg-surface)' : 'var(--bg-base)',
              border: '1px solid var(--border-color)',
              borderRadius: 4,
              color: 'var(--text-primary)',
              cursor: isMyTurn ? 'pointer' : 'default',
              opacity: isMyTurn ? 1 : 0.5,
              textAlign: 'left',
              fontFamily: 'inherit',
            }}
          >
            {map.name}
          </button>
        ))}
      </div>
    </div>
  );
}

function PanelCivPick({ phase, role, opponentName, state, onLockInCiv }: {
  phase: { kind: 'civ_pick'; gameNumber: number };
  role: Role;
  opponentName: string;
  state: DraftState;
  onLockInCiv: (civId: string) => void;
}) {
  const myLockedCivId = role === 'host' ? state.hostCivLockedIn : state.guestCivLockedIn;
  const opponentLocked = role === 'host' ? state.guestCivLockedIn !== null : state.hostCivLockedIn !== null;
  const game = state.games.find(g => g.gameNumber === phase.gameNumber);
  const mapName = MAP_POOL.find(m => m.id === game?.mapId)?.name ?? '?';

  let remainingMs = CIV_PICK_SECONDS * 1000;
  if (state.civPickStartedAt !== null) {
    if (state.timerPaused) {
      remainingMs = state.pausedRemainingMs ?? remainingMs;
    } else {
      remainingMs = Math.max(0, CIV_PICK_SECONDS * 1000 - (Date.now() - state.civPickStartedAt));
    }
  }
  const remainingSec = Math.ceil(remainingMs / 1000);

  if (myLockedCivId) {
    const civName = CIV_POOL.find(c => c.id === myLockedCivId)?.name ?? myLockedCivId;
    return (
      <div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
          Game {phase.gameNumber} — {mapName}
        </div>
        <div style={{ fontSize: 14, marginBottom: 16 }}>
          You locked in <strong style={{ color: 'var(--win-color)' }}>{civName}</strong>.
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          {opponentLocked
            ? `${opponentName} has locked in. Revealing soon…`
            : `Waiting for ${opponentName} to pick… ${remainingSec}s`
          }
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
        Game {phase.gameNumber} — {mapName}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 500 }}>Pick your civ</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: remainingSec <= 5 ? 'var(--loss-color)' : 'var(--text-secondary)' }}>
          {state.timerPaused ? '⏸ ' : ''}{remainingSec}s
        </div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
        First tap locks you in. Hidden until both players have picked.
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: 4,
        maxHeight: 320,
        overflowY: 'auto',
      }}>
        {CIV_POOL.map(civ => (
          <button
            key={civ.id}
            onClick={() => onLockInCiv(civ.id)}
            style={{
              padding: '8px 6px',
              fontSize: 11,
              background: 'transparent',
              border: '1px solid var(--border-color)',
              borderRadius: 4,
              color: 'var(--text-primary)',
              cursor: 'pointer',
              textAlign: 'center',
              fontFamily: 'inherit',
            }}
          >
            {civ.name}
          </button>
        ))}
      </div>
    </div>
  );
}

function PanelCivReveal({ phase, role, state }: {
  phase: { kind: 'civ_reveal'; gameNumber: number };
  role: Role;
  state: DraftState;
}) {
  const game = state.games.find(g => g.gameNumber === phase.gameNumber);
  const myCivId = role === 'host' ? game?.hostCiv : game?.guestCiv;
  const oppCivId = role === 'host' ? game?.guestCiv : game?.hostCiv;
  const myCivName = CIV_POOL.find(c => c.id === myCivId)?.name ?? '?';
  const oppCivName = CIV_POOL.find(c => c.id === oppCivId)?.name ?? '?';

  return (
    <div style={{ paddingTop: 20 }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 12, letterSpacing: 1, textTransform: 'uppercase' }}>
        Revealing picks…
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', fontSize: 18, fontWeight: 600 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>YOU</div>
          <div>{myCivName}</div>
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>vs</div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>OPPONENT</div>
          <div>{oppCivName}</div>
        </div>
      </div>
    </div>
  );
}

function PanelPlayGame({ phase, role, opponentName, state, onBackFromPlay }: {
  phase: { kind: 'play_game'; gameNumber: number };
  role: Role;
  opponentName: string;
  state: DraftState;
  onBackFromPlay: () => void;
}) {
  const game = state.games.find(g => g.gameNumber === phase.gameNumber);
  const myCivId = role === 'host' ? game?.hostCiv : game?.guestCiv;
  const oppCivId = role === 'host' ? game?.guestCiv : game?.hostCiv;
  const myCivName = CIV_POOL.find(c => c.id === myCivId)?.name ?? '?';
  const oppCivName = CIV_POOL.find(c => c.id === oppCivId)?.name ?? '?';
  const mapName = MAP_POOL.find(m => m.id === game?.mapId)?.name ?? '?';

  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
        Game {phase.gameNumber} — {mapName}
      </div>
      <div style={{ fontSize: 14, marginBottom: 8 }}>
        You're playing <strong style={{ color: 'var(--win-color)' }}>{myCivName}</strong>.
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
        {opponentName} is playing <strong>{oppCivName}</strong>.
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
        Go play your game. Come back here when it's over.
      </div>
      <button
        onClick={onBackFromPlay}
        style={{
          padding: '10px 16px',
          fontSize: 14,
          background: 'var(--p1-color)',
          color: '#000',
          border: 'none',
          borderRadius: 6,
          cursor: 'pointer',
          fontWeight: 500,
        }}
      >
        Game's over — report result
      </button>
    </div>
  );
}

function PanelReportResult({ phase, hostName, guestName, onTapWinner }: {
  phase: { kind: 'report_result'; gameNumber: number };
  hostName: string;
  guestName: string;
  onTapWinner: (role: Role) => void;
}) {
  return (
    <div>
      <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 16 }}>
        Who won Game {phase.gameNumber}?
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button
          onClick={() => onTapWinner('host')}
          style={{
            padding: '14px 16px',
            fontSize: 14,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: 6,
            color: 'var(--text-primary)',
            cursor: 'pointer',
            fontWeight: 500,
            textAlign: 'left',
            fontFamily: 'inherit',
          }}
        >
          {hostName} won
        </button>
        <button
          onClick={() => onTapWinner('guest')}
          style={{
            padding: '14px 16px',
            fontSize: 14,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: 6,
            color: 'var(--text-primary)',
            cursor: 'pointer',
            fontWeight: 500,
            textAlign: 'left',
            fontFamily: 'inherit',
          }}
        >
          {guestName} won
        </button>
      </div>
    </div>
  );
}

function PanelConfirmResult({ phase, state, hostName, guestName, onConfirm, onCancel }: {
  phase: { kind: 'confirm_result'; gameNumber: number };
  state: DraftState;
  hostName: string;
  guestName: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const tentative = state.tentativeWinner;
  const winnerName = tentative === 'host' ? hostName : guestName;

  return (
    <div>
      <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>
        Confirm: {winnerName} won Game {phase.gameNumber}?
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
        This advances the wizard. An admin can revise later if needed.
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={onConfirm}
          style={{
            padding: '10px 16px',
            fontSize: 14,
            background: 'var(--win-color)',
            color: '#000',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontWeight: 500,
            flex: 1,
          }}
        >
          Confirm
        </button>
        <button
          onClick={onCancel}
          style={{
            padding: '10px 16px',
            fontSize: 14,
            background: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: 6,
            cursor: 'pointer',
            fontWeight: 500,
            flex: 1,
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function PanelMatchComplete({ state, hostName, guestName }: {
  state: DraftState;
  hostName: string;
  guestName: string;
}) {
  const wins = countWins(state.games);
  const matchWinner = wins.host > wins.guest ? hostName : guestName;
  const playedGames = state.games.filter(g => g.winner !== null);

  return (
    <div>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
        Match complete
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 14, color: 'var(--win-color)' }}>
        {matchWinner} wins {Math.max(wins.host, wins.guest)}–{Math.min(wins.host, wins.guest)}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {playedGames.map(g => {
          const mapName = MAP_POOL.find(m => m.id === g.mapId)?.name ?? '?';
          const hostCivName = CIV_POOL.find(c => c.id === g.hostCiv)?.name ?? '?';
          const guestCivName = CIV_POOL.find(c => c.id === g.guestCiv)?.name ?? '?';
          const winnerName = g.winner === 'host' ? hostName : guestName;
          return (
            <div key={g.gameNumber} style={{ fontSize: 12, padding: 8, background: 'var(--bg-surface)', borderRadius: 4 }}>
              <div style={{ fontWeight: 500 }}>Game {g.gameNumber} · {mapName}</div>
              <div style={{ color: 'var(--text-secondary)' }}>
                {hostName} ({hostCivName}) vs {guestName} ({guestCivName}) — <strong>{winnerName} won</strong>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DraftStatusBar({ state }: { state: DraftState }) {
  if (state.banned.length === 0 && state.picked.length === 0) return null;

  return (
    <div style={{
      fontSize: 11,
      color: 'var(--text-secondary)',
      padding: 8,
      background: 'var(--bg-surface)',
      borderRadius: 4,
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
    }}>
      {state.banned.map((b, i) => {
        const map = MAP_POOL.find(m => m.id === b.mapId);
        return (
          <div key={`b-${i}`}>
            <span style={{ color: 'var(--loss-color)' }}>✕</span> {map?.name}{' '}
            <span style={{ color: 'var(--text-muted)' }}>banned by {b.by}</span>
          </div>
        );
      })}
      {state.picked.map((p, i) => {
        const map = MAP_POOL.find(m => m.id === p.mapId);
        return (
          <div key={`p-${i}`}>
            <span style={{ color: 'var(--win-color)' }}>✓</span> {map?.name}{' '}
            <span style={{ color: 'var(--text-muted)' }}>picked by {p.by}</span>
          </div>
        );
      })}
    </div>
  );
}