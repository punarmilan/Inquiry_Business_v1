export interface City {
  _id: string;
  name: string;
  state: string;
  slug: string;
  center: { type: 'Point'; coordinates: [number, number] };
  serviceRadiusKm: number;
  localities: string[];
  offersEnabled: boolean;
  servicesEnabled: boolean;
}

export interface Business {
  _id: string;
  name: string;
  category: string;
  description?: string;
  logoUrl?: string;
  coverImageUrl?: string;
  address: string;
  locality?: string;
  location: { type: 'Point'; coordinates: [number, number] };
  city: City | string;
  phone: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  verificationStatus: 'pending' | 'verified' | 'rejected' | 'suspended';
  verificationNote?: string;
  verificationSubmittedAt?: string;
  verifiedAt?: string | null;
  moderatedAt?: string | null;
  isActive: boolean;
  activeSubscription?: Subscription | null;
}

export interface Offer {
  _id: string;
  business: Business | string;
  businessDocument?: Business;
  city: City | string;
  title: string;
  description: string;
  category: string;
  originalPrice: number;
  offerPrice: number;
  discountPercentage: number;
  imageUrls: string[];
  cardDesign?: {
    templateId: string;
    templateVersion?: number;
    templateSource?: 'admin' | 'system' | 'custom';
    previewUrl?: string;
    canvas?: OfferTemplateCanvas;
    avatarId: string;
    primaryColor: string;
    secondaryColor: string;
    layout?: 'right' | 'left' | 'bottom' | 'center';
    customizations?: Record<string, string | number | boolean>;
    dynamicFields?: Record<string, unknown>;
    titleFontSize?: number;
    descriptionFontSize?: number;
    fontWeight?: '500' | '600' | '700' | '800' | '900';
    fontStyle?: 'normal' | 'italic';
    textAlign?: 'left' | 'center' | 'right';
  };
  startsAt: string;
  expiresAt: string;
  address: string;
  locality?: string;
  location: { type: 'Point'; coordinates: [number, number] };
  phone?: string;
  whatsapp?: string;
  terms?: string;
  status: 'pending_review' | 'approved' | 'rejected' | 'suspended';
  moderationReason?: string;
  isFeatured: boolean;
  distanceKm?: number | null;
}

export type OfferTemplateField = {
  key: string;
  label: string;
  type: 'text' | 'image' | 'number' | 'color' | 'date' | 'select';
  editable: boolean;
  required: boolean;
  optional: boolean;
  maxLength: number;
  options?: string[];
  defaultValue?: string;
};

export type OfferTemplateElement = {
  id: string;
  type: 'text' | 'image' | 'shape' | 'rectangle' | 'circle' | 'line' | 'button' | 'badge' | 'icon' | 'divider' | 'group';
  key?: string;
  field?: string;
  text?: string;
  content?: string;
  imageUrl?: string;
  src?: string;
  position?: { x: number; y: number };
  size?: { width: number; height: number };
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex?: number;
  visible?: boolean;
  locked?: boolean;
  color?: string;
  backgroundColor?: string;
  fontSize?: number;
  fontWeight?: string;
  fontFamily?: string;
  fontStyle?: 'normal' | 'italic';
  letterSpacing?: number;
  lineHeight?: number;
  numberOfLines?: number;
  textAlign?: 'left' | 'center' | 'right';
  textAlignVertical?: 'top' | 'center' | 'bottom';
  textDecorationLine?: 'none' | 'underline' | 'line-through' | 'underline line-through';
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: string;
  borderStyle?: 'solid' | 'dotted' | 'dashed';
  rotation?: number;
  opacity?: number;
  resizeMode?: 'cover' | 'contain' | 'stretch';
  editable?: boolean;
  style?: Record<string, unknown>;
};

export type OfferTemplateCanvas = {
  width: number;
  height: number;
  backgroundColor?: string;
  backgroundImageUrl?: string;
  background?: { type?: 'solid' | 'gradient' | 'linear-gradient' | 'image' | 'texture'; color?: string; from?: string; to?: string; direction?: string; angle?: number; colors?: string[]; imageUrl?: string; opacity?: number; overlayColor?: string; overlayOpacity?: number };
  overlay?: { color?: string; opacity?: number };
  elements: OfferTemplateElement[];
};

export interface OfferTemplate {
  _id: string;
  name: string;
  slug: string;
  category: string;
  description?: string;
  previewUrl?: string;
  canvas?: OfferTemplateCanvas;
  dynamicFields?: Record<string, unknown>;
  primaryColor: string;
  secondaryColor: string;
  layout: 'right' | 'left' | 'bottom' | 'center';
  avatarId: string;
  editableFields: OfferTemplateField[];
  allowColorChange: boolean;
  allowLayoutChange: boolean;
  allowAvatarChange: boolean;
  version: number;
  isActive: boolean;
  sortOrder: number;
}

export interface Plan {
  _id: string;
  name: string;
  code: string;
  description: string;
  price: number;
  billingPeriod: string;
  durationDays: number;
  offerPostingLimit: number;
  maximumActiveOffers: number;
  featuredOfferAllowance: number;
  imagesPerOffer: number;
  analyticsAccess: boolean;
}

export interface Subscription {
  _id: string;
  business: Business | string;
  plan: Plan | string;
  status: 'active' | 'expired' | 'cancelled';
  startsAt: string;
  endsAt: string;
  quota: { offerPostingLimit: number; maximumActiveOffers: number; featuredOfferAllowance: number; imagesPerOffer: number };
  usage: { offersPosted: number; featuredOffersUsed: number };
}

export interface ServiceCategory {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  imageUrl?: string;
  basePrice: number;
  priceUnit: 'fixed' | 'hourly' | 'inspection';
}

export interface ServiceProvider {
  _id: string;
  name: string;
  photoUrl?: string;
  phone?: string;
  experienceYears?: number;
  serviceAreas: string[];
  ratingAverage: number;
  ratingCount: number;
  completedBookings: number;
  availability: 'available' | 'busy' | 'offline';
  categories?: { _id: string; name: string; icon?: string; basePrice?: number; priceUnit?: string }[];
}

export interface WorkerSummary {
  _id: string;
  name: string;
  photoUrl?: string;
  phone: string;
  ratingAverage: number;
  availability: string;
}

export interface ServiceBooking {
  _id: string;
  bookingNumber: string;
  city: City;
  category: ServiceCategory;
  worker?: WorkerSummary | null;
  address: string;
  locality?: string;
  scheduleType: 'now' | 'later';
  scheduledFor: string;
  problemDescription?: string;
  priceEstimate: number;
  finalPrice?: number | null;
  status: 'requested' | 'confirmed' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  paymentStatus: 'unpaid' | 'pending' | 'paid' | 'refunded';
  rating?: { stars?: number; review?: string; ratedAt?: string };
  createdAt?: string;
  updatedAt?: string;
  statusHistory?: { status: string; at?: string; note?: string }[];
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: { total: number; page: number; limit: number; pages: number };
}
