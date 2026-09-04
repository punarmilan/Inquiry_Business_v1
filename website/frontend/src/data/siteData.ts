import {
  Baby,
  BadgeCheck,
  Bot,
  BriefcaseBusiness,
  Calculator,
  Car,
  ChefHat,
  Code,
  Construction,
  GraduationCap,
  Hammer,
  HardHat,
  IndianRupee,
  MapPin,
  MessageCircle,
  Package,
  Paintbrush,
  Palette,
  PlugZap,
  Search,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
  Users,
  UsersRound,
  Wrench,
  Zap,
} from 'lucide-react';
import electricianWorker from '../../assets/electrician-worker.jpg';
import heroWorker from '../../assets/home-hero-worker.png';
import serviceAccountant from '../../assets/services/accountant.jpg';
import serviceBabySitter from '../../assets/services/baby-sitter.jpg';
import serviceCarpenter from '../../assets/services/carpenter.jpg';
import serviceCleaning from '../../assets/services/cleaning.jpg';
import serviceConstruction from '../../assets/services/construction.jpg';
import serviceCook from '../../assets/services/cook.jpg';
import serviceDesigner from '../../assets/services/designer.jpg';
import serviceDeveloper from '../../assets/services/developer.jpg';
import serviceDriver from '../../assets/services/driver.jpg';
import serviceHelper from '../../assets/services/helper.jpg';
import serviceLoading from '../../assets/services/loading.jpg';
import serviceMaid from '../../assets/services/maid.jpg';
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
    icon: HardHat,
    title: 'Helper',
    slug: 'helper',
    body: 'Everyday local support.',
    intro: 'Find trusted helpers for quick local work and daily support tasks.',
    image: serviceHelper,
    imageAlt: 'People getting work support',
  },
  {
    icon: Construction,
    title: 'Construction',
    slug: 'construction',
    body: 'Site work and labor.',
    intro: 'Book company-managed professionals for planned local support.',
    image: serviceConstruction,
    imageAlt: 'Construction worker on site',
  },
  {
    icon: Package,
    title: 'Loading',
    slug: 'loading',
    body: 'Packing and shifting.',
    intro: 'Get loading, unloading, and shifting help for homes, shops, and offices.',
    image: serviceLoading,
    imageAlt: 'Worker loading boxes',
  },
  {
    icon: Sparkles,
    title: 'Cleaning',
    slug: 'cleaning',
    body: 'Home and office cleaning.',
    intro: 'Book trusted cleaning support near your location.',
    image: serviceCleaning,
    imageAlt: 'Cleaning service in progress',
  },
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
    icon: Palette,
    title: 'Designer',
    slug: 'designer',
    body: 'Creative work.',
    intro: 'Connect with designers for creative, digital, and visual work.',
    image: serviceDesigner,
    imageAlt: 'Designer workspace with creative tools',
  },
  {
    icon: Code,
    title: 'Developer',
    slug: 'developer',
    body: 'Web and app work.',
    intro: 'Find developers for websites, apps, fixes, and technical tasks.',
    image: serviceDeveloper,
    imageAlt: 'Developer coding on a laptop',
  },
  {
    icon: Calculator,
    title: 'Accountant',
    slug: 'accountant',
    body: 'Finance support.',
    intro: 'Get accounting help for billing, records, payments, and reports.',
    image: serviceAccountant,
    imageAlt: 'Accountant checking finance details',
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
  {
    icon: ChefHat,
    title: 'Cook',
    slug: 'cook',
    body: 'Cooking service.',
    intro: 'Find cooks for home meals, events, and regular kitchen help.',
    image: serviceCook,
    imageAlt: 'Cook preparing food',
  },
  {
    icon: UserRoundCheck,
    title: 'Maid',
    slug: 'maid',
    body: 'Housekeeping help.',
    intro: 'Connect for housekeeping, cleaning, and daily home support.',
    image: serviceMaid,
    imageAlt: 'Housekeeping and cleaning work',
  },
  {
    icon: Baby,
    title: 'Baby Sitter',
    slug: 'baby-sitter',
    body: 'Child care support.',
    intro: 'Find trusted child care and babysitting support near you.',
    image: serviceBabySitter,
    imageAlt: 'Child care and babysitting',
  },
];

export const features: IconText[] = [
  {
    icon: ShieldCheck,
    title: 'Admin-Approved Offers',
    body: 'Every public offer passes moderation.',
    image: serviceHelper,
    imageAlt: 'Profile verification and hiring support',
  },
  {
    icon: IndianRupee,
    title: 'Clear Service Pricing',
    body: 'Estimates and payment status upfront.',
    image: serviceAccountant,
    imageAlt: 'Clear pay and accounting details',
  },
  {
    icon: Bot,
    title: 'AI Assistant',
    body: 'Quick help for offers, bookings and payments.',
    image: serviceDeveloper,
    imageAlt: 'Digital assistant and app support',
  },
  {
    icon: Users,
    title: 'Business Promotion Plans',
    body: 'Dynamic plans with server-enforced quotas.',
    image: serviceLoading,
    imageAlt: 'Customer and business coordination',
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
