import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { titleById, type H2HMeeting } from '@league-manager/core';
import { getH2H, type H2HGameRow, type H2HResponse } from '../../api/client';
import { CivMark } from './CivMark';
import { NamesHeader } from './NamesHeader';
import { mapLabel, meetingLabel, meetingTag } from './format';

interface HeadToHeadProps {
  /** The match's left player (player1 in storage order): every number is from their side. */
  player1Id: number;
  player1Name: string;
  player2Id: number;
  player2Name: string;
  /**
   * The match's game title, so an AoE4 page shows AoE4 history only.
   * undefined while it isn't known yet (seasons still loading): nothing is
   * fetched until it is. null means unknown for good: every title together.
   */
  titleId: string | null | undefined;
}

type LoadState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; data: H2HResponse };

/**
 * The pair's history in this game title: series record, every past meeting,
 * every game grouped by meeting, and the civ matchups. Loads on its own so
 * the match page never waits for it.
 */
export function HeadToHead({ player1Id, player1Name, player2Id, player2Name, titleId }: HeadToHeadProps) {
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    if (titleId === undefined) return;
    let cancelled = false;
    setState({ status: 'loading' });
    getH2H(player1Id, player2Id, titleId)
      .then((data) => { if (!cancelled) setState({ status: 'ready', data }); })
      .catch(() => { if (!cancelled) setState({ status: 'error' }); });
    return () => { cancelled = true; };
  }, [player1Id, player2Id, titleId]);

  const title = titleId ? titleById(titleId) : null;

  return (
    <section className="h2h" aria-labelledby="h2h-title">
      <div className="h2h__head">
        <h2 id="h2h-title" className="h2h__title">Head to head</h2>
        {state.status === 'ready' && (
          <span className="h2h__scope">
            {title ? title.shortName : 'All games'}, all seasons
            {state.data.otherTitles.map((r) => (
              <span key={r.titleId}>
                {' · '}
                <Link to={`/match/${r.lastMatchId}`} className="h2h__scope-link">
                  {titleById(r.titleId)?.name ?? r.titleId} {r.wins}–{r.losses}
                </Link>
              </span>
            ))}
          </span>
        )}
      </div>

      {state.status === 'loading' && (
        <p className="h2h__status" role="status">Loading head to head…</p>
      )}
      {state.status === 'error' && (
        <p className="h2h__status">Head to head couldn’t load right now.</p>
      )}
      {state.status === 'ready' && (
        <History
          data={state.data}
          leftName={player1Name}
          rightName={player2Name}
          titleName={title?.name ?? null}
          // Civ flags only exist for AoE4 so far; Brood War gets the record and
          // the meetings until its race catalog is in.
          hasCivCatalog={titleId === 'aoe4' || titleId === null}
        />
      )}
    </section>
  );
}

interface HistoryProps {
  data: H2HResponse;
  leftName: string;
  rightName: string;
  titleName: string | null;
  hasCivCatalog: boolean;
}

