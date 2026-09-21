const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../src/screens/post/CreateOfferScreen.tsx'), 'utf8');
const ast = ts.createSourceFile('create-offer.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

// Source of the production effect that reserves scroll room for the Android keyboard.
function findKeyboardEffect() {
  let effect;
  (function visit(node) {
    if (ts.isCallExpression(node) && node.expression.getText(ast) === 'useEffect' && node.arguments[0].getText(ast).includes('keyboardDidShow')) effect = node.arguments[0].getText(ast);
    ts.forEachChild(node, visit);
  })(ast);
  assert.ok(effect, 'keyboard useEffect');
  return ts.transpileModule('(' + effect + ')', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
}

// Runs the production effect against a fake keyboard and a fake ScrollView placed at `scrollBox` in the window.
function mount({ os = 'android', scrollBox = { y: 100, height: 700 }, hasNativeRef = true } = {}) {
  const handlers = {};
  const removed = [];
  const insets = [];
  let reveals = 0;
  const node = { measureInWindow: (done) => done(0, scrollBox.y, 360, scrollBox.height) };
  const context = {
    Platform: { OS: os },
    Keyboard: { addListener: (name, handler) => { handlers[name] = handler; return { remove: () => removed.push(name) }; } },
    scrollRef: { current: { getNativeScrollRef: () => (hasNativeRef ? node : null) } },
    setKeyboardInset: (value) => insets.push(value),
    revealFocusedInput: () => { reveals += 1; },
  };
  const cleanup = vm.runInNewContext(findKeyboardEffect(), context)();
  return { handlers, removed, insets, cleanup, reveals: () => reveals };
}

test('keyboard overlaying the form adds exactly the covered height as scroll room', () => {
  // ScrollView spans y 100..800 in the window; the keyboard top is at 500, so 300px are covered.
  const { handlers, insets, reveals } = mount();
  handlers.keyboardDidShow({ endCoordinates: { screenY: 500, height: 300 } });
  assert.deepEqual(insets, [300]);
  assert.equal(reveals(), 1, 'focused field is re-revealed once there is room to scroll');
});

test('no extra room is added when the window was already resized above the keyboard', () => {
  const { handlers, insets } = mount({ scrollBox: { y: 100, height: 380 } });
  handlers.keyboardDidShow({ endCoordinates: { screenY: 500, height: 300 } });
  assert.deepEqual(insets, [0]);
});

test('scroll room is released when the keyboard hides', () => {
  const { handlers, insets } = mount();
  handlers.keyboardDidShow({ endCoordinates: { screenY: 500, height: 300 } });
  handlers.keyboardDidHide();
  assert.deepEqual(insets, [300, 0]);
});

test('a keyboard height change while open updates the scroll room', () => {
  const { handlers, insets } = mount();
  handlers.keyboardDidShow({ endCoordinates: { screenY: 500, height: 300 } });
  handlers.keyboardDidShow({ endCoordinates: { screenY: 420, height: 380 } });
  assert.deepEqual(insets, [300, 380]);
});

test('falls back to the keyboard height when the scroll view cannot be measured', () => {
  const { handlers, insets } = mount({ hasNativeRef: false });
  handlers.keyboardDidShow({ endCoordinates: { screenY: 500, height: 300 } });
  assert.deepEqual(insets, [300]);
});

test('iOS is left to KeyboardAvoidingView and gets no listeners', () => {
  const { handlers } = mount({ os: 'ios' });
  assert.deepEqual(Object.keys(handlers), []);
});

test('both keyboard listeners are removed on unmount', () => {
  const { cleanup, removed } = mount();
  cleanup();
  assert.deepEqual(removed.slice().sort(), ['keyboardDidHide', 'keyboardDidShow']);
});
