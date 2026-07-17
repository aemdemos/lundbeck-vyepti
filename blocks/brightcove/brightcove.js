import { getBrightcoveScriptTag } from '../../scripts/config.js';
import { getTranscript } from './transcript.js';

export default async function decorate(brightcove) {
  const rows = [...brightcove.querySelectorAll(':scope > div')];

  const accountId = rows[0]?.children[1]?.textContent.trim();
  const playerId = rows[1]?.children[1]?.textContent.trim();
  const videoId = rows[2]?.children[1]?.textContent.trim();
  const showTranscript = rows[3]?.children[1]?.textContent.trim();
  const OPEN_TRANSCRIPT_ICON =
  'https://www.assets.lundbeck-tools.com/content/dam/lundbeck/vyepti/overhaul/images/expand-22-desktop.svg';

  const CLOSE_TRANSCRIPT_ICON =
  'https://www.assets.lundbeck-tools.com/content/dam/lundbeck/vyepti/overhaul/images/collapse-22-desktop.svg';

  const transcriptHTML = rows[4]?.children[1]?.innerHTML;

  if (!accountId || !playerId || !videoId) {
    brightcove.textContent = 'Brightcove configuration is missing.';
    return;
  }

  // Create Brightcove player
  const player = document.createElement('video-js');
  player.className = 'video-js';
  player.className = 'video-wrap';
  player.setAttribute('controls', '');
  player.setAttribute('playsinline', '');
  player.setAttribute('data-account', accountId);
  player.setAttribute('data-player', playerId);
  player.setAttribute('data-video-id', videoId);``
  player.setAttribute('data-embed', 'default');

  // Clear authored content and add player
  brightcove.innerHTML = '';
  brightcove.append(player);

  // Load Brightcove player script
  getBrightcoveScriptTag(accountId, playerId);

  // Add transcript if enabled
 getTranscript({
  showTranscript,
  openTranscriptIcon: OPEN_TRANSCRIPT_ICON,
  closeTranscriptIcon: CLOSE_TRANSCRIPT_ICON,
  transcriptHTML,
  brightcove,
});
}