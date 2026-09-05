import {
  BadgeCheck,
  Bell,
  Bookmark,
  Bot,
  BriefcaseBusiness,
  CalendarClock,
  Car,
  Construction,
  GraduationCap,
  Hammer,
  IndianRupee,
  LayoutTemplate,
  MapPin,
  MessageCircle,
  Navigation,
  Paintbrush,
  PlugZap,
  Radio,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Store,
  UserRoundCheck,
  UserRound,
  UsersRound,
  Wallet,
  Wrench,
  Zap,
} from 'lucide-react';
import electricianWorker from '../../assets/electrician-worker.jpg';
import heroWorker from '../../assets/home-hero-worker.png';
import serviceCarpenter from '../../assets/services/carpenter.jpg';
import serviceDriver from '../../assets/services/driver.jpg';
import serviceLoading from '../../assets/services/loading.jpg';
import servicePainter from '../../assets/services/painter.jpg';
import servicePlumber from '../../assets/services/plumber.jpg';
import serviceTeacher from '../../assets/services/teacher.jpg';
import type { IconText, ServiceItem } from '../types';

export const appImages = {
  electricianWorker,
  heroWorker,
};

export const stats: IconText[] = [
  { icon: MapPin, title: '10 KM', body: 'Strict Nearby Discovery' },
  { icon: Construction, title: 'Trusted Services', body: 'Company Managed' },
  { icon: BadgeCheck, title: 'Approved Offers', body: 'Admin Moderated' },
  { icon: ShieldCheck, title: 'City Controlled', body: 'Available Where Ready' },
];

export const workerSteps: IconText[] = [
  {
    icon: Search,
    title: 'Discover nearby offers',
    body: 'Approved local deals within 10 KM.',
  },
  {
    icon: Zap,
    title: 'Book trusted services',
    body: 'Choose a service and preferred time.',
  },
  {
    icon: MessageCircle,
    title: 'Track your booking',
    body: 'Chat after a professional is assigned.',
  },
];

export const employerSteps: IconText[] = [
  {
    icon: BriefcaseBusiness,
    title: 'Create business profile',
    body: 'Add your business, city and exact location.',
  },
  {
    icon: UsersRound,
    title: 'Choose a promotion plan',
    body: 'Admin-configured quotas and benefits.',
  },
  {
    icon: MapPin,
    title: 'Submit offers for approval',
    body: 'Go live after InquiryExperts moderation.',
  },
];

export const categories: ServiceItem[] = [
  {
    icon: PlugZap,
    title: 'Electrician',
    slug: 'electrician',
    body: 'Electrical repairs.',
    intro: 'Connect for electrical repair, fitting, and urgent service work.',
    image: electricianWorker,
    imageAlt: 'Electrician repairing a switchboard',
  },
  {
    icon: Wrench,
    title: 'Plumber',
    slug: 'plumber',
    body: 'Pipe and fitting work.',
    intro: 'Find plumbers for repairs, installation, and home service calls.',
    image: servicePlumber,
    imageAlt: 'Plumber repairing home fittings',
  },
  {
    icon: Hammer,
    title: 'Carpenter',
    slug: 'carpenter',
    body: 'Wood and repair work.',
    intro: 'Book carpenters for furniture, repairs, fittings, and woodwork.',
    image: serviceCarpenter,
    imageAlt: 'Carpenter working with wood',
  },
  {
    icon: Paintbrush,
    title: 'Painter',
    slug: 'painter',
    body: 'Wall and finish work.',
    intro: 'Find painters for home, shop, office, and finishing work.',
    image: servicePainter,
    imageAlt: 'Painter working on a wall',
  },
  {
    icon: GraduationCap,
    title: 'Teacher',
    slug: 'teacher',
    body: 'Learning support.',
    intro: 'Find teachers and tutors for classes, coaching, and learning support.',
    image: serviceTeacher,
    imageAlt: 'Teacher helping students',
  },
  {
    icon: Car,
    title: 'Driver',
    slug: 'driver',
    body: 'Scheduled driving service.',
    intro: 'Book company-managed drivers for local and planned trips.',
    image: serviceDriver,
    imageAlt: 'Driver on the road',
  },
];

