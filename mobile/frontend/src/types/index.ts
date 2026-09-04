export type JobCategory = string;

export type AccountType = 'worker' | 'employer' | 'both';
export type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say';
export type EmployerKind = 'individual' | 'company';
export type ReviewStatus = 'not_started' | 'submitted' | 'verified' | 'rejected';
export type KycStatus = ReviewStatus;

export interface CategoryDocument {
  category: JobCategory;
  label: string;
  documentUrl?: string;
}

export interface WorkerProfile {
  skills?: string[];
  experienceYears?: number;
  preferredWorkCategories?: JobCategory[];
  workRadiusKm?: number;
}

export interface EmployerProfile {
  kind?: EmployerKind;
  companyName?: string;
  gstNumber?: string;
  officeAddress?: string;
  companyLogoUrl?: string;
  companyVerificationRequested?: boolean;
}

export interface KycProfile {
  status?: KycStatus;
  aadhaarCardUrl?: string;
  selfieUrl?: string;
  drivingLicenseUrl?: string;
  categoryDocuments?: CategoryDocument[];
  submittedAt?: string;
  verifiedAt?: string;
  rejectionReason?: string;
}

export interface WalletProfile {
  status?: ReviewStatus;
  upiId?: string;
  bankAccountNumber?: string;
  bankAccountHolderName?: string;
  ifscCode?: string;
  panNumber?: string;
  balance?: number;
  setupCompletedAt?: string;
  submittedAt?: string;
  verifiedAt?: string;
  rejectionReason?: string;
}

export interface AccountTypeChange {
  requestedType?: AccountType;
  status: 'none' | 'pending' | 'approved' | 'rejected';
  requestedAt?: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

export interface WalletTransaction {
  _id: string;
  type: 'credit' | 'debit';
  source: 'add_money' | 'withdrawal';
  amount: number;
  status: 'completed' | 'pending' | 'rejected';
  balanceAfter: number;
  note: string;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  phone: string;
  avatar?: string;
  email?: string;
  role?: 'user' | 'staff' | 'worker' | 'admin' | 'superadmin';
  accountType?: AccountType;
  dateOfBirth?: string;
  gender?: Gender;
  languages?: string[];
  education?: string;
  currentAddress?: string;
  workerProfile?: WorkerProfile;
  employerProfile?: EmployerProfile;
  kyc?: KycProfile;
  wallet?: WalletProfile;
  accountTypeChange?: AccountTypeChange;
  verified: boolean;
  rating: number;
  jobsPosted: number;
  jobsCompleted: number;
  location?: {
    latitude: number;
    longitude: number;
    label: string;
  };
}

export interface Job {
  id: string;
  posterId: string;
  poster: {
    name: string;
    avatar: string;
    verified: boolean;
  };
  title: string;
  description: string;
  category: JobCategory;
  categoryGroup?: string;
  pay: number;
  payType: 'day' | 'hour' | 'fixed';
  location: {
    latitude: number;
    longitude: number;
    label: string;
  };
  distanceKm: number;
  durationHours: number;
  durationLabel: string;
  peopleNeeded: number;
  peopleApplied: number;
  postedAt: string; // ISO
  date: string; // ISO date for the job itself
  isToday: boolean;
  startAt: string; // ISO — same as scheduledFor, when the job begins
  endAt: string; // ISO — server-computed when available, else derived client-side
  startTimeLabel: string; // e.g. "10:00 AM"
  suggestedMinimumPrice?: number;
}

export interface CategoryMeta {
  key: JobCategory;
  label: string;
  labelKey?: string;
  groupKey?: string;
  groupName?: string;
  icon: string;
  color: string;
  kycDocumentLabel?: string;
  sortOrder?: number;
  isActive?: boolean;
}
