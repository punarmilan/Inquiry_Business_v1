import { features } from '../data/siteData';

type FeatureGridProps = {
  limit?: number;
};

function FeatureGrid({ limit }: FeatureGridProps) {
  const visibleFeatures = typeof limit === 'number' ? features.slice(0, limit) : features;

  return (
    <div className="featureGrid">
      {visibleFeatures.map(({ icon: Icon, title, body, category }) => (
        <article className="featureCard" key={title}>
          <div className="featureCardBody">
            {category && <p className="featureCategory">{category}</p>}
            <span className="featureIcon">
              <Icon size={24} aria-hidden="true" />
            </span>
            <h3>{title}</h3>
            <p>{body}</p>
          </div>
        </article>
      ))}
    </div>
  );
}

export default FeatureGrid;