export const features: IconText[] = [
  {
    icon: MapPin,
    category: 'Offers',
    title: 'Nearby offers within 10 KM',
    body: 'Discover approved local deals around your selected location.',
  },
  {
    icon: SlidersHorizontal,
    category: 'Offers',
    title: 'Search and smart filters',
    body: 'Filter offers by category, distance and what is available now.',
  },
  {
    icon: ShieldCheck,
    category: 'Offers',
    title: 'Admin-approved offers',
    body: 'Every offer is reviewed before it reaches customers.',
  },
  {
    icon: BadgeCheck,
    category: 'Offers',
    title: 'City-controlled availability',
    body: 'Offers and services appear only in enabled cities and localities.',
  },
  {
    icon: Bookmark,
    category: 'Offers',
    title: 'Save offers and view businesses',
    body: 'Keep favourite deals and open the full business or offer details.',
  },
  {
    icon: Construction,
    category: 'Services',
    title: 'Trusted service providers',
    body: 'Browse managed professionals by service, locality, rating and availability.',
  },
  {
    icon: CalendarClock,
    category: 'Services',
    title: 'Book by service, area and time',
    body: 'Choose a category, location, schedule and preferred professional.',
  },
  {
    icon: Navigation,
    category: 'Services',
    title: 'Booking status and live location',
    body: 'Follow assigned professionals and track an active booking in context.',
  },
  {
    icon: MessageCircle,
    category: 'Communication',
    title: 'In-app chat and inbox',
    body: 'Keep booking, business and support conversations in one place.',
  },
  {
    icon: Bell,
    category: 'Communication',
    title: 'Useful notifications',
    body: 'Get updates for offers, bookings, messages, approvals and plans.',
  },
  {
    icon: Store,
    category: 'Business',
    title: 'Business profiles and Business Center',
    body: 'Create, customize and manage one or more local business profiles.',
  },
  {
    icon: LayoutTemplate,
    category: 'Business',
    title: 'Offer designer and templates',
    body: 'Build branded offer cards with images, layouts, stickers and pricing.',
  },
  {
    icon: UsersRound,
    category: 'Business',
    title: 'Plans, quotas and approval workflow',
    body: 'Choose a promotion plan, track limits and submit offers for review.',
  },
  {
    icon: IndianRupee,
    category: 'Payments',
    title: 'Payments and subscription status',
    body: 'See service payments and plan activation only after secure verification.',
  },
  {
    icon: Wallet,
    category: 'Payments',
    title: 'Wallet and transaction history',
    body: 'Add money, request withdrawals and review every wallet transaction.',
  },
  {
    icon: Bot,
    category: 'Support',
    title: 'AI assistant and help center',
    body: 'Ask about jobs, applications, payments and using the app.',
  },
  {
    icon: UserRound,
    category: 'Account',
    title: 'Profile, KYC and preferences',
    body: 'Manage your profile, verification, language, privacy and settings.',
  },
  {
    icon: UserRoundCheck,
    category: 'Account',
    title: 'Simple OTP onboarding',
    body: 'Create an account, complete your profile and switch into provider mode when ready.',
  },
  {
    icon: Radio,
    category: 'Provider mode',
    title: 'Provider availability and dashboard',
    body: 'Go online, receive requests, manage assigned work and view performance.',
  },
];

export const workHubHighlights: IconText[] = [
  {
    icon: Search,
    title: 'Find nearby offers',
    body: 'See local business deals within 10 KM.',
    image: heroWorker,
    imageAlt: 'InquiryExperts service professional ready for bookings',
  },
  {
    icon: BriefcaseBusiness,
    title: 'Book trusted services',
    body: 'Pick a category, address and time.',
    image: serviceLoading,
    imageAlt: 'Service professional handling a local booking',
  },
  {
    icon: MessageCircle,
    title: 'Promote local business',
    body: 'Post subscription-backed, approved offers.',
    image: electricianWorker,
    imageAlt: 'Electrician completing a local service task',
  },
];

export const liveJobs = [
  {
    title: '30% off family dinner',
    category: 'Food Offer',
    pay: 'Rs. 699',
    distance: '1.7 km away',
    time: 'Ends today',
  },
  {
    title: 'AC service booking',
    category: 'Trusted Service',
    pay: 'From Rs. 499',
    distance: 'Raipur',
    time: 'Book now',
  },
  {
    title: 'Salon weekday special',
    category: 'Salon Offer',
    pay: '20% off',
    distance: '3.2 km away',
    time: '5 days left',
  },
];

export const trustItems: IconText[] = [
  {
    icon: ShieldCheck,
    title: 'Managed professionals',
    body: 'Workers are recruited and verified by InquiryExperts.',
  },
  {
    icon: BadgeCheck,
    title: 'City-controlled availability',
    body: 'Offers and services appear only where enabled.',
  },
  {
    icon: MessageCircle,
    title: 'In-app communication',
    body: 'Contextual booking and support chat.',
  },
];
