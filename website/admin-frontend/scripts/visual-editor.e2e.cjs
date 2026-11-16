// Isolated browser QA: every API request is mocked. No application data is published.
const { chromium, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { validateConfig, checkBase, defaultBase } = require('../../backend/src/validators/ui.validator');
const { validateImage } = require('../../backend/src/validators/uiImage');
const output = path.resolve(__dirname, '../../../artifacts/visual-editor');
fs.mkdirSync(output, { recursive: true });
const { validateAnimation } = require('../../backend/src/validators/uiAnimation');
const animationId = '507f1f77bcf86cd799439045';
let homeAnimation = null;
const imageId = '507f1f77bcf86cd799439044';
const theme = defaultBase().theme;
theme.modes.light.colors = { primary: '#C5620B', primaryDark: '#8A3D05', background: '#FFF8ED', surface: '#FFFFFF', text: '#3F230E', textSecondary: '#75563D' };
theme.modes.dark.colors = { primary: '#C5620B', primaryDark: '#8A3D05', background: '#1D1210', surface: '#30201B', text: '#FFF3DF', textSecondary: '#D6B99D' };
let config = { schemaVersion: 1, rendererVersion: 3, kind: 'page', key: 'offersHome', slots: { beforeContent: [
  { id: 'hero', type: 'heroBanner', props: { title: { en: 'Shubh Diwali!' }, subtitle: { en: 'Celebrate with your neighbourhood.' } } },
  { id: 'text', type: 'text', props: { text: { en: 'Offers near you' }, variant: 'heading' } },
], afterContent: [] } };
let generation = 2, version = 1, upload = null, publishCount = 0, failSave = false, failHomeImage = false;
const draftId = '507f1f77bcf86cd799439011', pageRevisionId = '507f1f77bcf86cd799439012', themeRevisionId = '507f1f77bcf86cd799439013';
const revision = () => ({ _id: draftId, kind: 'page', key: 'offersHome', status: 'draft', config, draftVersion: version });
const release = () => ({ _id: '507f1f77bcf86cd799439014', generation, pageRevisionIds: { offersHome: pageRevisionId }, themeRevisionId, reason: 'Browser QA fixture', createdAt: new Date().toISOString() });
async function main() {
  const installed = process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'ms-playwright/chromium-1234/chrome-win64/chrome.exe');
  const browser = await chromium.launch({ headless: true, ...(installed && fs.existsSync(installed) ? { executablePath: installed } : {}) });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'reduce' });
    await context.addInitScript(() => localStorage.setItem('admin_refresh_token', 'isolated-qa-session'));
    const page = await context.newPage(); const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.route('**/*', async (route) => {
      const request = route.request();
      if (!['fetch', 'xhr'].includes(request.resourceType())) return route.continue();
      const url = new URL(request.url()), method = request.method(), body = method === 'GET' ? null : request.postDataJSON();
      const json = (value, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(value) });
      if (url.pathname.endsWith('/auth/refresh')) return json({ success: true, accessToken: 'qa-only', refreshToken: 'isolated-qa-session' });
      if (url.pathname.endsWith('/auth/me')) return json({ success: true, admin: { _id: draftId, name: 'Editor QA', role: 'admin', isActive: true } });
      if (url.pathname.endsWith('/hyperlocal/home-showcase')) return json({ showcase: { banner: {}, trendingOfferIds: ['507f1f77bcf86cd799439099'] }, selectedOffers: [{ _id: '507f1f77bcf86cd799439099', title: 'Selected local offer' }] });
      const p = url.pathname.slice(url.pathname.indexOf('/ui/'));
      if (p === '/ui/assets/image' && method === 'POST') {
        if (failHomeImage) return json({ error: { message: 'Photo upload interrupted. Try again.' } }, 503);
        const validated = validateImage(body); upload = { ...validated, _id: imageId, name: body.name, enabled: true, archived: false, assetVersion: 1 };
        const { data: _data, ...safe } = upload; return json({ asset: safe }, 201);
      }
      if (p === `/ui/assets/${imageId}/content` && upload) return route.fulfill({ status: 200, contentType: upload.mimeType, body: upload.data, headers: { 'Access-Control-Allow-Origin': '*' } });
      if (p === '/ui/assets' && method === 'POST') {
        homeAnimation = { ...validateAnimation(body.animation), _id: animationId, name: body.name, enabled: true, archived: false, assetVersion: 1 };
        return json({ asset: homeAnimation }, 201);
      }
      if (p === `/ui/assets/${animationId}` && homeAnimation) return json({ asset: homeAnimation });
      if (p === '/ui/assets') return json({ data: [...(upload ? [{ ...upload, data: undefined }] : []), ...(homeAnimation ? [homeAnimation] : [])], pagination: { pages: 1, page: 1, total: upload ? 1 : 0 } });
      if (p === '/ui/releases') return json({ data: [release()], pagination: { pages: 1, page: 1, total: 1 } });
      if (p === '/ui/configs' && method === 'GET') return json({ data: [revision()], pagination: { pages: 1, page: 1, total: 1 } });
      if (p === `/ui/configs/${themeRevisionId}`) return json({ config: { _id: themeRevisionId, config: theme, status: 'published', kind: 'theme', key: 'global' } });
      if (p === `/ui/configs/${pageRevisionId}`) return json({ config: { ...revision(), _id: pageRevisionId, status: 'published' } });
      if (p === '/ui/configs/validate') {
        try { validateConfig(body.config); const base = defaultBase(); base.theme = theme; base.pages.offersHome = body.config; checkBase(base); return json({ valid: true }); }
        catch (e) { return json({ error: { message: e.message } }, 422); }
      }
      if (p === `/ui/configs/${draftId}/validate`) return json({ valid: true, generation, draftVersion: version });
      if (p === `/ui/configs/${draftId}/publish`) { generation++; publishCount++; return json({ success: true, generation, releaseId: release()._id, release: release() }); }
      if (p === `/ui/configs/${draftId}` && method === 'PUT') {
        if (failSave) return json({ error: { message: 'Connection interrupted. Your edits are retained.' } }, 503);
        config = body.config; version++; return json({ config: revision() });
      }
      if (p === `/ui/configs/${draftId}`) return json({ config: revision() });
      return json({ success: true, data: {}, attention: {} });
    });
    await page.goto(process.env.UI_TEST_URL || 'http://localhost:5173/ui/pages/offersHome');
    await expect(page.getByRole('heading', { name: 'Dynamic UI editor', exact: true })).toBeVisible();
    const hero = page.getByRole('button', { name: 'Edit heroBanner section', exact: true });
    await hero.click();
    await expect(hero).toHaveAttribute('aria-pressed', 'true');
    await page.getByLabel('Title (English)', { exact: true }).fill('Diwali, designed by you');
    await expect(page.locator('[data-canvas-block=hero]')).toContainText('Diwali, designed by you');
    await page.getByRole('navigation', { name: 'Admin navigation' }).getByRole('link', { name: 'App content overview', exact: true }).click();
    await expect(page.getByRole('dialog').getByRole('heading', { name: 'Leave without saving?' })).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page.getByLabel('Title (English)', { exact: true })).toHaveValue('Diwali, designed by you');
    await page.getByLabel('Text size', { exact: false }).fill('30');
    await page.getByRole('combobox', { name: /^Text alignment/ }).selectOption('center');
    await page.getByRole('combobox', { name: /^Font family/ }).selectOption('serif');
    await expect(page.locator('[data-canvas-block=hero] h3')).toHaveCSS('font-size', '30px');
    await expect(page.locator('[data-canvas-block=hero] h3')).toHaveCSS('line-height', '42px');
    await expect(page.locator('[data-canvas-block=hero] h3')).toHaveCSS('text-align', 'center');
    await page.getByRole('button', { name: 'Add Icon', exact: true }).click();
    await page.getByRole('button', { name: 'Use Flame icon', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Use Flame icon', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Add Image', exact: true }).click();
    const fixture = await page.evaluate(() => {
      const c = document.createElement('canvas'); c.width = 1280; c.height = 720; const ctx = c.getContext('2d');
      ctx.fillStyle = '#8A3D05'; ctx.fillRect(0, 0, 1280, 720); ctx.fillStyle = '#F5A623'; ctx.fillRect(40, 40, 1200, 640);
      ctx.fillStyle = '#3F230E'; ctx.font = 'bold 90px sans-serif'; ctx.fillText('Festival preview', 130, 390);
      return c.toDataURL('image/png').split(',')[1];
    });
    await page.locator('input[type=file]').setInputFiles({ name: 'festival.png', mimeType: 'image/png', buffer: Buffer.from(fixture, 'base64') });
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: 'Crop your image' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Use this crop' })).toBeEnabled();
    await dialog.getByRole('combobox', { name: /^Frame/ }).selectOption('1');
    await dialog.getByLabel('Zoom', { exact: false }).fill('1.5');
    await dialog.getByRole('button', { name: 'Use this crop' }).click();
    await expect(dialog).not.toBeVisible();
    await expect(page.locator('[data-canvas-block] img').last()).toBeVisible();
    if (!upload || upload.kind !== 'image' || upload.width !== upload.height) throw new Error('Image crop was not saved as a square managed image.');
    await page.getByRole('combobox', { name: /^Width/ }).selectOption('320');
    await expect(page.locator('[data-canvas-block=hero] h3')).toBeInViewport();
    await page.screenshot({ path: path.join(output, 'desktop.png'), fullPage: true });
    await page.getByRole('combobox', { name: /^Preview/ }).selectOption('dark');
    await page.screenshot({ path: path.join(output, 'dark.png'), fullPage: true });
    await page.getByRole('combobox', { name: /^Screen/ }).selectOption('plans');
    await expect(page.getByRole('dialog').getByRole('heading', { name: 'Switch screen with unsaved changes?' })).toBeVisible();
    await page.getByRole('button', { name: 'Keep editing', exact: true }).click();
    failSave = true;
    await page.getByRole('button', { name: 'Save draft', exact: true }).first().click();
    await expect(page.getByText('Connection interrupted. Your edits are retained.', { exact: true })).toBeVisible();
    failSave = false;
    await page.getByRole('button', { name: 'Save draft', exact: true }).first().click();
    await expect(page.getByText('Draft saved. Live UI is unchanged.', { exact: true }).last()).toBeVisible();
    await page.getByRole('textbox', { name: 'Publication or rollback reason' }).fill('Verify visual editor in isolated browser QA');
    await page.getByRole('button', { name: 'Publish to app', exact: true }).click();
    await expect(page.getByText('Live version 3', { exact: true })).toBeVisible();
    if (publishCount !== 1 || config.rendererVersion !== 4) throw new Error('Visual draft publication did not use renderer 4.');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('combobox', { name: /^Preview/ }).selectOption('light');
    await page.screenshot({ path: path.join(output, 'mobile.png'), fullPage: true });
    const overflow = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: innerWidth }));
    if (overflow.content > overflow.viewport + 1) throw new Error(`Narrow viewport overflow: ${JSON.stringify(overflow)}`);
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    if (!focused || focused === 'BODY') throw new Error('Keyboard focus did not reach an editor control.');
    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.getByRole('navigation', { name: 'Admin navigation' }).getByRole('link', { name: 'Home cards & banners', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Home cards & banners', exact: true })).toBeVisible();
    await expect(page.getByRole('combobox', { name: /^Screen/ })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Component library', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Start editing cards & banners', exact: true })).toHaveCount(0);
    await expect(page.getByLabel('Title (English)', { exact: true })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Change photo', exact: true })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Home placement', exact: true })).toHaveCount(0);
    await page.getByLabel('Title (English)', { exact: true }).fill('Neighbourhood festival');
    failSave = true;
    await page.getByRole('button', { name: 'Publish to app', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('Connection interrupted. Your edits are retained.');
    if (publishCount !== 1) throw new Error('Failed automatic save still published the home layout.');
    failSave = false;
    failHomeImage = true;
    const [homePhotoPicker] = await Promise.all([page.waitForEvent('filechooser'), page.getByRole('button', { name: 'Change photo', exact: true }).click()]);
    await homePhotoPicker.setFiles({ name: 'home-photo.png', mimeType: 'image/png', buffer: Buffer.from(fixture, 'base64') });
    await page.getByRole('dialog').getByRole('button', { name: 'Use this crop' }).click();
    await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Photo upload interrupted');
    failHomeImage = false;
    await page.getByRole('dialog').getByRole('button', { name: 'Use this crop' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page.getByLabel('Title (English)', { exact: true })).toHaveValue('Neighbourhood festival');
    await expect(page.locator('[data-home-preview=home_offers] img')).toBeVisible();
    await page.getByRole('button', { name: 'Save draft', exact: true }).click();
    await expect(page.getByRole('alert')).toHaveCount(0);
    await page.screenshot({ path: path.join(output, 'home-simple-desktop.png'), fullPage: true });
    await page.getByText('Image library & animation', { exact: true }).click();
    await page.getByRole('combobox', { name: 'Card / banner media', exact: true }).selectOption('lottie');
    const animation = { v: '5.7.4', w: 200, h: 200, fr: 30, ip: 0, op: 60, assets: [], layers: [{ ty: 4, nm: 'Pulsing offer', ind: 1, ip: 0, op: 60, st: 0, ks: { o: { a: 0, k: 100 }, r: { a: 0, k: 0 }, p: { a: 0, k: [100, 100, 0] }, a: { a: 0, k: [0, 0, 0] }, s: { a: 1, k: [{ t: 0, s: [60, 60, 100], e: [100, 100, 100], i: { x: 0.7, y: 1 }, o: { x: 0.3, y: 0 } }, { t: 30, s: [100, 100, 100], e: [60, 60, 100], i: { x: 0.7, y: 1 }, o: { x: 0.3, y: 0 } }, { t: 60, s: [60, 60, 100] }] } }, shapes: [{ ty: 'el', p: { a: 0, k: [0, 0] }, s: { a: 0, k: [110, 110] }, d: 1 }, { ty: 'fl', c: { a: 0, k: [1, 0.4, 0.15, 1] }, o: { a: 0, k: 100 }, r: 1 }] }] };
    await page.getByLabel('Upload Lottie JSON').setInputFiles({ name: 'home-animation.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(animation)) });
    await expect(page.getByRole('combobox', { name: 'Animation library', exact: true })).toHaveValue(animationId);
    await expect(page.locator('[data-home-preview=home_offers]')).toContainText('Neighbourhood festival');
    await page.getByRole('combobox', { name: 'Card or banner', exact: true }).selectOption('home_more');
    await page.getByText('Image library & animation', { exact: true }).click();
    await page.getByRole('combobox', { name: 'Card / banner media', exact: true }).selectOption('lottie');
    await expect(page.getByRole('combobox', { name: 'Animation library', exact: true })).toHaveValue(animationId);
    await page.getByLabel('Title (English)', { exact: true }).fill('Animated local savings');
    await page.getByRole('button', { name: 'Play preview', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Pause preview', exact: true })).toBeVisible();
    await page.screenshot({ path: path.join(output, 'home-lottie-controls.png'), fullPage: true });
    await page.getByRole('button', { name: 'Save draft', exact: true }).first().click();
    await expect(page.getByText('Draft saved. Live UI is unchanged.', { exact: true }).last()).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Publication or rollback reason' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Publish to app', exact: true }).click();
    await expect(page.getByText('Live version 4', { exact: true })).toBeVisible();
    if (config.rendererVersion !== 5 || config.slots.beforeContent.filter(block => block.type === 'homeCard' && block.props.media === 'lottie').length !== 2) throw new Error('Home card/banner animations did not survive publication.');
    if (config.slots.beforeContent.filter(block => block.type !== 'homeCard').length !== 4) throw new Error('Home content editing removed Dynamic UI sections.');
    // Four saved presets reuse the same cards; links remain exact through publish/reload.
    await expect(page.getByRole('button', { name: 'Use Accordion Cards', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('combobox', { name: 'Card or banner', exact: true }).selectOption('home_offers');
    await page.getByRole('combobox', { name: 'When tapped', exact: true }).selectOption('link');
    await page.getByLabel('Link URL', { exact: true }).fill('javascript:alert(1)');
    await expect(page.getByLabel('Link URL', { exact: true })).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByRole('link', { name: 'Test link (new tab)' })).toHaveCount(0);
    await page.getByLabel('Link URL', { exact: true }).fill('https://www.youtube.com/watch?v=example&t=12');
    await expect(page.getByRole('link', { name: 'Test link (new tab)' })).toHaveAttribute('href', 'https://www.youtube.com/watch?v=example&t=12');
    await page.getByText('Image library & animation', { exact: true }).click();
    await page.getByRole('combobox', { name: 'Card / banner media', exact: true }).selectOption('bundled');
    await page.getByText('Image library & animation', { exact: true }).click();
    const nativeCards = JSON.stringify(config.slots.beforeContent.filter(block => block.type === 'homeCard' && block.id !== 'home_offers'));
    for (const [name, id] of [['Photo Carousel', 'photoCarousel'], ['Hero Banner + Shortcuts', 'heroShortcuts'], ['Split Card Carousel', 'splitCarousel'], ['Accordion Cards', 'accordion']]) {
      await page.getByRole('button', { name: `Use ${name}`, exact: true }).click();
      await expect(page.locator('[data-header-style]')).toHaveAttribute('data-header-style', id);
      await expect(page.getByRole('button', { name: `Use ${name}`, exact: true })).toHaveAttribute('aria-pressed', 'true');
      const shortcuts = page.getByRole('group', { name: 'Service shortcuts', exact: true });
      await expect(shortcuts.locator('svg')).toHaveCount(4);
      await expect(shortcuts.locator('span')).toHaveText(['Local Offers', 'Create Post', 'Local Events', 'Find Services']);
      await expect(shortcuts.getByRole('button')).toHaveCount(0);
      if (id === 'heroShortcuts') {
        const card = page.locator('[data-header-style] button[aria-label^="Select"]').nth(1);
        const copy = card.locator('strong').locator('..');
        await expect(copy).toHaveCSS('background-color', 'rgb(211, 242, 225)');
        const bounds = await card.boundingBox(), icon = await shortcuts.locator('svg').first().boundingBox();
        const gap = icon.y - (bounds.y + bounds.height);
        if (gap < 0 || gap > 25) throw new Error(`Header-to-service icon gap is ${gap}px; expected at most 25px.`);
      }
      await page.getByRole('region', { name: 'Full header preview' }).screenshot({ path: path.join(output, `header-${id}.png`) });
      await page.getByRole('button', { name: 'Next header card', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Show header card 2', exact: true })).toHaveAttribute('aria-pressed', 'true');
      await expect(shortcuts.locator('span')).toHaveText(['Local Offers', 'Create Post', 'Local Events', 'Find Services']);
      await page.getByRole('button', { name: 'Previous header card', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Show header card 1', exact: true })).toHaveAttribute('aria-pressed', 'true');
      await page.setViewportSize({ width: 320, height: 844 });
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), { message: `Header ${id} fits at 320px after responsive measurement` }).toBe(true);
      await page.setViewportSize({ width: 1440, height: 1100 });
    }
    await page.getByText('Slide settings', { exact: true }).click();
    await page.getByLabel('Auto-slide', { exact: true }).uncheck();
    await page.getByRole('combobox', { name: /^Header card height/ }).selectOption('large');
    await page.getByLabel('Show arrows', { exact: true }).uncheck();
    await expect(page.getByRole('button', { name: 'Next header card', exact: true })).toHaveCount(0);
    await page.getByLabel('Show dots', { exact: true }).uncheck();
    await expect(page.getByRole('button', { name: 'Show header card 1', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Publish to app', exact: true }).click();
    await expect(page.getByText('Live version 5', { exact: true })).toBeVisible();
    if (config.rendererVersion !== 6 || config.homeHeader.style !== 'accordion' || config.homeHeader.autoPlay || config.homeHeader.showArrows || config.homeHeader.showDots || config.homeHeader.height !== 'large') throw new Error('Header settings did not survive publication.');
    if (config.slots.beforeContent.find(block => block.id === 'home_offers').props.linkUrl !== 'https://www.youtube.com/watch?v=example&t=12') throw new Error('Published link was changed.');
    if (JSON.stringify(config.slots.beforeContent.filter(block => block.type === 'homeCard' && block.id !== 'home_offers')) !== nativeCards) throw new Error('Header preset changed other card content.');
    const savedHomeCards = JSON.stringify(config.slots.beforeContent.filter(block => block.type === 'homeCard'));
    await page.getByRole('navigation', { name: 'Admin navigation' }).getByRole('link', { name: 'Dynamic UI editor', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Dynamic UI editor', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add Home cards & banners', exact: true })).toHaveCount(0);
    await expect(page.locator('[data-canvas-block=home_offers]')).toHaveCount(0);
    await page.getByRole('button', { name: 'Edit heroBanner section', exact: true }).click();
    await page.getByLabel('Title (English)', { exact: true }).fill('A separate layout edit');
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await expect(page.getByLabel('Title (English)', { exact: true })).toHaveValue('Diwali, designed by you');
    await page.getByLabel('Title (English)', { exact: true }).fill('A separate layout edit');
    await page.getByRole('button', { name: 'Save draft', exact: true }).first().click();
    await expect(page.getByText('Draft saved. Live UI is unchanged.', { exact: true }).last()).toBeVisible();
    if (JSON.stringify(config.slots.beforeContent.filter(block => block.type === 'homeCard')) !== savedHomeCards) throw new Error('Dynamic UI editing or undo changed home cards.');
    await page.getByRole('navigation', { name: 'Admin navigation' }).getByRole('link', { name: 'Home cards & banners', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Home cards & banners', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Use Accordion Cards', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByLabel('Link URL', { exact: true })).toHaveValue('https://www.youtube.com/watch?v=example&t=12');
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByLabel('Title (English)', { exact: true })).toHaveValue('Neighbourhood festival');
    await expect(page.getByRole('button', { name: 'Change photo', exact: true })).toBeVisible();
    await page.screenshot({ path: path.join(output, 'home-controls-mobile.png'), fullPage: true });
    const homeOverflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    if (homeOverflow) throw new Error('Home controls overflow at 390px.');

    // The two home tasks stay together in the sidebar, content overview and drawer.
    await page.setViewportSize({ width: 1440, height: 1000 });
    const sidebar = page.getByRole('complementary', { name: 'Sidebar', exact: true });
    await sidebar.getByRole('link', { name: 'App content overview', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'App content', exact: true })).toBeVisible();
    await expect(page).toHaveTitle('App content overview · InquiryExperts Admin');
    await expect(sidebar.getByRole('link', { name: 'App content overview', exact: true })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('region', { name: 'Home editing' }).getByRole('link', { name: /^Home cards & banners/ })).toHaveAttribute('href', '/home-content');
    await expect(page.getByRole('region', { name: 'Home editing' }).getByRole('link', { name: /^Trending offers/ })).toHaveAttribute('href', '/home-showcase');
    await page.screenshot({ path: path.join(output, 'app-content-desktop.png'), fullPage: true });

    let failShowcase = true, showcaseSaves = 0;
    await page.route('**/hyperlocal/home-showcase', route => {
      if (route.request().method() === 'PUT') {
        showcaseSaves++;
        const body = route.request().postDataJSON();
        if (body.banner.title !== 'Retained older banner') throw new Error('Trending publish lost the existing banner settings.');
        return route.fulfill({ json: { showcase: body } });
      }
      return route.fulfill({ status: failShowcase ? 503 : 200, json: failShowcase ? { error: { message: 'Offline fixture' } } : { showcase: { banner: { imageUrl: '', title: 'Retained older banner', subtitle: '', buttonText: '' }, trendingOfferIds: [] }, selectedOffers: [] } });
    });
    await sidebar.getByRole('link', { name: 'Trending offers', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Trending offers', exact: true })).toBeVisible();
    await expect(page.getByRole('alert')).toContainText('Could not load trending offers');
    await expect(page.getByRole('button', { name: 'Publish changes', exact: true })).toBeDisabled();
    failShowcase = false;
    await page.getByRole('button', { name: 'Try again', exact: true }).click();
    await expect(page.getByText('No posters selected yet.', { exact: false })).toBeVisible();
    await expect(page.getByLabel('Headline', { exact: true })).not.toBeVisible();
    await page.getByText('Older home banner settings (advanced)', { exact: true }).click();
    await expect(page.getByLabel('Headline', { exact: true })).toHaveValue('Retained older banner');
    await page.getByText('Older home banner settings (advanced)', { exact: true }).click();
    await page.getByRole('button', { name: 'Publish changes', exact: true }).click();
    await expect(page.getByText('Trending offers and banner settings published.', { exact: true })).toBeVisible();
    if (showcaseSaves !== 1) throw new Error('Trending selection was not published exactly once.');
    await page.screenshot({ path: path.join(output, 'trending-offers-desktop.png'), fullPage: true });

    for (const width of [320, 390, 768]) {
      await page.setViewportSize({ width, height: 844 });
      const menu = page.getByRole('button', { name: 'Open navigation menu', exact: true });
      await expect(menu).toBeVisible();
      await menu.click();
      const drawer = page.getByRole('dialog');
      await expect(drawer).toHaveCSS('opacity', '1');
      await expect(drawer.getByRole('link', { name: 'Home cards & banners', exact: true })).toBeVisible();
      await expect(drawer.getByRole('link', { name: 'Trending offers', exact: true })).toHaveAttribute('aria-current', 'page');
      if (width === 390) await page.screenshot({ path: path.join(output, 'admin-menu-mobile.png'), fullPage: true });
      await page.keyboard.press('Escape');
      await expect(drawer).not.toBeVisible();
      await expect(menu).toBeFocused();
      if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) throw new Error(`Admin navigation overflow at ${width}px.`);
    }
    await page.getByText('Older home banner settings (advanced)', { exact: true }).click();
    await page.getByLabel('Headline', { exact: true }).fill('Unsaved banner edit');
    await page.getByRole('button', { name: 'Open navigation menu', exact: true }).click();
    await page.getByRole('dialog').getByRole('link', { name: 'App content overview', exact: true }).click();
    await expect(page.getByRole('dialog').getByRole('heading', { name: 'Leave without saving?' })).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: 'Leave without saving', exact: true }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page.getByRole('heading', { name: 'App content', exact: true })).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(output, 'app-content-mobile.png'), fullPage: true });
    await page.getByRole('button', { name: 'Switch to dark mode' }).click();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await page.screenshot({ path: path.join(output, 'app-content-dark.png'), fullPage: true });
    if (errors.length) throw new Error(errors.join('\n'));
    fs.writeFileSync(path.join(output, 'browser-qa.json'), JSON.stringify({ passed: true, isolatedApi: true, realDataChanged: false, checks: ['canvas selection', 'live text and typography', 'icon selection', 'image crop/upload', 'light/dark', 'unsaved screen-switch recovery', 'save failure/retry', 'save/validate/publish', '390px viewport', 'keyboard focus', 'native home controls', 'Lottie upload and preview', 'multiple card/banner animations', 'renderer-5 publication', 'app content sidebar and overview', 'trending load failure and retry', 'trending publication preserves existing banner', '320/390/768px navigation', 'drawer Escape and trigger focus', 'unsaved sidebar cancellation', 'explicit discard through mobile menu', 'reduced motion drawer opacity'], generation, publishCount, showcaseSaves, overflow }, null, 2));
    console.log('PASS: visual editor browser workflow, image crop, failure recovery, publication, themes and narrow viewport.');
    await context.close();
  } catch (error) {
    for (const context of browser.contexts()) for (const page of context.pages()) await page.screenshot({ path: path.join(output, 'failure.png'), fullPage: true }).catch(() => {});
    throw error;
  } finally { await browser.close(); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
