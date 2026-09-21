// Generates editable canvas templates only. Publication uses the admin JSON flow.
const fs = require('node:fs');
const path = require('node:path');

const photo = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1080&q=85`;
const groups = [
  { category: 'Food', business: 'Your Kitchen', cta: 'ORDER NOW', offers: [
    ['Ember Pizza Night', 'PIZZA\nNIGHT', 'Fresh from the oven', 'photo-1513104890138-7c749659a591', 349, 499, '#7A201F', '#F6C85F', '#FFF4DC'],
    ['Brew Break', 'BREW\nBREAK', 'Coffee and a little pause', 'photo-1495474472287-4d71bcdd2085', 149, 199, '#3C2926', '#DBAD75', '#F6EFE3'],
    ['Garden Fresh Bowl', 'FRESH\nEVERY DAY', 'A colourful bowl of goodness', 'photo-1547592180-85f173990554', 249, 349, '#244D38', '#D1DE91', '#F4F6E9'],
    ['Burger Weekend', 'BURGER\nWEEKEND', 'Big flavour in every bite', 'photo-1568901346375-23c9450c58cd', 199, 299, '#922E19', '#FFC443', '#FFF2D9'],
    ['Sweet Treats', 'SWEET\nLITTLE JOYS', 'Make room for dessert', 'photo-1551024506-0bccd828d307', 179, 249, '#592F48', '#F4B6BF', '#FFF0F2'],
    ['Family Table', 'GOOD FOOD.\nGREAT COMPANY.', 'Bring everyone to the table', 'photo-1512058564366-18510be2db19', 699, 999, '#125450', '#F1CA83', '#F3F7EC'],
  ] },
  { category: 'Fashion', business: 'Your Style Studio', cta: 'SHOP THE LOOK', offers: [
    ['Everyday Edit', 'THE\nEVERYDAY EDIT', 'Easy pieces. Your own style.', 'photo-1445205170230-053b83016050', 999, 1499, '#303C35', '#D7B58C', '#F6F0E6'],
    ['Streetwear Drop', 'OWN\nYOUR STREET', 'Fresh fits for your rotation', 'photo-1523381210434-271e8be1f52b', 799, 1199, '#222235', '#C0ED62', '#F0F1E9'],
    ['Boutique Collection', 'A LITTLE\nEVERYDAY LUXE', 'Find your next favourite', 'photo-1441986300917-64674bd600d8', 1999, 2999, '#3E2A40', '#D0AB87', '#F7ECE7'],
    ['Sneaker Weekend', 'STEP\nINTO NEW', 'Your next everyday pair', 'photo-1542291026-7eec264c27ff', 1499, 2199, '#B03026', '#FFD087', '#FFF1DC'],
    ['Wardrobe Refresh', 'NEW\nSEASON ENERGY', 'Pieces that go your way', 'photo-1445205170230-053b83016050', 1299, 1899, '#263347', '#ACD6E8', '#EDF2F4'],
    ['Signature Basics', 'LESS FUSS.\nMORE STYLE.', 'Build a wardrobe you love', 'photo-1523381210434-271e8be1f52b', 599, 899, '#4C453F', '#E5BD93', '#FBF7EF'],
  ] },
  { category: 'Shopping', business: 'Your Local Store', cta: 'SHOP NOW', offers: [
    ['Neighbourhood Finds', 'GREAT\nLOCAL FINDS', 'Your favourites, closer to home', 'photo-1441986300917-64674bd600d8', 499, 699, '#164E63', '#F3C969', '#F5F3E7'],
    ['Bag Boutique', 'CARRY\nSOMETHING NEW', 'A bag for every kind of day', 'photo-1548036328-c9fa89d128fa', 1299, 1899, '#3A2931', '#E5AD94', '#FFF0E6'],
    ['Watch Edit', 'MAKE\nTIME YOURS', 'Everyday detail, timeless style', 'photo-1523275335684-37898b6baf30', 1499, 2199, '#243A40', '#C8AB72', '#F2F0E7'],
    ['Shoe Store Special', 'FIND YOUR\nNEXT PAIR', 'Comfort that keeps up', 'photo-1542291026-7eec264c27ff', 999, 1499, '#7D3329', '#F3CF69', '#FFF4DB'],
    ['Weekend Store Sale', 'WEEKEND\nWORTH SHOPPING', 'Discover something you love', 'photo-1441986300917-64674bd600d8', 799, 1099, '#2E3451', '#F4A99A', '#F3F0F6'],
    ['Everyday Essentials', 'SMALL FINDS.\nBIG DELIGHT.', 'Refresh your everyday favourites', 'photo-1523381210434-271e8be1f52b', 399, 599, '#3E5144', '#D9D28E', '#F8F5EA'],
  ] },
  { category: 'Gym', business: 'Your Fitness Club', cta: 'JOIN NOW', offers: [
    ['Fresh Start Fitness', 'YOUR\nFRESH START', 'Make time for your next move', 'photo-1534438327276-14e5300c3a48', 1499, 1999, '#263A31', '#C2EC7B', '#F3F6EA'],
    ['Strength Club', 'BUILD\nYOUR STRONG', 'Show up. Move forward.', 'photo-1517836357463-d25dfeac3438', 1999, 2999, '#252B31', '#FFBE63', '#F0F1ED'],
    ['Mindful Movement', 'BREATHE.\nMOVE. REPEAT.', 'A little space for yourself', 'photo-1544367567-0f2fcb009e0b', 999, 1499, '#374D47', '#C3D5B2', '#F7F5E9'],
    ['Training Partner', 'MAKE EVERY\nSESSION COUNT', 'Find your rhythm with coaching', 'photo-1571019613454-1cb2f99b2d8b', 2499, 3499, '#293749', '#A0D4E5', '#F0F6F7'],
    ['The Fitness Pass', 'MORE\nMOVE IN YOU', 'Your next workout starts here', 'photo-1534438327276-14e5300c3a48', 3999, 5499, '#292D27', '#D8ED6A', '#F6F7E9'],
    ['Studio Sessions', 'FIND\nYOUR FLOW', 'Movement that fits your day', 'photo-1544367567-0f2fcb009e0b', 1299, 1799, '#643D42', '#EDC1A2', '#FBF0E8'],
  ] },
  { category: 'Hotels', business: 'Your Stay', cta: 'BOOK YOUR STAY', offers: [
    ['Weekend Escape', 'YOUR\nWEEKEND ESCAPE', 'A change of scene awaits', 'photo-1566073771259-6a8506099945', 2999, 3999, '#244951', '#D6B57A', '#FAF3E5'],
    ['Poolside Days', 'SLOW\nPOOL DAYS', 'Take a little time away', 'photo-1540541338287-41700207dee6', 3499, 4999, '#0E4C59', '#93DCE0', '#ECF8F5'],
    ['Boutique Hideaway', 'STAY\nSOMEWHERE SPECIAL', 'Comfort with a little character', 'photo-1551882547-ff40c63fe5fa', 3999, 5499, '#3A303C', '#D7B88B', '#FBF3E8'],
    ['City Stay', 'CHECK IN.\nSWITCH OFF.', 'Your comfortable city base', 'photo-1578683010236-d716f9a3f461', 1999, 2999, '#49433A', '#E6C47D', '#FFF6E4'],
    ['Resort Moments', 'MORE\nTIME AWAY', 'Turn a short break into a memory', 'photo-1566073771259-6a8506099945', 4499, 5999, '#2D4841', '#CAD797', '#F1F4E6'],
    ['Room for Two', 'A STAY\nTO REMEMBER', 'Make space for a shared escape', 'photo-1578683010236-d716f9a3f461', 2999, 4499, '#613F45', '#E5BDA1', '#FBF2EB'],
  ] },
  { category: 'Electronics', business: 'Your Tech Store', cta: 'EXPLORE DEAL', offers: [
    ['Sound Upgrade', 'TURN UP\nYOUR DAY', 'Your music. Your moment.', 'photo-1505740420928-5e560c06d30e', 1499, 2499, '#313440', '#F2CF65', '#F9F3E2'],
    ['Phone Refresh', 'MEET YOUR\nNEXT PHONE', 'Make everyday connections count', 'photo-1511707171634-5f897ff02aa9', 12999, 16999, '#1F3448', '#A0D5EB', '#EEF6FA'],
    ['Work Anywhere', 'YOUR NEXT\nWORKSPACE', 'Tools for the way you work', 'photo-1496181133206-80ce9b88a853', 39999, 49999, '#303C43', '#BDD8D0', '#F2F5EF'],
    ['Audio Weekend', 'FIND\nYOUR SOUND', 'Get closer to what you love', 'photo-1505740420928-5e560c06d30e', 1999, 2999, '#51384A', '#F2BAC5', '#FFF0F3'],
    ['Laptop Upgrade', 'MORE\nPOSSIBILITIES', 'For your work, study and play', 'photo-1496181133206-80ce9b88a853', 34999, 44999, '#24364A', '#B5D7FF', '#F0F4FC'],
    ['Mobile Essentials', 'A FRESH\nCONNECTION', 'Find the tech that fits you', 'photo-1511707171634-5f897ff02aa9', 9999, 12999, '#32524B', '#B6E5CE', '#F0F8EE'],
  ] },
];

const layouts = ['Editorial', 'Split', 'Luxe Frame', 'Offer Ticket', 'Bold Grid', 'Photo Story'];
const money = (value) => `₹${value.toLocaleString('en-IN')}`;
const field = (key, label, type, defaultValue, maxLength = 120) => ({ key, label, type, editable: true, required: false, optional: true, maxLength, defaultValue: String(defaultValue) });

function build(group, offer, variant, index) {
  const [name, title, description, photoId, price, original, primary, accent, paper] = offer;
  const imageUrl = photo(photoId);
  const discount = `${Math.round((1 - price / original) * 100)}% OFF`;
  const elements = [];
  const add = (id, type, x, y, width, height, rest = {}) => {
    elements.push({ id, type, x, y, width, height, zIndex: elements.length + 1, visible: true, locked: false, editable: true, ...rest });
  };
  const shape = (id, x, y, w, h, color, radius = 0, extra = {}) => add(id, 'rectangle', x, y, w, h, { backgroundColor: color, borderRadius: radius, editable: false, locked: true, ...extra });
  const circle = (id, x, y, size, color) => add(id, 'circle', x, y, size, size, { backgroundColor: color, borderRadius: size / 2, editable: false, locked: true });
  const text = (id, copy, binding, x, y, w, h, size, color, extra = {}) => add(id, 'text', x, y, w, h, {
    content: copy, text: copy, ...(binding ? { field: binding, key: binding } : {}),
    color, fontSize: size, fontFamily: 'sans-serif', fontWeight: '800', lineHeight: 1.12,
    numberOfLines: copy.includes('\n') ? 2 : 1, textAlign: 'left', textAlignVertical: 'center', ...extra,
  });
  const image = (x, y, w, h, radius = 0) => add('offer-photo', 'image', x, y, w, h, { src: imageUrl, imageUrl, field: 'imageUrls', key: 'imageUrls', resizeMode: 'cover', borderRadius: radius });
  const brand = (x, y, w, color, align = 'left') => text('business-name', group.business, 'businessName', x, y, w, 48, 30, color, { fontWeight: '700', textAlign: align });
  const heading = (x, y, w, h, size, color, extra = {}) => text('offer-title', title, 'title', x, y, w, h, size, color, extra);
  const detail = (x, y, w, color, align = 'left') => text('offer-description', description, 'description', x, y, w, 65, 29, color, { fontWeight: '400', numberOfLines: 2, textAlign: align });
  const prices = (x, y, color, smallColor, size = 66) => {
    text('offer-price', money(price), 'offerPrice', x, y, 370, 92, size, color);
    text('original-price', money(original), 'originalPrice', x + 385, y + 18, 270, 62, 36, smallColor, { fontWeight: '500', textDecorationLine: 'line-through' });
  };
  const cta = (x, y, w, bg, fg) => add('call-to-action', 'button', x, y, w, 84, { text: group.cta, content: group.cta, field: 'buttonText', key: 'buttonText', backgroundColor: bg, color: fg, borderRadius: 42, fontFamily: 'sans-serif', fontWeight: '800', fontSize: 31, lineHeight: 1.1, textAlign: 'center', textAlignVertical: 'center', numberOfLines: 1 });
  let backgroundColor = paper;

  if (variant === 0) {
    brand(70, 48, 830, primary);
    shape('brand-rule', 70, 118, 940, 3, primary);
    text('category-label', group.category.toUpperCase(), 'category', 70, 145, 900, 46, 26, primary, { letterSpacing: 5 });
    heading(70, 212, 940, 210, 90, primary);
    image(70, 452, 940, 515, 28);
    shape('offer-band', 70, 989, 940, 142, primary, 22);
    text('offer-price', money(price), 'offerPrice', 102, 1005, 400, 95, 72, paper);
    text('original-price', money(original), 'originalPrice', 500, 1027, 250, 60, 33, paper, { fontWeight: '400', textDecorationLine: 'line-through' });
    text('discount', discount, 'discount', 760, 1030, 218, 55, 32, accent, { textAlign: 'right' });
    detail(70, 1145, 940, primary);
    cta(70, 1230, 480, primary, paper);
  } else if (variant === 1) {
    backgroundColor = primary;
    image(370, 0, 710, 930);
    shape('left-panel', 0, 0, 385, 930, primary);
    brand(54, 55, 292, paper);
    shape('accent-stroke', 56, 150, 74, 8, accent, 4);
    text('category-label', group.category.toUpperCase(), 'category', 56, 194, 285, 55, 26, accent, { letterSpacing: 2 });
    text('discount', discount.replace(' ', '\n'), 'discount', 54, 358, 302, 240, 76, paper, { numberOfLines: 2 });
    text('offer-price', money(price), 'offerPrice', 54, 692, 306, 100, 58, accent);
    text('original-price', money(original), 'originalPrice', 56, 796, 302, 55, 33, paper, { textDecorationLine: 'line-through', fontWeight: '400' });
    shape('bottom-panel', 0, 930, 1080, 420, paper);
    heading(64, 966, 952, 175, 75, primary);
    detail(64, 1144, 952, primary);
    cta(64, 1230, 550, primary, paper);
  } else if (variant === 2) {
    backgroundColor = primary;
    shape('outer-frame', 30, 30, 1020, 1290, primary, 38, { borderColor: accent, borderWidth: 2 });
    brand(110, 79, 860, paper, 'center');
    text('category-label', group.category.toUpperCase(), 'category', 110, 143, 860, 44, 23, accent, { letterSpacing: 6, textAlign: 'center' });
    heading(92, 215, 896, 184, 71, paper, { fontFamily: 'serif', fontWeight: '600', textAlign: 'center' });
    image(130, 445, 820, 505, 180);
    circle('seal', 795, 862, 175, accent);
    text('discount', discount, 'discount', 812, 921, 140, 60, 30, primary, { textAlign: 'center' });
    detail(120, 990, 840, paper, 'center');
    prices(190, 1070, paper, accent, 60);
    cta(230, 1210, 620, accent, primary);
  } else if (variant === 3) {
    backgroundColor = primary;
    brand(62, 40, 940, paper);
    image(50, 128, 980, 540, 30);
    shape('ticket', 50, 628, 980, 680, paper, 30);
    shape('ticket-label', 80, 653, 405, 48, accent, 10);
    text('category-label', group.category.toUpperCase(), 'category', 96, 657, 370, 40, 24, primary, { letterSpacing: 3 });
    heading(88, 733, 900, 205, 87, primary);
    detail(88, 952, 900, primary);
    shape('ticket-rule', 88, 1042, 904, 2, primary, 0, { opacity: 0.3 });
    prices(88, 1052, primary, primary, 63);
    text('discount', discount, 'discount', 766, 1067, 226, 60, 32, primary, { textAlign: 'right' });
    cta(88, 1192, 904, primary, paper);
  } else if (variant === 4) {
    backgroundColor = primary;
    brand(68, 45, 800, paper);
    shape('top-mark', 936, 56, 76, 18, accent, 9);
    heading(68, 150, 944, 240, 90, paper);
    shape('title-rule', 68, 414, 944, 7, accent);
    image(68, 470, 606, 525, 22);
    shape('discount-panel', 698, 470, 314, 525, accent, 22);
    text('category-label', group.category.toUpperCase(), 'category', 722, 516, 266, 55, 24, primary, { textAlign: 'center', letterSpacing: 1 });
    text('discount', discount.replace(' ', '\n'), 'discount', 722, 641, 266, 217, 72, primary, { textAlign: 'center', numberOfLines: 2 });
    detail(68, 1015, 944, paper);
    prices(68, 1094, paper, accent, 62);
    cta(68, 1220, 944, accent, primary);
  } else {
    image(0, 0, 1080, 864);
    shape('brand-pill', 58, 52, 704, 80, primary, 40);
    brand(86, 67, 646, paper);
    shape('story-panel', 0, 786, 1080, 564, paper, 0);
    shape('story-accent', 64, 827, 68, 7, primary);
    text('category-label', group.category.toUpperCase(), 'category', 154, 809, 560, 47, 25, primary, { letterSpacing: 3 });
    circle('discount-seal', 820, 701, 200, primary);
    text('discount', discount, 'discount', 840, 770, 160, 62, 34, paper, { textAlign: 'center' });
    heading(64, 885, 950, 175, 70, primary);
    detail(64, 1070, 950, primary);
    text('offer-price', money(price), 'offerPrice', 64, 1171, 354, 92, 60, primary);
    text('original-price', money(original), 'originalPrice', 64, 1270, 330, 45, 30, primary, { textDecorationLine: 'line-through', fontWeight: '400' });
    cta(494, 1190, 520, primary, paper);
  }
  const dynamicFields = { title, description, category: group.category, businessName: group.business, imageUrls: imageUrl, offerPrice: money(price), originalPrice: money(original), discount, buttonText: group.cta };
  return {
    name, slug: `ny36-${group.category.toLowerCase()}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    category: group.category, description: `${layouts[variant]} poster with editable offer text, price and photo.`,
    primaryColor: primary, secondaryColor: accent, layout: 'center', avatarId: 'avatar-01',
    editableFields: [
      field('title', 'Offer headline', 'text', title, 48),
      field('description', 'Offer description', 'text', description, 90),
      field('businessName', 'Business name', 'text', group.business, 60),
      field('imageUrls', 'Offer photo', 'image', imageUrl, 5000),
      field('offerPrice', 'Offer price', 'text', money(price), 20),
      field('originalPrice', 'Original price', 'text', money(original), 20),
      field('discount', 'Discount label', 'text', discount, 16),
      field('buttonText', 'Button text', 'text', group.cta, 26),
      { ...field('category', 'Category', 'text', group.category, 40), editable: false },
    ],
    dynamicFields, allowColorChange: true, allowLayoutChange: false, allowAvatarChange: false,
    isActive: true, sortOrder: 200 + index,
    metadata: { pack: 'local-business-36-v1', composition: layouts[variant], defaultPricesAreExamples: true },
    canvas: { width: 1080, height: 1350, backgroundColor, background: { type: 'solid', color: backgroundColor }, elements },
  };
}

const pack = groups.flatMap((group, groupIndex) => group.offers.map((offer, index) => build(group, offer, index, groupIndex * 6 + index)));
const output = path.resolve(__dirname, '../src/data/local-business-36-template-pack.json');
fs.writeFileSync(output, `${JSON.stringify(pack, null, 2)}\n`, 'utf8');
console.log(`Created ${pack.length} templates: ${groups.map(({ category }) => `${category}: 6`).join(', ')}`);
