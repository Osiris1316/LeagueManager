import { useEffect, useState } from 'react';
import { getRules } from '../api/client';
import { marked } from 'marked';

interface RulesModalProps {
  seasonId: number;
  tierId: string;
  tierName: string;
  onClose: () => void;
}

export function RulesModal({ seasonId, tierId, tierName, onClose }: RulesModalProps) {
  const [rulesHtml, setRulesHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await getRules(seasonId, tierId);
        if (!cancelled) {
          setRulesHtml(data.rules_full);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load rules');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [seasonId, tierId]);

  // Close on Escape key
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-lg)',
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--border-radius)',
          width: '100%',
          maxWidth: '40rem',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: 'var(--space-md) var(--space-lg)',
          borderBottom: '1px solid var(--color-border)',
          flexShrink: 0,
        }}>
          <h2 style={{ fontSize: '1.125rem', margin: 0 }}>
            {tierName} Rules
          </h2>
          <button
            onClick={onClose}
            aria-label="Close rules"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-text-secondary)',
              fontSize: '1.5rem',
              cursor: 'pointer',
              padding: '0 0.25rem',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Body — scrollable */}
        <div style={{
          padding: 'var(--space-lg)',
          overflowY: 'auto',
          flex: 1,
        }}>
          {loading && (
            <p style={{ color: 'var(--color-text-secondary)' }}>Loading rules…</p>
          )}

          {error && (
            <p style={{ color: 'var(--color-loss)' }}>{error}</p>
          )}

          {!loading && !error && !rulesHtml && (
            <p style={{ color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>
              No rules have been published for this tier yet.
            </p>
          )}

          {!loading && !error && rulesHtml && (
            <div
              className="markdown-content"
              style={{
                fontSize: '0.9375rem',
                color: 'var(--color-text)',
              }}
              dangerouslySetInnerHTML={{ __html: marked.parse(rulesHtml) as string }}
            />
          )}
        </div>
      </div>
    </div>
  );
}