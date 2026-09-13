export type LegalDocumentKey = 'terms' | 'privacy';

export type LegalSection = {
  heading: string;
  body: string;
};

export type LegalDocument = {
  title: string;
  intro: string;
  sections: LegalSection[];
};

export const legalDocuments: Record<LegalDocumentKey, LegalDocument> = {
  terms: {
    title: 'Terms & Conditions',
    intro: 'These Terms & Conditions govern your use of InquiryExperts, including account registration, service discovery, bookings, messaging, payments, and provider applications.',
    sections: [
      { heading: '1. Using InquiryExperts', body: 'By creating an account or using the app, you agree to these terms and to use the platform lawfully, honestly, and only for its intended services. If you do not agree, do not create an account or continue using the platform.' },
      { heading: '2. Accounts and information', body: 'You are responsible for providing accurate, current information and for keeping your phone, email, password, and one-time-password information secure. Do not impersonate another person, share access to your account, or create accounts for fraudulent or unlawful purposes.' },
      { heading: '3. Service provider directory', body: 'InquiryExperts helps users discover local service providers and contact them directly. Provider phone and WhatsApp details are supplied by the directory administrator and should be used responsibly.' },
      { heading: '4. Direct communication', body: 'Calls and WhatsApp messages are opened through your device apps. Any price, availability, visit, service scope, or commitment is agreed directly between you and the provider.' },
      { heading: '5. Payments and cancellations', body: 'Where payment features are available, charges, refunds, cancellations, and related conditions are shown in the relevant booking or payment flow. You must not attempt to bypass payment controls, submit false payment information, or misuse a refund or dispute process.' },
      { heading: '6. Acceptable use', body: 'You must not use InquiryExperts to harass, threaten, defraud, scrape, reverse engineer, distribute malware, submit unlawful content, interfere with the platform, or bypass security, moderation, account, or access controls.' },
      { heading: '7. Content and moderation', body: 'You retain responsibility for content and information you submit. You grant InquiryExperts permission to host and display that content as needed to operate the platform. We may remove content, restrict features, suspend accounts, or reject applications when there is a safety, legal, security, quality, or policy concern.' },
      { heading: '8. Availability and third parties', body: 'The platform may depend on networks, maps, payment providers, authentication providers, and other third-party services. Features may change or be temporarily unavailable. InquiryExperts is not responsible for the independent acts, omissions, pricing, availability, or service quality of third parties.' },
      { heading: '9. Changes and termination', body: 'We may update these terms as the platform changes or as required by law. We may notify you through the app or other available contact details. You may stop using the platform at any time; we may suspend or terminate access for a breach of these terms, safety concern, legal requirement, or operational reason.' },
      { heading: '10. Contact', body: 'For questions about these terms, contact InquiryExperts through the support channel shown in the app. Please include enough account or booking context for us to respond without sharing your password or one-time password.' },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    intro: 'This Privacy Policy explains what information InquiryExperts handles, why it is used, and the choices available to you when you use the app.',
    sections: [
      { heading: '1. Information we collect', body: 'We may collect account and contact information such as your name, phone number, email address, profile details, and information you submit in messages or support requests.' },
      { heading: '2. Location and service information', body: 'When you use location-enabled service features, we may process location, city, locality, service category, and provider directory details needed to show relevant services.' },
      { heading: '3. Device and usage information', body: 'We may receive technical and usage information needed to operate and secure the app, such as device or app information, diagnostic events, authentication activity, notification settings, and interactions with platform features.' },
      { heading: '4. How we use information', body: 'We use information to create and secure accounts, authenticate users, provide services, support messaging and notifications, manage the provider directory, prevent misuse, improve reliability, respond to support requests, and meet legal obligations.' },
      { heading: '5. When information is shared', body: 'We share information only as needed to operate the requested feature, such as with the relevant user or provider, service and payment partners, authentication providers, infrastructure providers, support personnel, or authorities when legally required. We do not treat your password or one-time password as information that should be shared with anyone.' },
      { heading: '6. Retention and security', body: 'We retain information for as long as needed for the purposes described here, account and transaction records, safety, dispute handling, and legal obligations. We use reasonable technical and organizational safeguards, but no online service can guarantee absolute security.' },
      { heading: '7. Your choices', body: 'You may review or update available profile information in the app, stop using location features, manage notification permissions through your device, or contact support about account and privacy requests. Some information may need to be retained for security, fraud prevention, transaction, or legal reasons.' },
      { heading: '8. Children and third-party services', body: 'InquiryExperts is not intended for children who cannot lawfully use the services in their jurisdiction. The app may connect to third-party services with their own terms and privacy practices; review those services when they are used.' },
      { heading: '9. Policy changes', body: 'We may update this policy when our features, practices, or legal requirements change. The updated version will be made available in the app, and continued use after an update means you have had an opportunity to review it.' },
      { heading: '10. Contact', body: 'For privacy questions or requests, contact InquiryExperts through the support channel shown in the app. Never include your password or one-time password in a privacy request.' },
    ],
  },
};
