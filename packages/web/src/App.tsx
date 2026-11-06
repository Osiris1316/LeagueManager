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
import { FollowChip } from './components/your-matches/FollowChip';
import { FollowedRibbon } from './components/your-matches/MatchRibbon';
import { SidePanelOverlay, SidePanelPinned } from './components/your-matches/SidePanel';
import { BottomSheet } from './components/your-matches/BottomSheet';
import { useFollow } from './context/FollowContext';
import { useYourMatches } from './context/YourMatchesContext';
import { useIsDesktop } from './hooks/useMediaQuery';

export function App() {
  const location = useLocation();
  // Standings live at "/" (current season) and "/season/:id" (a specific one).
  const isStandings =
    location.pathname === '/' || location.pathname.startsWith('/season');

  const isDesktop = useIsDesktop();
  const { followedPlayerId } = useFollow();
  const { panelOpen, togglePanel, pinned } = useYourMatches();

  // Desktop standings can show the panel pinned as a column. Everywhere else
  // on desktop it slides in from the nav chip.
  const pinnedHere = isDesktop && isStandings && pinned;
  // The player page keeps its own column on desktop, so it gets the wider
  // page too, leaving the stats their usual width.
  const isPlayerPage = location.pathname.startsWith('/player/');
  const widePage = pinnedHere || (isDesktop && isPlayerPage);

  // On a phone, the followed player's own page already shows their tiles
  // under their name, so the ribbon at the top steps aside there.
  const onFollowedPlayerPage =
    followedPlayerId != null && location.pathname === `/player/${followedPlayerId}`;

  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <div className={`page-container${widePage ? ' page-container--with-panel' : ''}`}>
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
            {isDesktop && !pinnedHere && (
              <FollowChip onClick={togglePanel} expanded={panelOpen} />
            )}
            <MenuPanel />
          </div>
        </nav>

        {!isDesktop && !onFollowedPlayerPage && <FollowedRibbon />}

        <div className={pinnedHere ? 'app-body app-body--with-panel' : 'app-body'}>
          <main id="main-content">
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
          {pinnedHere && <SidePanelPinned />}
        </div>
      </div>

      {isDesktop && !pinnedHere && <SidePanelOverlay allowPin={isStandings} />}
      {!isDesktop && <BottomSheet />}
    </>
  );
}
