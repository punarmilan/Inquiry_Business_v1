import { BadgeCheck, IndianRupee, MapPin, MessageCircle } from 'lucide-react';
import { appImages } from '../data/siteData';

function VisualStorySection() {
  return (
    <section className="section visualStorySection" aria-label="InquiryExperts visual highlights">
      <figure className="storyPhoto">
        <img src={appImages.electricianWorker} alt="Electrician completing local service work" loading="lazy" />
        <figcaption>
          <MapPin size={18} aria-hidden="true" />
          <strong>Trusted service</strong>
          <span>Company-managed professionals</span>
        </figcaption>
      </figure>

      <div className="storyCopy">
        <p className="eyebrow">REAL SKILLS. REAL PEACE OF MIND.</p>
        <h2>For the things<br />you can’t put off.</h2>
        <p>That repair. That fresh coat of paint. That extra helping hand. Find local professionals and keep every booking in one place.</p>
        <div className="storyList">
          <span>
            <BadgeCheck size={19} aria-hidden="true" />
            Managed professionals
          </span>
          <span>
            <IndianRupee size={19} aria-hidden="true" />
            Clear pricing
          </span>
          <span>
            <MessageCircle size={19} aria-hidden="true" />
            Booking chat
          </span>
        </div>
      </div>
    </section>
  );
}

export default VisualStorySection;
