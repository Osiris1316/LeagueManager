import { Routes, Route, NavLink, Link, useLocation } from 'react-router-dom';
import { SeasonPage } from './pages/SeasonPage';
import { PlayerPage } from './pages/PlayerPage';
import { PlayersPage } from './pages/PlayersPage';
import { MatchPage } from './pages/MatchPage';
import { AdminPage } from './pages/AdminPage';
import { MenuPanel } from './components/MenuPanel';
import { SeasonPicker } from './components/SeasonPicker';

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
            AoE4 League
          </Link>
          <ul className="nav__links" role="list">
            <li>
              <NavLink to="/" end className={({ isActive }) =>
                `nav__link${isActive || isStandings ? ' nav__link--active' : ''}`}>
                Standings
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
          <Routes>
            <Route path="/" element={<SeasonPage />} />
            <Route path="/season/:seasonId" element={<SeasonPage />} />
            <Route path="/players" element={<PlayersPage />} />
            <Route path="/player/:playerId" element={<PlayerPage />} />
            <Route path="/match/:matchId" element={<MatchPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/admin/:seasonId" element={<AdminPage />} />
          </Routes>
        </main>
      </div>
    </>
  );
}