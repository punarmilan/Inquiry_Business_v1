import client from './client';
import type { Paginated } from '@/types';

export interface CityRecord { _id: string; name: string; state: string; slug: string; center: { coordinates: [number, number] }; serviceRadiusKm: number; localities: string[]; isActive: boolean; offersEnabled: boolean; servicesEnabled: boolean; }
export interface BusinessRecord { _id: string; name: string; category: string; phone: string; address: string; verificationStatus: string; verificationSubmittedAt?: string; verifiedAt?: string | null; verificationNote?: string; isActive: boolean; owner?: { name?: string; phone: string }; city?: CityRecord; }
export interface OfferRecord { _id: string; title: string; status: string; offerPrice: number; originalPrice: number; isFeatured: boolean; expiresAt: string; moderationReason?: string; business?: BusinessRecord; city?: CityRecord; }
export interface PlanRecord { _id: string; name: string; code: string; description: string; price: number; billingPeriod: string; durationDays: number; offerPostingLimit: number; maximumActiveOffers: number; featuredOfferAllowance: number; imagesPerOffer: number; analyticsAccess: boolean; priorityRanking: number; verificationBenefit: boolean; isActive: boolean; sortOrder: number; }
export interface CategoryRecord { _id: string; name: string; slug: string; description: string; icon: string; imageUrl: string; basePrice: number; priceUnit: string; cityAvailability: CityRecord[]; isActive: boolean; sortOrder: number; }
export interface WorkerRecord { _id: string; name: string; phone: string; categories: CategoryRecord[]; city: CityRecord; serviceAreas?: string[]; availability: string; isActive: boolean; verificationStatus: string; ratingAverage: number; completedBookings: number; user?: { _id: string; name?: string; phone: string }; }
export interface ProviderApplicationRecord { _id: string; name: string; phone: string; email?: string; city?: CityRecord; categories?: CategoryRecord[]; experienceYears: number; serviceAreas?: string[]; message?: string; status: 'pending' | 'approved' | 'rejected'; rejectionReason?: string; createdAt: string; reviewedAt?: string; approvedWorker?: WorkerRecord; }
export interface BookingRecord { _id: string; bookingNumber: string; customer?: { name?: string; phone: string }; city?: CityRecord; category?: CategoryRecord; worker?: WorkerRecord; dispatchedProviders?: { provider: string | WorkerRecord; status: string }[]; status: string; paymentStatus: string; scheduledFor: string; priceEstimate: number; finalPrice?: number; address?: string; locality?: string; }
export interface PaymentRecord { _id: string; orderId: string; type: string; amount: number; status: string; providerPaymentId?: string; user?: { name?: string; phone: string }; business?: BusinessRecord; booking?: BookingRecord; createdAt: string; }
export type TemplateFieldRecord = { key: string; label: string; type: 'text' | 'image' | 'number' | 'color' | 'date' | 'select'; editable: boolean; required: boolean; optional: boolean; maxLength: number; options?: string[]; defaultValue?: string };
export type TemplateElementType = 'text' | 'image' | 'shape' | 'button' | 'badge' | 'icon' | 'divider' | 'group';
export type TemplateElementRecord = { id: string; type: TemplateElementType; key?: string; field?: string; text?: string; content?: string; imageUrl?: string; src?: string; x: number; y: number; width: number; height: number; zIndex?: number; visible?: boolean; locked?: boolean; color?: string; backgroundColor?: string; fontSize?: number; fontWeight?: string; fontFamily?: string; fontStyle?: 'normal' | 'italic'; letterSpacing?: number; lineHeight?: number; numberOfLines?: number; textAlign?: 'left' | 'center' | 'right'; textAlignVertical?: 'top' | 'center' | 'bottom'; textDecorationLine?: 'none' | 'underline' | 'line-through' | 'underline line-through'; textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize'; borderRadius?: number; borderWidth?: number; borderColor?: string; borderStyle?: 'solid' | 'dotted' | 'dashed'; rotation?: number; opacity?: number; resizeMode?: 'cover' | 'contain' | 'stretch'; editable?: boolean; style?: Record<string, unknown> };
export type TemplateCanvasBackground = { type?: 'solid' | 'gradient' | 'image' | 'texture'; color?: string; from?: string; to?: string; direction?: string; imageUrl?: string; opacity?: number; overlayColor?: string; overlayOpacity?: number };
export type TemplateCanvasRecord = { width: number; height: number; backgroundColor?: string; backgroundImageUrl?: string; background?: TemplateCanvasBackground; overlay?: { color?: string; opacity?: number }; elements: TemplateElementRecord[] };
export interface OfferTemplateRecord {
  _id: string; name: string; slug: string; category: string; description?: string; previewUrl?: string; metadata?: unknown;
  canvas?: TemplateCanvasRecord;
  primaryColor: string; secondaryColor: string; layout: 'right' | 'left' | 'bottom' | 'center'; avatarId: string;
  editableFields: TemplateFieldRecord[]; allowColorChange: boolean; allowLayoutChange: boolean; allowAvatarChange: boolean;
  version: number; isActive: boolean; sortOrder: number; createdAt?: string; updatedAt?: string;
}
export interface TemplateStickerRecord {
  _id: string; name: string; slug: string; kind: 'image' | 'emoji'; imageUrl?: string; emoji?: string;
  sortOrder: number; isActive: boolean; createdAt?: string; updatedAt?: string;
}

const base = '/hyperlocal';
export const listCities = () => client.get<{ data: CityRecord[] }>(`${base}/cities`).then((r) => r.data.data);
export const createCity = (payload: unknown) => client.post(`${base}/cities`, payload).then((r) => r.data.city);
export const updateCity = (id: string, payload: unknown) => client.put(`${base}/cities/${id}`, payload).then((r) => r.data.city);
export const listCategories = () => client.get<{ data: CategoryRecord[] }>(`${base}/service-categories`).then((r) => r.data.data);
export const createCategory = (payload: unknown) => client.post(`${base}/service-categories`, payload).then((r) => r.data.category);
export const updateCategory = (id: string, payload: unknown) => client.put(`${base}/service-categories/${id}`, payload).then((r) => r.data.category);
export const listPlans = () => client.get<{ data: PlanRecord[] }>(`${base}/plans`).then((r) => r.data.data);
export const createPlan = (payload: unknown) => client.post(`${base}/plans`, payload).then((r) => r.data.plan);
export const updatePlan = (id: string, payload: unknown) => client.put(`${base}/plans/${id}`, payload).then((r) => r.data.plan);
export const listWorkers = (params: object = {}) => client.get<Paginated<WorkerRecord>>(`${base}/workers`, { params }).then((r) => r.data);
export const listProviderApplications = (params: object = {}) => client.get<Paginated<ProviderApplicationRecord>>(`${base}/provider-applications`, { params }).then((r) => r.data);
export const approveProviderApplication = (id: string, password: string) => client.post(`${base}/provider-applications/${id}/approve`, { password }).then((r) => r.data.application as ProviderApplicationRecord);
export const rejectProviderApplication = (id: string, reason: string) => client.post(`${base}/provider-applications/${id}/reject`, { reason }).then((r) => r.data.application as ProviderApplicationRecord);
export const createWorker = (payload: unknown) => client.post(`${base}/workers`, payload).then((r) => r.data.worker);
export const updateWorker = (id: string, payload: unknown) => client.put(`${base}/workers/${id}`, payload).then((r) => r.data.worker);
export const listBusinesses = (params: object = {}) => client.get<Paginated<BusinessRecord>>(`${base}/businesses`, { params }).then((r) => r.data);
export const moderateBusiness = (id: string, payload: unknown) => client.patch(`${base}/businesses/${id}/moderation`, payload).then((r) => r.data.business);
export const listOffers = (params: object = {}) => client.get<Paginated<OfferRecord>>(`${base}/offers`, { params }).then((r) => r.data);
export const moderateOffer = (id: string, payload: unknown) => client.patch(`${base}/offers/${id}/moderation`, payload).then((r) => r.data.offer);
export const listOfferTemplates = () => client.get<{ data: OfferTemplateRecord[] }>(`${base}/offer-templates`).then((r) => r.data.data);
export const createOfferTemplate = (payload: unknown) => client.post(`${base}/offer-templates`, payload).then((r) => r.data.template);
export const updateOfferTemplate = (id: string, payload: unknown) => client.put(`${base}/offer-templates/${id}`, payload).then((r) => r.data.template);
export const deleteOfferTemplate = (id: string) => client.delete(`${base}/offer-templates/${id}`).then((r) => r.data.template);
export const listTemplateStickers = () => client.get<{ data: TemplateStickerRecord[] }>(`${base}/stickers`).then((r) => r.data.data);
export const createTemplateSticker = (payload: unknown) => client.post(`${base}/stickers`, payload).then((r) => r.data.sticker as TemplateStickerRecord);
export const updateTemplateSticker = (id: string, payload: unknown) => client.put(`${base}/stickers/${id}`, payload).then((r) => r.data.sticker as TemplateStickerRecord);
export const deleteTemplateSticker = (id: string) => client.delete(`${base}/stickers/${id}`).then((r) => r.data.sticker as TemplateStickerRecord);
export const uploadTemplateAsset = (dataUrl: string, name?: string) => client.post(`${base}/template-assets`, { dataUrl, name }).then((r) => r.data.asset as { _id: string; name: string; mimeType: string; size: number; url: string });
export const listBookings = (params: object = {}) => client.get<Paginated<BookingRecord>>(`${base}/bookings`, { params }).then((r) => r.data);
export const assignWorker = (id: string, workerId: string) => client.patch(`${base}/bookings/${id}/assign`, { workerId }).then((r) => r.data.booking);
export const forwardBooking = (id: string, workerIds: string[]) => client.patch(`${base}/bookings/${id}/forward`, { workerIds }).then((r) => r.data.booking);
export const updateBookingStatus = (id: string, status: string, finalPrice?: number) => client.patch(`${base}/bookings/${id}/status`, { status, finalPrice }).then((r) => r.data.booking);
export const listPayments = (params: object = {}) => client.get<Paginated<PaymentRecord>>(`${base}/commerce-payments`, { params }).then((r) => r.data);
export const verifyPayment = (id: string, providerPaymentId: string) => client.post(`${base}/commerce-payments/${id}/verify`, { providerPaymentId }).then((r) => r.data.payment);
export const refundPayment = (id: string, reason: string) => client.post(`${base}/commerce-payments/${id}/refund`, { reason }).then((r) => r.data.payment);
