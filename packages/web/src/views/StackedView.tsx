import type { StandingsResponse } from '../api/client';
import { StandingsTable } from '../components/StandingsTable';
import { ScheduleView } from '../components/ScheduleView';
import { CollapsibleSchedule } from '../components/CollapsibleSchedule';

export function StackedView({ data }: { data: StandingsResponse }) {
  const { season, tiers } = data;

  return (
    <>
      {tiers.map(tierData => {
        const tierId = tierData.tier.id.replace('code_', '');
        return (
          <section
            key={tierData.tier.id}
            className="tier-section"
            aria-labelledby={`tier-heading-${tierData.tier.id}`}
          >
            <div className={`tier-bar tier-bar--${tierId}`} aria-hidden="true" />

            <div className="section-header">
              <h2 id={`tier-heading-${tierData.tier.id}`}>
                {tierData.tier.display_name}
              </h2>
              <span className={`badge badge--${tierId}`}>
                {tierData.tier.civ_rule === 'pro_draft'
                  ? 'Civ Draft'
                  : tierData.tier.civ_rule === 'win_lock'
                  ? 'Win Lock'
                  : 'Open'}
              </span>
            </div>

            {tierData.tier.rules_summary && (
              <p style={{
                fontSize: '0.8125rem',
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
            />

            <div style={{ marginTop: 'var(--space-lg)' }}>
              <CollapsibleSchedule count={tierData.matches.length}>
                <ScheduleView
                  matches={tierData.matches}
                  rounds={tierData.rounds}
                  seasonStartDate={season.started_at}
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