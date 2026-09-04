import { categories } from '../data/siteData';
import type { NavigationHandler } from '../types';
import { getServicePath } from '../utils/routes';

type ServiceGridProps = {
  navigate: NavigationHandler;
};

function ServiceGrid({ navigate }: ServiceGridProps) {
  return (
    <div className="serviceImageGrid" aria-label="InquiryExperts service categories">
      {categories.map(({ icon: Icon, title, image, imageAlt, slug, body }) => (
        <a
          className="serviceCard"
          href={getServicePath(slug)}
          key={title}
          onClick={(event) => navigate(event, getServicePath(slug))}
        >
          {image && <img src={image} alt={imageAlt || ''} />}
          <div className="serviceCardBody">
            <span className="serviceIcon">
              <Icon size={18} aria-hidden="true" />
            </span>
            <div>
              <h3>{title}</h3>
              <p>{body}</p>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}

export default ServiceGrid;
