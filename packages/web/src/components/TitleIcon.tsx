import { useState } from 'react';
import { titleById } from '@league-manager/core';

/**
 * A game's icon, served from /assets/titles/{assetPrefix}.png. Until a game
 * has an icon file (or if it fails to load), a small text mark like "BW"
 * stands in, so a missing image never leaves a hole.
 */
export function TitleIcon({ titleId }: { titleId: string }) {
  const title = titleById(titleId);
  const [failed, setFailed] = useState(false);

  if (!title || failed) {
    return (
      <span className="title-icon title-icon--text" aria-hidden="true">
        {title?.shortName ?? titleId.toUpperCase()}
      </span>
    );
  }

  return (
    <img
      className="title-icon"
      src={`/assets/titles/${title.assetPrefix}.png`}
      alt=""
      width={16}
      height={16}
      onError={() => setFailed(true)}
    />
  );
}
