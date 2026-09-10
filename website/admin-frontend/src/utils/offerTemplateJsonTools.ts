const SUPPORTED_ELEMENT_TYPES = new Set([
  'text', 'image', 'shape', 'rectangle', 'circle', 'line', 'button', 'badge', 'icon', 'divider', 'group',
]);

const BINDING_PATTERN = /^[a-zA-Z][a-zA-Z0-9_.-]{0,59}$/;

export const isTemplateJsonObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export const getTemplateJsonEntries = (parsed: unknown): unknown[] => {
  if (Array.isArray(parsed)) return parsed;
  if (isTemplateJsonObject(parsed) && Array.isArray(parsed.templates)) return parsed.templates;
  if (isTemplateJsonObject(parsed) && isTemplateJsonObject(parsed.template)) return [parsed.template];
  return [parsed];
};

const templateLabel = (value: Record<string, unknown>, index: number) =>
  typeof value.name === 'string' && value.name.trim() ? `“${value.name.trim()}”` : String(index + 1);

const elementContent = (element: Record<string, unknown>) =>
  isTemplateJsonObject(element.content) ? element.content : {};

const elementBinding = (element: Record<string, unknown>) => {
  const content = elementContent(element);
  return typeof element.field === 'string' ? element.field
    : typeof element.key === 'string' ? element.key
      : typeof content.field === 'string' ? content.field
        : typeof content.key === 'string' ? content.key
          : '';
};

export const assertSupportedInputElementTypes = (value: unknown, index: number) => {
  if (!isTemplateJsonObject(value) || !isTemplateJsonObject(value.canvas) || !Array.isArray(value.canvas.elements)) return;
  const label = templateLabel(value, index);
  value.canvas.elements.forEach((element, elementIndex) => {
    if (!isTemplateJsonObject(element)) return;
    if (typeof element.type !== 'string' || !SUPPORTED_ELEMENT_TYPES.has(element.type)) {
      throw new Error(`Template ${label}: element ${elementIndex + 1} has an unsupported type.`);
    }
  });
};

export const assertPublishableTemplateJson = (value: unknown, index: number) => {
  if (!isTemplateJsonObject(value)) throw new Error(`Template ${index + 1} must be a JSON object.`);
  const label = templateLabel(value, index);

  // Existing legacy starters intentionally predate canvas JSON and render from
  // previewUrl/colors. Keep that established import path valid.
  if (value.canvas === undefined || value.canvas === null) {
    if (typeof value.previewUrl !== 'string' || !value.previewUrl.trim()) {
      throw new Error(`Template ${label}: canvas with elements is required.`);
    }
    return;
  }
  if (!isTemplateJsonObject(value.canvas)) throw new Error(`Template ${label}: canvas must be an object.`);

  const canvas = value.canvas;
  if (typeof canvas.width !== 'number' || !Number.isFinite(canvas.width) || canvas.width <= 0
    || typeof canvas.height !== 'number' || !Number.isFinite(canvas.height) || canvas.height <= 0) {
    throw new Error(`Template ${label}: canvas width and height must be positive numbers.`);
  }
  if (!Array.isArray(canvas.elements)) throw new Error(`Template ${label}: canvas.elements must be an array.`);

  const fieldKeys = new Set<string>();
  if (Array.isArray(value.editableFields)) {
    value.editableFields.forEach((field) => {
      if (isTemplateJsonObject(field) && typeof field.key === 'string') fieldKeys.add(field.key);
    });
  }
  if (isTemplateJsonObject(value.dynamicFields)) Object.keys(value.dynamicFields).forEach((key) => fieldKeys.add(key));

  const ids = new Set<string>();
  canvas.elements.forEach((element, elementIndex) => {
    if (!isTemplateJsonObject(element)) throw new Error(`Template ${label}: element ${elementIndex + 1} must be an object.`);
    const item = `Template ${label}: element ${elementIndex + 1}`;
    if (typeof element.id !== 'string' || !element.id.trim()) throw new Error(`${item} needs an id.`);
    if (ids.has(element.id)) throw new Error(`${item} duplicates id “${element.id}”.`);
    ids.add(element.id);
    if (typeof element.type !== 'string' || !SUPPORTED_ELEMENT_TYPES.has(element.type)) throw new Error(`${item} has an unsupported type.`);
    if (typeof element.editable !== 'boolean') throw new Error(`${item} needs editable: true or editable: false.`);

    const position = isTemplateJsonObject(element.position) ? element.position : element;
    const size = isTemplateJsonObject(element.size) ? element.size : element;
    for (const [key, candidate] of [['x', position.x], ['y', position.y], ['width', size.width], ['height', size.height]] as const) {
      if (typeof candidate !== 'number' || !Number.isFinite(candidate)) throw new Error(`${item} needs a numeric ${key}.`);
      if ((key === 'width' || key === 'height') && candidate <= 0) throw new Error(`${item} needs a positive ${key}.`);
      if ((key === 'x' || key === 'y') && candidate < 0) throw new Error(`${item} needs a non-negative ${key}.`);
    }

    const content = elementContent(element);
    const binding = elementBinding(element);
    if (binding && !BINDING_PATTERN.test(binding)) throw new Error(`${item} has an invalid field/key binding.`);
    if (typeof element.field === 'string' && typeof element.key === 'string' && element.field !== element.key) {
      throw new Error(`${item} field and key bindings must match.`);
    }
    if (binding && !fieldKeys.has(binding)) throw new Error(`${item} binds “${binding}” but no matching editable/dynamic field exists.`);

    if (element.type === 'image') {
      const src = [element.src, element.imageUrl, content.src, content.imageUrl].find((candidate) => typeof candidate === 'string' && candidate.trim());
      if (!src && !binding) throw new Error(`${item} needs src/imageUrl or an image field binding.`);
    } else if (['text', 'button', 'badge', 'icon'].includes(element.type)) {
      const text = [element.text, typeof element.content === 'string' ? element.content : undefined, content.text]
        .find((candidate) => typeof candidate === 'string' && candidate.trim());
      if (!text && !binding) throw new Error(`${item} needs text/content or a field binding.`);
    }
  });

  const hasArtwork = canvas.elements.length > 0
    || (typeof canvas.backgroundImageUrl === 'string' && canvas.backgroundImageUrl.trim().length > 0)
    || (typeof value.previewUrl === 'string' && value.previewUrl.trim().length > 0);
  if (!hasArtwork) throw new Error(`Template ${label} is blank. Add canvas elements, a canvas backgroundImageUrl, or a previewUrl before publishing.`);
};

