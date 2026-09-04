import { features } from '../data/siteData';

function FeatureGrid() {
  return (
    <div className="featureGrid">
      {features.map(({ icon: Icon, title, body, image, imageAlt }) => (
        <article className="featureCard" key={title}>
          {image && <img className="featurePhoto" src={image} alt={imageAlt || ''} />}
          <div className="featureCardBody">
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
