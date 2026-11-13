import type { StandingsResponse } from '../api/client';
import { StandingsTable } from '../components/StandingsTable';
import { ScheduleView } from '../components/ScheduleView';
import { CollapsibleSchedule } from '../components/CollapsibleSchedule';
import { isEventSeason } from '@league-manager/core';

export function StackedView({ data }: { data: StandingsResponse }) {
  const { season, tiers } = data;
  // An event has one group in a container tier: name it for what it is, and
  // leave out the league tier's civ rule.
  const isEvent = isEventSeason(season);

  return (
    <>
      {tiers.map(tierData => {
        const tierId = tierData.tier.id.replace('code_', '');
        return (
          <section
            key={tierData.tier.id}
            className={`tier-section${isEvent ? ' tier-section--event' : ''}`}
            aria-labelledby={`tier-heading-${tierData.tier.id}`}
          >
            <div className={`tier-bar tier-bar--${tierId}`} aria-hidden="true" />

            <div className="section-header">
              <h2 id={`tier-heading-${tierData.tier.id}`}>
                {isEvent ? 'Group stage' : tierData.tier.display_name}
              </h2>
              {isEvent ? (
                <span className="bracket__meta">Bo1 round robin · ties broken by head to head</span>
              ) : (
                <span className={`badge badge--${tierId}`}>
                  {tierData.tier.civ_rule === 'pro_draft'
                    ? 'Civ Draft'
                    : tierData.tier.civ_rule === 'win_lock'
                    ? 'Win Lock'
                    : 'Open'}
                </span>
              )}
            </div>

            {!isEvent && tierData.tier.rules_summary && (
              <p style={{
                fontSize: 'var(--text-sm)',
                color: 'var(--color-text-tertiary)',
                marginBottom: 'var(--space-lg)',
                maxWidth: '40rem',
              }}>
                {tierData.tier.rules_summary}
              </p>
            )}

            <StandingsTable
              standings={tierData.standings}
              tierId={tierData.tier.id}
              bo1={isEvent}
            />

            <div style={{ marginTop: 'var(--space-lg)' }}>
              <CollapsibleSchedule
                count={tierData.matches.length}
                storageKey={isEvent ? 'schedule.event' : `schedule.${tierData.tier.id}`}
                defaultOpen={isEvent}
              >
                <ScheduleView
                  matches={tierData.matches}
                  rounds={tierData.rounds}
                  seasonStartDate={isEvent ? null : season.started_at}
                  tierAccent={tierData.tier.id.replace('code_', '') as 's' | 'a' | 'b'}
                />
              </CollapsibleSchedule>
            </div>
          </section>
        );
      })}
    </>
  );
}