import { getBrightcoveScriptTag } from '../../scripts/config.js';

export default async function decorate(brightcove) {
  const values = [...document.querySelectorAll('.brightcove.block > div')]
  .map(row => row.children[1].textContent.trim());
  const [accountId, playerId, videoId] = values;

  if (!accountId || !playerId || !videoId) {
    brightcove.textContent = 'Brightcove configuration is missing.';
    return;
  }

  const player = document.createElement('video-js');

  player.className = 'video-js';
  player.setAttribute('controls', '');
  player.setAttribute('playsinline', '');
  player.setAttribute('data-account', accountId);
  player.setAttribute('data-player', playerId);
  player.setAttribute('data-video-id', videoId);
  player.setAttribute('data-embed', 'default');

  brightcove.innerHTML = '';
  brightcove.append(player);
  
  getBrightcoveScriptTag(accountId, playerId);
}

