import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '@/api/hyperlocal';

// ---- Cities ----
export const useCitiesList = () => useQuery({ queryKey: ['cities'], queryFn: api.listCities });
export const useCreateCity = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: api.createCity, onSuccess: () => qc.invalidateQueries({ queryKey: ['cities'] }) });
};
export const useUpdateCity = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: unknown }) => api.updateCity(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cities'] }),
  });
};

// ---- Service categories ----
export const useCategoriesList = () => useQuery({ queryKey: ['service-categories'], queryFn: api.listCategories });
export const useCreateCategory = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: api.createCategory, onSuccess: () => qc.invalidateQueries({ queryKey: ['service-categories'] }) });
};
export const useUpdateCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: unknown }) => api.updateCategory(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['service-categories'] }),
  });
};

// ---- Plans ----
export const usePlansList = () => useQuery({ queryKey: ['plans'], queryFn: api.listPlans });
export const useCreatePlan = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: api.createPlan, onSuccess: () => qc.invalidateQueries({ queryKey: ['plans'] }) });
};
export const useUpdatePlan = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: unknown }) => api.updatePlan(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plans'] }),
  });
};

// ---- Workers ----
export const useWorkersList = (filters: object) =>
  useQuery({ queryKey: ['workers', filters], queryFn: () => api.listWorkers(filters) });
export const useProviderApplicationsList = (filters: object) =>
  useQuery({ queryKey: ['provider-applications', filters], queryFn: () => api.listProviderApplications(filters) });
export const useApproveProviderApplication = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, password }: { id: string; password: string }) => api.approveProviderApplication(id, password), onSuccess: () => { qc.invalidateQueries({ queryKey: ['provider-applications'] }); qc.invalidateQueries({ queryKey: ['workers'] }); } });
};
export const useRejectProviderApplication = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, reason }: { id: string; reason: string }) => api.rejectProviderApplication(id, reason), onSuccess: () => qc.invalidateQueries({ queryKey: ['provider-applications'] }) });
};
export const useCreateWorker = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: api.createWorker, onSuccess: () => qc.invalidateQueries({ queryKey: ['workers'] }) });
};
export const useUpdateWorker = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: unknown }) => api.updateWorker(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workers'] }),
  });
};

// ---- Businesses ----
export const useBusinessesList = (filters: object) =>
  useQuery({ queryKey: ['businesses', filters], queryFn: () => api.listBusinesses(filters) });
export const useModerateBusiness = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: unknown }) => api.moderateBusiness(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['businesses'] }),
  });
};

// ---- Offers ----
export const useOffersList = (filters: object) =>
  useQuery({ queryKey: ['offers', filters], queryFn: () => api.listOffers(filters) });
export const useModerateOffer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: unknown }) => api.moderateOffer(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['offers'] }),
  });
};

// ---- Offer templates ----
export const useOfferTemplatesList = () => useQuery({ queryKey: ['offer-templates'], queryFn: api.listOfferTemplates });
export const useCreateOfferTemplate = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: api.createOfferTemplate, onSuccess: () => qc.invalidateQueries({ queryKey: ['offer-templates'] }) });
};
export const useUpdateOfferTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: unknown }) => api.updateOfferTemplate(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['offer-templates'] }),
  });
};
export const useDeleteOfferTemplate = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: api.deleteOfferTemplate, onSuccess: () => qc.invalidateQueries({ queryKey: ['offer-templates'] }) });
};
export const useTemplateStickersList = () => useQuery({ queryKey: ['template-stickers'], queryFn: api.listTemplateStickers });
export const useCreateTemplateSticker = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: api.createTemplateSticker, onSuccess: () => qc.invalidateQueries({ queryKey: ['template-stickers'] }) });
};
export const useUpdateTemplateSticker = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, payload }: { id: string; payload: unknown }) => api.updateTemplateSticker(id, payload), onSuccess: () => qc.invalidateQueries({ queryKey: ['template-stickers'] }) });
};
export const useDeleteTemplateSticker = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: api.deleteTemplateSticker, onSuccess: () => qc.invalidateQueries({ queryKey: ['template-stickers'] }) });
};

// ---- Bookings ----
export const useBookingsList = (filters: object) =>
  useQuery({ queryKey: ['bookings', filters], queryFn: () => api.listBookings(filters) });
export const useAssignWorker = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, workerId }: { id: string; workerId: string }) => api.assignWorker(id, workerId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookings'] }),
  });
};
export const useForwardBooking = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, workerIds }: { id: string; workerIds: string[] }) => api.forwardBooking(id, workerIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookings'] }),
  });
};
export const useUpdateBookingStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, finalPrice }: { id: string; status: string; finalPrice?: number }) =>
      api.updateBookingStatus(id, status, finalPrice),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookings'] }),
  });
};

// ---- Payments ----
export const usePaymentsList = (filters: object) =>
  useQuery({ queryKey: ['commerce-payments', filters], queryFn: () => api.listPayments(filters) });
export const useVerifyPayment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, providerPaymentId }: { id: string; providerPaymentId: string }) =>
      api.verifyPayment(id, providerPaymentId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['commerce-payments'] }),
  });
};
export const useRefundPayment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => api.refundPayment(id, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['commerce-payments'] }),
  });
};
