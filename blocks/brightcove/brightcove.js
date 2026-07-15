import { getBrightcoveScriptTag } from '../../scripts/config.js';
import { getTranscript } from './transcript.js';

export default async function decorate(brightcove) {
  const rows = [...brightcove.querySelectorAll(':scope > div')];

  const accountId = rows[0]?.children[1]?.textContent.trim();
  const playerId = rows[1]?.children[1]?.textContent.trim();
  const videoId = rows[2]?.children[1]?.textContent.trim();
  const showTranscript = rows[3]?.children[1]?.textContent.trim();
  const openTranscriptIcon = rows[4]?.children[1].innerHTML;
  const closeTranscriptIcon = rows[5]?.children[1].innerHTML;
  const transcriptHTML = rows[6]?.children[1]?.innerHTML;

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
  openTranscriptIcon,
  closeTranscriptIcon,
  transcriptHTML,
  brightcove,
});
}