const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const frontendRoot = path.resolve(__dirname, '../../frontend/src');
const read = (relativePath) => fs.readFileSync(path.join(frontendRoot, relativePath), 'utf8');

test('TC_04: FAQs opens the registered in-app FAQ destination instead of the dead URL', () => {
  const help = read('screens/profile/HelpSupportScreen.tsx');
  const navigator = read('navigation/ProfileNavigator.tsx');

  assert.match(help, /label="FAQs"[\s\S]+navigation\.navigate\('Faq'\)/);
  assert.doesNotMatch(help, /anywork\.app\/help/);
  assert.match(navigator, /name="Faq" component=\{FaqScreen\}/);
});

test('TC_04: FAQ content scrolls, navigates back, uses managed content, and has an offline fallback', () => {
  const faq = read('screens/profile/FaqScreen.tsx');
  const settings = read('services/settings.ts');

  assert.match(faq, /<ScrollView/);
  assert.match(faq, /navigation\.goBack\(\)/);
  assert.match(faq, /remoteSettings\.faq\?\.trim\(\)/);
  assert.match(faq, /FALLBACK_FAQS\.map/);
  assert.match(settings, /faq\?: string/);
  assert.doesNotMatch(faq, /WebView|Linking\.openURL/);
});
