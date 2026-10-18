import {ENGINE_VERSION, generateSeed, validateData, draw, promptFor, resultUrl} from './engine.mjs';

const $ = (id) => document.getElementById(id);
const el = {
  draw: $('draw-button'), redraw: $('redraw-button'), result: $('result'),
  title: $('result-title'), category: $('category'), rarityName: $('rarity-name'),
  stars: $('stars'), pose: $('pose'), camera: $('camera'),
  environment: $('environment'), palette: $('palette'), seed: $('seed'),
  prompt: $('prompt'), count: $('char-count'), copy: $('copy-button'),
  copyLabel: $('copy-label'), copyFeedback: $('copy-feedback'),
  link: $('link-button'), share: $('share-button'), status: $('status'),
  intro: $('intro'), version: $('version-label'),
};
let data = null;
let result = null;
let busy = false;
let copyFeedbackTimer = null;

async function readJSON(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`読込失敗: ${path}`);
  return response.json();
}

async function initialize() {
  el.draw.disabled = true;
  el.version.textContent = `DRAW ENGINE v${ENGINE_VERSION}`;
  try {
    const base = `./data/v${ENGINE_VERSION}/`;
    const files = ['categories', 'species', 'rarity', 'pose', 'camera', 'environment', 'palette'];
    const [jsons, templateResponse] = await Promise.all([
      Promise.all(files.map(name => readJSON(`${base}${name}.json`))),
      fetch(`${base}prompt_template.txt`),
    ]);
    if (!templateResponse.ok) throw new Error('プロンプト雛形を読み込めません。');
    data = Object.fromEntries(files.map((name, i) => [name, jsons[i]]));
    data.template = await templateResponse.text();
    const speciesCount = validateData(data);
    $('creature-count').textContent = `${speciesCount}種類`;
    el.draw.disabled = false;
    const params = new URLSearchParams(location.search);
    if (params.has('s') || params.has('v')) {
      if (params.get('v') !== ENGINE_VERSION) throw new Error('未対応のデータバージョンです。このURLは利用できません。');
      const seed = params.get('s') || '';
      await renderDraw(seed, true);
    }
  } catch (error) {
    showStatus(error.message || '初期化できませんでした。', true);
  }
}

async function renderDraw(seed, fromLink = false) {
  if (busy || !data) return;
  busy = true;
  el.draw.disabled = true;
  el.redraw.disabled = true;
  try {
    const candidate = await draw(seed, data);
    const prompt = promptFor(candidate, data.template);
    result = candidate;
    el.title.textContent = candidate.creature.name;
    el.category.textContent = candidate.category.name;
    el.rarityName.textContent = candidate.rarity.name;
    el.stars.replaceChildren();
    for (let i = 0; i < 6; i++) {
      const star = document.createElement('span');
      star.textContent = '★';
      star.className = i < candidate.rarity.level ? 'star-gold' : 'star-dark';
      el.stars.append(star);
    }
    el.stars.setAttribute('aria-label', `6つ中${candidate.rarity.level}個の星`);
    el.pose.textContent = candidate.pose.name;
    el.camera.textContent = candidate.camera.name;
    el.environment.textContent = candidate.environment.name;
    el.palette.textContent = candidate.palette.name;
    el.seed.textContent = candidate.seed;
    el.prompt.value = prompt;
    resetCopyFeedback();
    el.count.textContent = `${prompt.length} / 1000文字`;
    el.count.classList.toggle('over-limit', prompt.length > 1000);
    el.result.hidden = false;
    el.intro.hidden = true;
    history.replaceState(null, '', resultUrl(candidate, location.href));
    showStatus(fromLink ? '共有された抽選結果を復元しました。' : '新しい相棒を召喚しました。');
    if (!fromLink) el.result.scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block:'start'});
  } catch (error) {
    showStatus(error.message || '抽選に失敗しました。', true);
  } finally {
    busy = false;
    el.draw.disabled = false;
    el.redraw.disabled = false;
  }
}

function showStatus(message, isError = false) {
  el.status.textContent = message;
  el.status.classList.toggle('error', isError);
}

function resetCopyFeedback() {
  if (copyFeedbackTimer !== null) clearTimeout(copyFeedbackTimer);
  copyFeedbackTimer = null;
  el.copyLabel.textContent = 'プロンプトをコピー';
  el.copy.classList.remove('is-copied');
  el.copyFeedback.hidden = true;
  el.copyFeedback.textContent = '';
  el.copyFeedback.classList.remove('error');
}

function notifyCopy(message, success, isPrompt) {
  showStatus(message, !success);
  if (!isPrompt) return;
  if (copyFeedbackTimer !== null) clearTimeout(copyFeedbackTimer);
  el.copyLabel.textContent = success ? '✓ コピーしました' : 'コピーを再試行';
  el.copy.classList.toggle('is-copied', success);
  el.copyFeedback.hidden = false;
  el.copyFeedback.textContent = message;
  el.copyFeedback.classList.toggle('error', !success);
  copyFeedbackTimer = setTimeout(resetCopyFeedback, 4000);
}

async function copyText(content, onDone, isPrompt = false) {
  if (!content) return;
  // Clipboard APIはユーザーが押した直後に呼び出す（iPhone Safariの操作権限）。
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable');
    await navigator.clipboard.writeText(content);
    notifyCopy(onDone, true, isPrompt);
  } catch (_) {
    el.prompt.value = content;
    el.prompt.focus();
    el.prompt.select();
    let copied = false;
    try { copied = document.execCommand('copy'); } catch (_) {}
    if (copied) notifyCopy(onDone, true, isPrompt);
    else notifyCopy('コピーできませんでした。選択中のテキストを手動でコピーしてください。', false, isPrompt);
    if (copied && result) el.prompt.value = promptFor(result, data.template);
  }
}

el.draw.addEventListener('click', () => renderDraw(generateSeed()));
el.redraw.addEventListener('click', () => renderDraw(generateSeed()));
el.copy.addEventListener('click', () => copyText(el.prompt.value, 'コピー完了。ChatGPTアプリを開いて、顔写真と一緒に貼り付けてください。', true));
el.link.addEventListener('click', () => {
  if (result) copyText(resultUrl(result, location.href), '再現用URLをコピーしました。');
});
el.share.addEventListener('click', () => {
  if (!result) return;
  const stars = '★'.repeat(result.rarity.level) + '☆'.repeat(6 - result.rarity.level);
  const message = `運命の相棒ガチャ\n相棒：${result.creature.name}（${result.category.name}）\nレアリティ：${stars}\n私の相棒を召喚！ #運命の相棒ガチャ`;
  const target = `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}&url=${encodeURIComponent(resultUrl(result, location.href))}`;
  window.open(target, '_blank', 'noopener,noreferrer');
});

window.addEventListener('popstate', () => {
  const params = new URLSearchParams(location.search);
  if (params.get('v') === ENGINE_VERSION && params.has('s')) renderDraw(params.get('s'), true);
});
initialize();
