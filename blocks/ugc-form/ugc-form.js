import { UGC_CONFIGS } from '../../scripts/config.js';

// Fuction to load the js files necessary to embed the UGC form.
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === 'true') {
        resolve();
      } else {
        existing.addEventListener('load', resolve);
      }
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = false;

    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve();
    };

    script.onerror = reject;

    document.head.appendChild(script);
  });
}

export default async function decorate(block) {
  const config = Object.create(null);

  [...block.children].forEach((row) => {
    const cols = [...row.children];

    if (cols.length < 2) return;

    const key = cols[0].textContent.trim().toLowerCase();
    const value = cols[1].textContent.trim();

    config[key] = value;
  });

  const id = config.id || '';
  const a = config['a-value'] || '';
  const g = config['g-value'] || '';
  block.innerHTML = '';
  window.grecaptchaKey = UGC_CONFIGS.UGC_GREY_CAPTCHA_KEY;

  const wrapper = document.createElement('div');
  wrapper.className = 'thismomentugc';
  wrapper.setAttribute('ng-app', 'thismoment.embed');

  const embed = document.createElement('thismoment-embed');
  embed.setAttribute('id', id);
  embed.setAttribute('a', a);
  embed.setAttribute('g', g);

  wrapper.appendChild(embed);
  block.appendChild(wrapper);

  await loadScript(UGC_CONFIGS.UGC_GOOGLE_RECAPTCHA_SCRIPT);
  await loadScript(UGC_CONFIGS.UGC_TMSDK_SCRIPT);
  await loadScript(UGC_CONFIGS.UGC_EMBED_SCRIPT);
}