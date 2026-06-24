import { Routes, Route, NavLink, Link } from 'react-router-dom';
import { SeasonPage } from './pages/SeasonPage';
import { PlayerPage } from './pages/PlayerPage';
import { PlayersPage } from './pages/PlayersPage';
import { MatchPage } from './pages/MatchPage';
import { MatchesPage } from './pages/MatchesPage';
import { MenuPanel } from './components/MenuPanel';
import WizardPrototypePage from './pages/WizardPrototypePage';

export function App() {
  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <div className="page-container">
        <nav className="nav" aria-label="Main navigation">
          <Link to="/" className="nav__brand">
            AoE4 League
          </Link>
          <ul className="nav__links" role="list">
            <li>
              <NavLink to="/" end className={({ isActive }) =>
                `nav__link${isActive ? ' nav__link--active' : ''}`}>
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
          <MenuPanel />
        </nav>
        <main id="main-content">
          <Routes>
            <Route path="/" element={<SeasonPage />} />
            <Route path="/season/:seasonId" element={<SeasonPage />} />
            <Route path="/matches" element={<MatchesPage />} />
            <Route path="/players" element={<PlayersPage />} />
            <Route path="/player/:playerId" element={<PlayerPage />} />
            <Route path="/match/:matchId" element={<MatchPage />} />
            <Route path="/wizard-prototype" element={<WizardPrototypePage />} />
          </Routes>
        </main>
      </div>
    </>
  );
}