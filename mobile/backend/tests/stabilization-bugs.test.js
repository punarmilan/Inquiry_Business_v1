const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const schemas = require('../src/validators/hyperlocal.validator');

const root = path.resolve(__dirname, '../..');
const readFrontend = (file) => fs.readFileSync(path.join(root, 'frontend/src', file), 'utf8');
const objectId = '507f1f77bcf86cd799439011';

test('business and offer validation accept structured addresses and reject 11-digit Indian numbers', () => {
  const business = { name: 'Valid Shop', cityId: objectId, category: 'Food', address: '12, Main Road, Baner, Pune', locality: 'Baner', addressDetails: { houseNo: '12', streetAddress: 'Main Road', area: 'Baner', city: 'Pune' }, latitude: 18.5, longitude: 73.8, phone: '9876543210', whatsapp: '', email: '', website: '' };
  assert.equal(schemas.createBusinessSchema.validate({ body: business }).error, undefined);
  assert.equal(schemas.updateBusinessSchema.validate({ params: { id: objectId }, body: { ...business, logoUrl: '', coverImageUrl: '' } }).error, undefined);
  assert.ok(schemas.createBusinessSchema.validate({ body: { ...business, phone: '98765432101' } }).error);
  const offer = { businessId: objectId, title: 'Valid offer', description: 'Valid offer details', category: 'Food', originalPrice: 100, offerPrice: 80, discountPercentage: 20, imageUrls: [], startsAt: new Date(Date.now() + 60_000).toISOString(), expiresAt: new Date(Date.now() + 120_000).toISOString(), address: business.address, locality: 'Baner', addressDetails: business.addressDetails, latitude: 18.5, longitude: 73.8, phone: '9876543210', whatsapp: '', terms: '' };
  assert.equal(schemas.createOfferSchema.validate({ body: offer }).error, undefined);
  assert.ok(schemas.createOfferSchema.validate({ body: { ...offer, phone: '98765432101' } }).error);
});

test('offer create/edit keeps template data separate from the business shop image', () => {
  const screen = readFrontend('screens/post/CreateOfferScreen.tsx');
  assert.doesNotMatch(screen, /setImageUrls\(\[item\.(?:coverImageUrl|logoUrl)/);
  assert.match(screen, /existingOffer\?\.cardDesign/);
  assert.match(screen, /existingOffer\?\.cardDesign\?\.canvas/);
  assert.match(screen, /filter\(\(template\) => template && typeof template === 'object'\)/);
});

test('affected forms use keyboard-aware scroll containers and booking picker unmounts', () => {
  for (const file of ['screens/post/CreateOfferScreen.tsx', 'screens/profile/AiAssistantScreen.tsx', 'screens/profile/EditProfileScreen.tsx']) {
    const source = readFrontend(file);
    assert.match(source, /KeyboardAvoidingView/);
  }
  for (const file of ['screens/post/CreateOfferScreen.tsx', 'screens/profile/EditProfileScreen.tsx']) {
    const source = readFrontend(file);
    assert.match(source, /scrollResponderScrollNativeHandleToKeyboard/);
    assert.match(source, /automaticallyAdjustKeyboardInsets/);
    assert.match(source, /keyboardShouldPersistTaps="always"/);
    assert.match(source, /keyboardDismissMode="none"/);
    assert.doesNotMatch(source, /keyboardDismissMode="on-drag"/);
    assert.doesNotMatch(source, /Platform\.OS === 'ios' \? 'padding' : 'height'/);
  }
  const booking = readFrontend('screens/services/BookServiceScreen.tsx');
  assert.match(booking, /datePickerVisible/);
  assert.match(booking, /setDatePickerVisible\(false\)/);
  assert.match(booking, /event\.type !== 'dismissed'/);
  assert.doesNotMatch(booking, /mode="datetime"/);
});

test('service booking uses real area options and verified providers carry a visible trust mark', () => {
  const booking = readFrontend('screens/services/BookServiceScreen.tsx');
  const servicesHome = readFrontend('screens/services/ServicesHomeScreen.tsx');
  const providerTypes = readFrontend('types/hyperlocal.ts');
  const serviceController = fs.readFileSync(path.join(root, 'backend/src/controllers/serviceController.js'), 'utf8');
  const applicationsPage = fs.readFileSync(path.resolve(root, '../website/admin-frontend/src/pages/hyperlocal/ProviderApplicationsPage.tsx'), 'utf8');
  const adminController = fs.readFileSync(path.resolve(root, '../website/backend/src/controllers/hyperlocalController.js'), 'utf8');

  assert.match(booking, /accessibilityLabel="Select service area"/);
  assert.match(booking, /route\.params\.availableAreas\?\.map/);
  assert.match(booking, /setAreaPickerOpen\(false\)/);
  assert.match(serviceController, /experienceYears verificationStatus/);
  assert.match(providerTypes, /verificationStatus: 'verified'/);
  assert.match(servicesHome, /accessibilityLabel="Verified provider"/);
  assert.match(servicesHome, /theme\.colors\.verified/);
  assert.match(applicationsPage, /'Verify provider'/);
  assert.match(adminController, /verificationStatus: 'verified'/);
});

test('booking chat open and message paths enforce the same lifecycle rule', () => {
  const serviceController = fs.readFileSync(path.join(root, 'backend/src/controllers/serviceController.js'), 'utf8');
  const chatController = fs.readFileSync(path.join(root, 'backend/src/controllers/chatController.js'), 'utf8');
  const chatService = fs.readFileSync(path.join(root, 'backend/src/services/chatService.js'), 'utf8');
  const socket = fs.readFileSync(path.join(root, 'backend/src/socket/index.js'), 'utf8');
  const server = fs.readFileSync(path.join(root, 'backend/src/server.js'), 'utf8');
  const bookingDetails = readFrontend('screens/services/BookingDetailsScreen.tsx');

  assert.equal((serviceController.match(/assertBookingChatAvailable\(booking\)/g) || []).length, 2);
  assert.match(chatController, /await chatService\.assertCanAccessThread/);
  assert.match(chatService, /await assertCanAccessThread\(chat, senderId\)/);
  assert.match(socket, /await chatService\.assertCanAccessThread/);
  assert.match(server, /await ensureChatIndexes\(\)/);
  assert.match(bookingDetails, /canUseBookingChat\(booking\)/);
});

test('booking chat creation remains idempotent and repairs the legacy conflicting index', () => {
  const chatService = fs.readFileSync(path.join(root, 'backend/src/services/chatService.js'), 'utf8');
  assert.match(chatService, /findOneAndUpdate\([\s\S]*?upsert: true/);
  assert.match(chatService, /error\?\.code !== 11000/);
  assert.match(chatService, /partialFilterExpression/);
  assert.match(chatService, /dropIndex\(staleJobIndex\.name\)/);
  assert.match(chatService, /Chat\.createIndexes\(\)/);
});

test('saved offers and saved locations persist explicit state as collections', () => {
  const details = readFrontend('screens/offers/OfferDetailsScreen.tsx');
  const savedLocations = readFrontend('hooks/useHyperlocalLocation.ts');
  assert.match(details, /setSaved\(result\.saved\)/);
  assert.match(details, /useFocusEffect/);
  assert.match(savedLocations, /SAVED_LOCATIONS_KEY/);
  assert.match(savedLocations, /\[next, \.\.\.saved\.filter/);
  assert.match(savedLocations, /removeSavedLocation/);
});
