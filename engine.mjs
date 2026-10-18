// Identity Fantasy Gacha v1: immutable algorithm. See README.md before changing.
export const ENGINE_VERSION = '1';
export const ALGORITHM_ID = 'ifg-sha256-uint32-reject-v1';
const HEX_SEED = /^[a-f0-9]{32}$/;
const TEXT_ENCODER = new TextEncoder();
const UINT32_SPAN = 0x100000000; // 2^32

export function generateSeed() {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

// Each draw uses a domain-separated SHA-256 stream. Rejection sampling removes modulo bias.
// No dependency on browser PRNG implementation or on how many other draws were made.
export async function uniformIndex(seed, domain, size) {
  if (!HEX_SEED.test(seed)) throw new Error('seedは小文字の32桁16進数で指定してください。');
  if (!/^[a-z-]+$/.test(domain)) throw new Error('不正な乱数ドメインです。');
  if (!Number.isSafeInteger(size) || size < 1 || size > UINT32_SPAN) throw new Error('抽選範囲が不正です。');
  if (!globalThis.crypto?.subtle) throw new Error('HTTPS環境が必要です（Web Crypto非対応）。');
  const limit = Math.floor(UINT32_SPAN / size) * size;
  for (let counter = 0; counter < 1000; counter++) {
    const message = TEXT_ENCODER.encode(`IFG|${ALGORITHM_ID}|${seed}|${domain}|${counter}`);
    const digest = await globalThis.crypto.subtle.digest('SHA-256', message);
    const value = new DataView(digest).getUint32(0, false);
    if (value < limit) return value % size;
  }
  throw new Error('乱数の採用回数が上限を超えました。');
}

export function compatible(item, creature) {
  return (!item.sizes || item.sizes.includes(creature.size)) &&
    (!item.habitats || item.habitats.includes(creature.habitat));
}

export function validateData(data) {
  const {categories, species, rarity, pose, camera, environment, palette, template} = data;
  if (categories.length !== 15 || rarity.length !== 6 || !template.includes('{SPECIES}')) throw new Error('v1データ形式に問題があります。');
  const speciesNames = new Set(), speciesIds = new Set();
  for (const cat of categories) {
    if (!Array.isArray(species[cat.id]) || species[cat.id].length < 20) throw new Error(`生物データが不足しています: ${cat.id}`);
    for (const creature of species[cat.id]) {
      if (speciesNames.has(creature.name) || speciesIds.has(creature.id)) throw new Error(`生物が重複しています: ${creature.name}`);
      speciesNames.add(creature.name); speciesIds.add(creature.id);
      if (!pose.some(p => compatible(p, creature)) || !environment.some(e => compatible(e, creature))) throw new Error(`適合構図・背景がありません: ${creature.name}`);
    }
  }
  if (speciesNames.size < 300 || !camera.length || !palette.length) throw new Error('抽選データが不足しています。');
  return speciesNames.size;
}

export async function draw(seed, data) {
  const category = data.categories[await uniformIndex(seed, 'category', data.categories.length)];
  const candidates = data.species[category.id];
  const creature = candidates[await uniformIndex(seed, 'species', candidates.length)];
  const rarity = data.rarity[await uniformIndex(seed, 'rarity', data.rarity.length)];
  const compatiblePoses = data.pose.filter(p => compatible(p, creature));
  const pose = compatiblePoses[await uniformIndex(seed, 'pose', compatiblePoses.length)];
  const camera = data.camera[await uniformIndex(seed, 'camera', data.camera.length)];
  const compatibleScenes = data.environment.filter(e => compatible(e, creature));
  const environment = compatibleScenes[await uniformIndex(seed, 'environment', compatibleScenes.length)];
  const palette = data.palette[await uniformIndex(seed, 'palette', data.palette.length)];
  return {version:ENGINE_VERSION, seed, category, creature, rarity, pose, camera, environment, palette};
}

export function promptFor(result, template) {
  const tokens = {
    CATEGORY: result.category.name,
    SPECIES: result.creature.name,
    MOTIF: result.creature.motif,
    CATEGORY_STYLE: result.category.style,
    RARITY: result.rarity.level,
    RARITY_NAME: result.rarity.name,
    RARITY_STYLE: result.rarity.direction,
    POSE: result.pose.name,
    POSE_DETAIL: result.pose.direction,
    CAMERA: result.camera.name,
    CAMERA_DETAIL: result.camera.direction,
    ENVIRONMENT: result.environment.name,
    ENVIRONMENT_DETAIL: result.environment.direction,
    PALETTE_DETAIL: result.palette.direction,
    DARK_COUNT: 6 - result.rarity.level,
  };
  const out = template.replace(/\{([A-Z_]+)\}/g, (m, key) => {
    if (!(key in tokens)) throw new Error(`未知のテンプレートキー: ${key}`);
    return String(tokens[key]);
  }).trim();
  if (/\{[A-Z_]+\}/.test(out)) throw new Error('プロンプトに未展開の変数があります。');
  return out;
}

export function resultUrl(result, currentUrl) {
  const url = new URL(currentUrl);
  url.search = '';
  url.hash = '';
  url.searchParams.set('v', result.version);
  url.searchParams.set('s', result.seed);
  return url.toString();
}
