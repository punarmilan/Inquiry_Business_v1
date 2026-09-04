import { workHubHighlights } from '../data/siteData';
import SectionHeading from './SectionHeading';

function WorkHubGallery() {
  return (
    <section className="section workHubGallery" aria-label="How InquiryExperts works">
      <SectionHeading eyebrow="App experience" title="Three simple moments in the app" />
      <div className="workHubGalleryGrid">
        {workHubHighlights.map(({ icon: Icon, title, body, image, imageAlt }) => (
          <article className="workHubVisualCard" key={title}>
            {image && <img src={image} alt={imageAlt || ''} />}
            <div>
              <span className="featureIcon">
                <Icon size={23} aria-hidden="true" />
              </span>
              <h3>{title}</h3>
              <p>{body}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default WorkHubGallery;
