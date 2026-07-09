import type { StandingsResponse } from '../api/client';
import { StandingsTable } from '../components/StandingsTable';

export function ColumnsView({ data }: { data: StandingsResponse }) {
  const { tiers } = data;

  return (
    <div className="columns-view">
      {tiers.map(tierData => {
        const tierId = tierData.tier.id.replace('code_', '');
        return (
          <section
            key={tierData.tier.id}
            className="columns-view__col"
            aria-labelledby={`col-heading-${tierData.tier.id}`}
          >
            <div className={`tier-bar tier-bar--${tierId}`} aria-hidden="true" />

            <div className="section-header">
              <h2 id={`col-heading-${tierData.tier.id}`}>
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

            <StandingsTable
              standings={tierData.standings}
              tierId={tierData.tier.id}
            />
          </section>
        );
      })}
    </div>
  );
}