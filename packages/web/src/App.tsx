import { Routes, Route, NavLink, Link, useLocation } from 'react-router-dom';
import { SeasonPage } from './pages/SeasonPage';
import { PlayerPage } from './pages/PlayerPage';
import { PlayersPage } from './pages/PlayersPage';
import { MatchPage } from './pages/MatchPage';
import { MatchesPage } from './pages/MatchesPage';
import { AdminPage } from './pages/AdminPage';
import { SettingsPage } from './pages/SettingsPage';
import WizardPrototypePage from './pages/WizardPrototypePage';
import { MenuPanel } from './components/MenuPanel';
import { SeasonPicker } from './components/SeasonPicker';
import { FollowedMatches } from './components/FollowedMatches';

export function App() {
  const location = useLocation();
  // Standings live at "/" (current season) and "/season/:id" (a specific one).
  const isStandings =
    location.pathname === '/' || location.pathname.startsWith('/season');

  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <div className="page-container">
        <nav className="nav" aria-label="Main navigation">
          <Link to="/" className="nav__brand">
            <span className="nav__brand-full">Atlantic Canadian RTS Society</span>
            <span className="nav__brand-short">ACRS</span>
          </Link>
          <ul className="nav__links" role="list">
            <li>
              <NavLink to="/" end className={({ isActive }) =>
                `nav__link${isActive || isStandings ? ' nav__link--active' : ''}`}>
                Standings
              </NavLink>
            </li>
            <li>
              <NavLink to="/matches" className={({ isActive }) =>
                `nav__link${isActive ? ' nav__link--active' : ''}`}>
                Matches
              </NavLink>
            </li>
            <li>
              <NavLink to="/players" className={({ isActive }) =>
                `nav__link${isActive ? ' nav__link--active' : ''}`}>
                Players
              </NavLink>
            </li>
          </ul>
          <div className="nav__right">
            <SeasonPicker />
            <MenuPanel />
          </div>
        </nav>

        <main id="main-content">
          <FollowedMatches />
          <Routes>
            <Route path="/" element={<SeasonPage />} />
            <Route path="/season/:seasonId" element={<SeasonPage />} />
            <Route path="/matches" element={<MatchesPage />} />
            <Route path="/players" element={<PlayersPage />} />
            <Route path="/player/:playerId" element={<PlayerPage />} />
            <Route path="/match/:matchId" element={<MatchPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/admin/:seasonId" element={<AdminPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/wizard-prototype" element={<WizardPrototypePage />} />
          </Routes>
        </main>
      </div>
    </>
  );
}
