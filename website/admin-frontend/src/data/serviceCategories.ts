export type AppServiceCategoryPreset = {
  name: string;
  slug: string;
  description: string;
  icon: string;
  imageUrl: string;
  basePrice: number;
  priceUnit: 'fixed' | 'hourly' | 'inspection';
  isActive: boolean;
  sortOrder: number;
};

// The service catalogue shown in the mobile app. These are only presets for
// the admin bulk-add action; the saved records remain fully editable/deletable.
const namesAndIcons: Array<[string, string]> = [
  ['AC Repairing & Service', 'air-conditioner'],
  ['Ambulance Service', 'ambulance'],
  ['Animal Rescue NGOs', 'dog-side'],
  ['Baby & Mom Maalish', 'baby-face-outline'],
  ['Art & Music Classes', 'palette-outline'],
  ['Bird Netting & Invisible Grill', 'grid'],
  ['Carpenter', 'hammer-screwdriver'],
  ['Catering Service', 'silverware-fork-knife'],
  ['Courier Service', 'package-variant-closed'],
  ['Decoration & Events Service', 'party-popper'],
  ['Deep Cleaning', 'broom'],
  ['Driving School & RTO', 'car-arrow-right'],
  ['Electrician', 'power-plug'],
  ['Electronics Repairing', 'television-shimmer'],
  ['Fashion Designer', 'tape-measure'],
  ['Fire Brigade', 'fire-truck'],
  ['Gardner Home Service', 'flower'],
  ['Gas Repairing Home Visit', 'stove'],
  ['Graphic Designer', 'palette-outline'],
  ['Insurance & Investment Advisor', 'hand-heart'],
  ['Interior Designer', 'home-edit-outline'],
  ['Iron, Steel & Aluminum Fabrication', 'saw-blade'],
  ['Key maker Home Visit', 'key-chain'],
  ['Laundry Pick n Drop', 'washing-machine'],
  ['Mahendi Artist Home Service', 'hand'],
  ['Makeup & Hairstyle Home Visit', 'face-woman-shimmer'],
  ['Mangal Kendra Nearby', 'home-heart'],
  ['Mirror & Glass Work', 'mirror'],
  ['Mistri Services', 'wall'],
  ['Movers and Packers', 'truck'],
  ['Nurse Home Service', 'nurse'],
  ['Painter Services', 'format-paint'],
  ['Pandit Ji', 'hands-pray'],
  ['Parlor Home Service', 'face-woman'],
  ['Pest Control', 'bug-outline'],
  ['Photography Service', 'camera'],
  ['Plumber', 'pipe-wrench'],
  ['Police & Cyber Police', 'police-badge-outline'],
  ['POP Work', 'trowel'],
  ['Snake Rescue', 'snake'],
  ['Stage Artists', 'microphone'],
  ['Tarot, Astrology & Healing Services', 'cards-outline'],
  ['Railway Ticket Agent', 'train'],
  ['Tiffin Service', 'food'],
  ['Tours & Travels', 'airplane'],
  ['Tuition & Coaching (Academic)', 'teach'],
  ['Water Filter Service & Repairing', 'water-filter'],
  ['Water Proofing Service', 'home-flood'],
  ['Weight Loss/Gain Consultant', 'scale-bathroom'],
  ['Yoga & Fitness', 'yoga'],
];

const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export const APP_SERVICE_CATEGORY_PRESETS: AppServiceCategoryPreset[] = namesAndIcons.map(([name, icon], index) => ({
  name,
  slug: slugify(name),
  description: '',
  icon,
  imageUrl: '',
  basePrice: 0,
  priceUnit: 'inspection',
  isActive: true,
  sortOrder: index,
}));
