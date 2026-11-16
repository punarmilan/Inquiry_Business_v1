const UICampaign = require('../models/UICampaign');
const { checkBase, validateConfig } = require('../validators/ui.validator');

const status = (row, now = Date.now()) => !row.enabled || row.state === 'disabled' ? 'disabled'
  : row.state === 'draft' ? 'draft' : now >= +new Date(row.endsAt) ? 'expired' : now < +new Date(row.startsAt) ? 'scheduled' : 'active';
// Stable even after restarts, concurrent writes or missed schedule boundaries.
const rank = (a, b) => b.priority - a.priority || +new Date(b.startsAt) - +new Date(a.startsAt)
  || (a.identifier < b.identifier ? -1 : a.identifier > b.identifier ? 1 : 0);
const eligible = (row, cityId) => !row.cityIds.length || (!!cityId && row.cityIds.some((id) => String(id).toLowerCase() === String(cityId).toLowerCase()));
const resolve = (rows, cityId, now) => {
  const candidates = rows.filter((row) => row.enabled && row.state === 'scheduled' && eligible(row, cityId));
  const winner = candidates.filter((row) => status(row, now) === 'active').sort(rank)[0] || null;
  const boundaries = candidates.flatMap((row) => [+new Date(row.startsAt), +new Date(row.endsAt)]).filter((at) => at > now);
  return { winner, nextTransitionAt: boundaries.length ? new Date(Math.min(...boundaries)).toISOString() : null };
};
const readSchedule = (now) => UICampaign.find({ enabled: true, state: 'scheduled', endsAt: { $gt: new Date(now) } }).select('-audit -createdBy -updatedBy').lean();
const applyAnimation = (input, campaign) => {
  if (!campaign.animationAssetId) return input;
  const base = JSON.parse(JSON.stringify(input));
  const page = base.pages.offersHome;
  // One supported animation slot; never change native content or offer data.
  for (const slot of ['beforeContent', 'afterContent']) page.slots[slot] = page.slots[slot].filter((block) => block.type !== 'lottie');
  let id = 'campaign-animation';
  const ids = new Set([...page.slots.beforeContent, ...page.slots.afterContent].map((block) => block.id));
  while (ids.has(id)) id += '-1';
  page.slots.beforeContent.push({ id, type: 'lottie', props: { assetId: String(campaign.animationAssetId), fallback: { en: campaign.name }, loop: false, width: 160, height: 160 } });
  page.rendererVersion = Math.max(page.rendererVersion, 2);
  validateConfig(page);
  return checkBase(base);
};
module.exports = { status, rank, eligible, resolve, readSchedule, applyAnimation };
