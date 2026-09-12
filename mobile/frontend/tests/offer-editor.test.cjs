const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../src/screens/post/OfferDesignEditorScreen.tsx'), 'utf8');
const ast = ts.createSourceFile('editor.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
// Execute the production handlers with isolated state and service boundaries.
function handler(name, context) {
  let expression;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === name) {
      expression = node.initializer;
      if (ts.isCallExpression(expression) && expression.expression.getText(ast) === 'useCallback') expression = expression.arguments[0];
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert.ok(expression, name);
  const code = ts.transpileModule('(' + expression.getText(ast) + ')', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return vm.runInNewContext(code, context);
}

test('rotation changes only editor layout through repeated round trips', () => {
  let landscape = false;
  const rotate = handler('applyOrientation', { setEditorLandscape: value => { landscape = value; } });
  for (let i = 0; i < 10; i++) {
    rotate('horizontal');
    assert.equal(landscape, true);
    rotate('vertical');
    assert.equal(landscape, false);
  }
});

test('drag commits canonical design coordinates and preserves other layers', () => {
  let design = { canvas: { width: 1080, height: 1920, elements: [
    { id: 'text', x: 20, y: 30, position: { x: 100, y: 200 }, width: 200, height: 100 },
    { id: 'image', x: 500, y: 800, width: 300, height: 300 },
  ] } };
  const image = design.canvas.elements[1];
  const move = handler('moveCanvasElement', { setCardDesign: update => { design = update(design); } });
  move('text', { x: 50, y: 75 });
  assert.equal(design.canvas.elements[0].x, 150);
  assert.equal(design.canvas.elements[0].y, 275);
  assert.equal(design.canvas.elements[0].position.x, 150);
  assert.equal(design.canvas.elements[1], image);
  move('text', { x: 9999, y: -9999 });
  assert.equal(design.canvas.elements[0].x, 880);
  assert.equal(design.canvas.elements[0].y, 0);
});

test('resize persists dimensions and text font size', () => {
  let design = { canvas: { width: 1080, height: 1920, elements: [{ id: 'text', x: 100, y: 200, width: 200, height: 100, fontSize: 40 }] } };
  const resize = handler('resizeCanvasElement', { setCardDesign: update => { design = update(design); } });
  resize('text', 1.5);
  const element = design.canvas.elements[0];
  assert.equal(element.width, 300);
  assert.equal(element.size.width, 300);
  assert.equal(element.fontSize, 60);
  assert.equal(element.position.x, element.x);
});

function saveContext(save) {
  const calls = [];
  const context = {
    continueInFlightRef: { current: false }, loading: false,
    business: { _id: 'business-test' }, currentUser: { id: 'user-test' },
    creationId: { current: 'creation-test' }, title: 'Offer test', category: 'Test',
    activeTemplate: undefined, cardDesign: { templateId: 'custom', canvas: { elements: [] } },
    imageUrls: [], description: 'Details', Keyboard: { dismiss() {} },
    setLoading(value) { calls.push(['loading', value]); },
    saveOfferDesignCreation: save,
    continueToDetails() { calls.push(['continue']); },
    Alert: { alert(...args) { calls.push(['alert', ...args]); } },
  };
  return { context, calls };
}

test('Save awaits existing storage before continuing and retains design', async () => {
  let stored;
  const { context, calls } = saveContext(async (user, creation) => { stored = { user, creation }; });
  await handler('saveCreation', context)();
  assert.equal(stored.user, 'user-test');
  assert.equal(stored.creation.design, context.cardDesign);
  assert.ok(calls.some(call => call[0] === 'continue'));
});

test('storage failure keeps edits and allows retry without navigation', async () => {
  const { context, calls } = saveContext(async () => { throw Error('disk full'); });
  await handler('saveCreation', context)();
  assert.equal(context.continueInFlightRef.current, false);
  assert.ok(calls.some(call => call[0] === 'alert'));
  assert.ok(!calls.some(call => call[0] === 'continue'));
});
