/**
 * Each page has one large card followed by up to two small cards. The next
 * page promotes the first small card and moves the former large card into a
 * small slot. Every offer becomes the large card once per cycle.
 */
export const buildHeroRotationPages = <T,>(offers: T[]): T[][] => offers.map((_, index) => {
  const page = [offers[index]];
  if (offers.length > 1) page.push(offers[(index + 1) % offers.length]);
  if (offers.length > 2) page.push(offers[(index - 1 + offers.length) % offers.length]);
  return page;
});