export const formatTemplateJson = (input: string) => JSON.stringify(JSON.parse(input) as unknown, null, 2);

const firstTemplateObject = (parsed: unknown): Record<string, unknown> | null => {
  const first = getTemplateJsonEntries(parsed)[0];
  return isTemplateJsonObject(first) ? first : null;
};

export const insertAssetIntoTemplateJson = (input: string, assetUrl: string, fallbackTemplate: unknown) => {
  const parsed = input.trim() ? JSON.parse(input) as unknown : JSON.parse(JSON.stringify(fallbackTemplate)) as unknown;
  const template = firstTemplateObject(parsed);
  if (!template || !isTemplateJsonObject(template.canvas) || !Array.isArray(template.canvas.elements)) {
    throw new Error('Load or paste a canvas template before inserting an asset.');
  }
  const canvas = template.canvas;
  const elements = canvas.elements as unknown[];
  const width = typeof canvas.width === 'number' && canvas.width > 0 ? canvas.width : 1080;
  const height = typeof canvas.height === 'number' && canvas.height > 0 ? canvas.height : 1350;
  const existingIds = new Set(elements.filter(isTemplateJsonObject).map((element) => element.id).filter((id): id is string => typeof id === 'string'));
  let suffix = elements.length + 1;
  while (existingIds.has(`asset-image-${suffix}`)) suffix += 1;
  const x = Math.round(width * 0.1);
  const y = Math.round(height * 0.25);
  const imageWidth = Math.round(width * 0.8);
  const imageHeight = Math.round(height * 0.45);
  elements.push({
    id: `asset-image-${suffix}`,
    type: 'image',
    position: { x, y },
    size: { width: imageWidth, height: imageHeight },
    src: assetUrl,
    imageUrl: assetUrl,
    zIndex: elements.length + 1,
    visible: true,
    locked: false,
    editable: true,
    resizeMode: 'contain',
  });
  return JSON.stringify(parsed, null, 2);
};

export const replaceTemplateAssetUrl = (input: string, previousUrl: string, nextUrl: string) => {
  if (!input.trim() || !previousUrl || previousUrl === nextUrl) return input;
  const replace = (value: unknown): unknown => {
    if (value === previousUrl) return nextUrl;
    if (Array.isArray(value)) return value.map(replace);
    if (isTemplateJsonObject(value)) return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, replace(child)]));
    return value;
  };
  return JSON.stringify(replace(JSON.parse(input) as unknown), null, 2);
};
