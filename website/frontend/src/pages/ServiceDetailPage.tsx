import { BadgeCheck, MessageCircle, Play, Search } from 'lucide-react';
import { PLAY_STORE_URL } from '../constants';
import type { IconText, NavigationHandler, ServiceItem } from '../types';

type ServiceDetailPageProps = {
  service: ServiceItem;
  navigate: NavigationHandler;
};

function ServiceDetailPage({ service, navigate }: ServiceDetailPageProps) {
  const Icon = service.icon;
  const serviceName = service.title.toLowerCase();
  const detailCards: IconText[] = [
    {
      icon: Search,
      title: `Book ${serviceName} service`,
      body: 'Clear estimate, address and timing.',
    },
    {
      icon: BadgeCheck,
      title: 'Company-managed professional',
      body: 'Assignment respects city, category and availability.',
    },
    {
      icon: MessageCircle,
      title: 'Chat in the app',
      body: 'Coordinate after a professional is assigned.',
    },
  ];

  return (
    <>
      <section className="serviceDetailHero">
        <div className="serviceDetailCopy">
          <a className="backLink" href="/services" onClick={(event) => navigate(event, '/services')}>
            Services
          </a>
          <span className="serviceDetailIcon">
            <Icon size={26} aria-hidden="true" />
          </span>
          <p className="eyebrow">InquiryExperts service</p>
          <h1>{service.title}</h1>
          <p>{service.intro}</p>
          <div className="heroActions">
            <a className="primaryAction" href={PLAY_STORE_URL} target="_blank" rel="noreferrer">
              <Play size={18} aria-hidden="true" />
              Open Play Store
            </a>
            <a className="secondaryAction" href="/services" onClick={(event) => navigate(event, '/services')}>
              All Services
            </a>
          </div>
        </div>

        {service.image && <img className="serviceDetailImage" src={service.image} alt={service.imageAlt || ''} />}
      </section>

      <section className="section serviceDetailCards" aria-label={`${service.title} service details`}>
        {detailCards.map(({ icon: DetailIcon, title, body }) => (
          <article className="detailCard" key={title}>
            <span className="featureIcon">
              <DetailIcon size={23} aria-hidden="true" />
            </span>
            <h3>{title}</h3>
            <p>{body}</p>
          </article>
        ))}
      </section>

      <section className="finalCta serviceDetailCta">
        <div>
          <p className="eyebrow">Ready</p>
          <h2>Book {service.title} with InquiryExperts</h2>
        </div>
        <a className="primaryAction" href={PLAY_STORE_URL} target="_blank" rel="noreferrer">
          <Play size={18} aria-hidden="true" />
          Open Play Store
        </a>
      </section>
    </>
  );
}

export default ServiceDetailPage;
