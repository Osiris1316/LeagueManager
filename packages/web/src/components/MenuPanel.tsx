import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAdmin } from '../context/AdminContext';
import { applyTheme, readTheme } from '../theme';
import type { ThemeChoice } from '../theme';

const THEME_OPTIONS: { value: ThemeChoice; label: string }[] = [
  { value: 'system', label: 'Auto' },
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
];

export function MenuPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [tokenValue, setTokenValue] = useState('');
  const { isAdmin, login, logout } = useAdmin();
  const [theme, setTheme] = useState<ThemeChoice>(readTheme);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setShowTokenInput(false);
        setTokenValue('');
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setShowTokenInput(false);
        setTokenValue('');
        buttonRef.current?.focus();
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen]);

  const [loginError, setLoginError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  async function handleLogin() {
    if (!tokenValue.trim()) return;
    setLoginError(null);
    setVerifying(true);

    try {
      const base = import.meta.env.VITE_API_BASE_URL ?? '';
      const res = await fetch(`${base}/api/admin/verify`, {
        method: 'POST',
        headers: { 'X-Admin-Token': tokenValue.trim() },
      });

      if (res.status === 401) {
        setLoginError('Invalid token');
        setVerifying(false);
        return;
      }

      if (!res.ok) {
        setLoginError('Server error');
        setVerifying(false);
        return;
      }

      login(tokenValue.trim());
      setTokenValue('');
      setShowTokenInput(false);
      setIsOpen(false);
    } catch {
      setLoginError('Connection failed');
    } finally {
      setVerifying(false);
    }
  }

  function handleLogout() {
    logout();
    setIsOpen(false);
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        ref={buttonRef}
        onClick={() => {
          setIsOpen(!isOpen);
          if (isOpen) { setShowTokenInput(false); setTokenValue(''); }
        }}
        aria-label="Menu"
        aria-expanded={isOpen}
        style={{
          background: 'none', border: 'none', color: 'var(--color-text-secondary)',
          fontSize: '1.25rem', cursor: 'pointer', padding: 'var(--space-xs) var(--space-sm)', lineHeight: 1,
        }}
      >
        ☰
      </button>

      {isOpen && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} aria-hidden="true" />
          <div
            ref={panelRef}
            role="menu"
            style={{
              position: 'absolute', top: '100%', right: 0, marginTop: 'var(--space-sm)',
              width: '16rem', background: 'var(--color-bg-raised)', border: '1px solid var(--color-border)',
              borderRadius: 'var(--border-radius)', padding: 'var(--space-sm)', zIndex: 100,
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
            }}
          >
            {isAdmin && (
              <Link
                role="menuitem"
                to="/admin"
                onClick={() => setIsOpen(false)}
                style={menuItemStyle}
              >
                Admin panel
              </Link>
            )}

            <Link
              role="menuitem"
              to="/settings"
              onClick={() => setIsOpen(false)}
              style={menuItemStyle}
            >
              Settings
            </Link>

            <div className="menu-theme" role="group" aria-label="Appearance">
              <span className="menu-theme__label">Appearance</span>
              <div className="view-switch menu-theme__switch">
                {THEME_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`view-switch__btn${theme === opt.value ? ' view-switch__btn--active' : ''}`}
                    aria-pressed={theme === opt.value}
                    onClick={() => { applyTheme(opt.value); setTheme(opt.value); }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={dividerStyle} role="separator" />

            {isAdmin ? (
              <button role="menuitem" onClick={handleLogout} style={menuItemStyle}>
                Log out
              </button>
            ) : showTokenInput ? (
              <div style={{ padding: 'var(--space-sm)' }}>
                <label htmlFor="menu-token" style={{
                  display: 'block', fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)',
                  marginBottom: 'var(--space-xs)',
                }}>
                  Admin token
                </label>
                <input
                  id="menu-token"
                  type="password"
                  value={tokenValue}
                  onChange={e => setTokenValue(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  autoFocus
                  style={{
                    width: '100%', padding: '0.375rem 0.5rem', background: 'var(--color-bg-surface)',
                    border: '1px solid var(--color-border)', borderRadius: 'var(--border-radius-sm)',
                    color: 'var(--color-text)', fontFamily: 'var(--font-body)', fontSize: 'var(--text-base)',
                    marginBottom: 'var(--space-sm)',
                  }}
                  placeholder="Enter token"
                />
                {loginError && (
                  <p style={{
                    fontSize: 'var(--text-sm)', color: 'var(--color-loss)',
                    marginBottom: 'var(--space-sm)',
                  }}>
                    {loginError}
                  </p>
                )}
                <button onClick={handleLogin} disabled={verifying} style={{
                  width: '100%', padding: '0.375rem 0.75rem',
                  background: verifying ? 'var(--color-text-tertiary)' : 'var(--color-accent)',
                  color: 'var(--color-bg)', border: 'none', borderRadius: 'var(--border-radius-sm)',
                  fontWeight: 600, fontSize: 'var(--text-sm)',
                  cursor: verifying ? 'not-allowed' : 'pointer',
                }}>
                  {verifying ? 'Checking…' : 'Confirm'}
                </button>
              </div>
            ) : (
              <button role="menuitem" onClick={() => setShowTokenInput(true)} style={menuItemStyle}>
                Log in
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

const menuItemStyle: React.CSSProperties = {
  display: 'block', width: '100%', padding: 'var(--space-sm) var(--space-md)',
  background: 'none', border: 'none', borderRadius: 'var(--border-radius-sm)',
  color: 'var(--color-text)', fontFamily: 'var(--font-body)', fontSize: 'var(--text-base)',
  textAlign: 'left', cursor: 'pointer',
};

const dividerStyle: React.CSSProperties = {
  height: '1px', margin: 'var(--space-xs) 0',
  background: 'var(--color-border-subtle)', border: 'none',
};