function History({ data, leftName, rightName, titleName, hasCivCatalog }: HistoryProps) {
  const { series, meetings, games } = data;

  if (series.matchesPlayed === 0) {
    return (
      <p className="h2h__empty">
        No previous meetings{titleName ? ` in ${titleName}` : ''}
      </p>
    );
  }

  const gamesByMatch = new Map<number, H2HGameRow[]>();
  for (const g of games) {
    const list = gamesByMatch.get(g.matchId) ?? [];
    list.push(g);
    gamesByMatch.set(g.matchId, list);
  }

  // Who leads: matches first, then games. A dead heat leads nobody.
  const leftLeads =
    series.wins > series.losses ||
    (series.wins === series.losses && series.gamesWon > series.gamesLost);
  const rightLeads =
    series.losses > series.wins ||
    (series.wins === series.losses && series.gamesLost > series.gamesWon);

  const showGames = hasCivCatalog && games.length > 0;

  return (
    <>
      <p className="sr-only">{summarySentence(leftName, rightName, series.wins, series.losses, series.gamesWon, series.gamesLost)}</p>
      <div className="h2h__summary" aria-hidden="true">
        <div className="h2h-grid h2h-summary-head">
          <span className={`h2h-b h2h-name h2h-name--summary ${leftLeads ? 'h2h-lead' : 'h2h-trail'}`}>{leftName}</span>
          <span className={`h2h-d h2h-name h2h-name--summary ${rightLeads ? 'h2h-lead' : 'h2h-trail'}`}>{rightName}</span>
        </div>
        <SummaryRow label="Matches" left={series.wins} right={series.losses} />
        <SummaryRow label="Games" left={series.gamesWon} right={series.gamesLost} />
      </div>

      <h3 className="h2h__section-title">Matches</h3>
      <NamesHeader leftName={leftName} rightName={rightName} />
      <ol className="h2h-list">
        {meetings.map((m) => (
          <li key={m.matchId}>
            <MeetingLink meeting={m} leftName={leftName} rightName={rightName} variant="row" />
          </li>
        ))}
      </ol>

      {showGames && (
        <>
          <h3 className="h2h__section-title">Games</h3>
          <NamesHeader leftName={leftName} rightName={rightName} centre="Map" />
          <ol className="h2h-groups">
            {meetings.map((m) => {
              const inMatch = gamesByMatch.get(m.matchId) ?? [];
              return (
                <li key={m.matchId}>
                  <MeetingLink meeting={m} leftName={leftName} rightName={rightName} variant="group" />
                  {inMatch.length > 0 && (
                    <ol className="h2h-list">
                      {inMatch.map((g) => (
                        <li key={g.gameNumber} className="h2h-grid h2h-row h2h-row--game">
                          <span className="h2h-gn">G{g.gameNumber}</span>
                          <span className="h2h-a"><CivMark civId={g.civId} side="left" won={g.won} /></span>
                          <span className={`h2h-b h2h-wl ${g.won ? 'h2h-w' : 'h2h-l'}`}><span className="sr-only">{leftName} </span>{g.won ? 'W' : 'L'}</span>
                          <span className="h2h-c h2h-map">{mapLabel(g)}</span>
                          <span className={`h2h-d h2h-wl ${g.won ? 'h2h-l' : 'h2h-w'}`}><span className="sr-only">{rightName} </span>{g.won ? 'L' : 'W'}</span>
                          <span className="h2h-e"><CivMark civId={g.oppCivId} side="right" won={!g.won} /></span>
                        </li>
                      ))}
                    </ol>
                  )}
                </li>
              );
            })}
          </ol>
        </>
      )}

    </>
  );
}

/** "Osiris 2–1 Lamb in matches, 6–4 in games." for screen readers. */
function summarySentence(left: string, right: string, w: number, l: number, gw: number, gl: number): string {
  return `${left} ${w}–${l} ${right} in matches, ${gw}–${gl} in games.`;
}

function SummaryRow({ label, left, right }: { label: string; left: number; right: number }) {
  return (
    <div className="h2h-grid h2h-stat">
      <span className={`h2h-b h2h-num ${left >= right ? 'h2h-lead' : 'h2h-trail-strong'}`}>{left}</span>
      <span className="h2h-c h2h-stat-label">{label}</span>
      <span className={`h2h-d h2h-num ${right >= left ? 'h2h-lead' : 'h2h-trail-strong'}`}>{right}</span>
    </div>
  );
}

function MeetingLink({ meeting: m, leftName, rightName, variant }: {
  meeting: H2HMeeting;
  leftName: string;
  rightName: string;
  variant: 'row' | 'group';
}) {
  return (
    <Link
      to={`/match/${m.matchId}`}
      className={`h2h-grid ${variant === 'row' ? 'h2h-row' : 'h2h-group'}`}
      aria-label={meetingLabel(m, leftName, rightName)}
    >
      <span className={`h2h-b h2h-score ${m.won ? 'h2h-lead' : 'h2h-trail'}`}>{m.score[0]}</span>
      <span className="h2h-c h2h-tag">{meetingTag(m)}</span>
      <span className={`h2h-d h2h-score ${m.won ? 'h2h-trail' : 'h2h-lead'}`}>{m.score[1]}</span>
      <svg className="h2h-go" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="9 6 15 12 9 18" />
      </svg>
    </Link>
  );
}
