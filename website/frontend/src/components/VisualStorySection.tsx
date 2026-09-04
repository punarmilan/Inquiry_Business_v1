import { BadgeCheck, IndianRupee, MapPin, MessageCircle } from 'lucide-react';
import { appImages } from '../data/siteData';

function VisualStorySection() {
  return (
    <section className="section visualStorySection" aria-label="InquiryExperts visual highlights">
      <figure className="storyPhoto">
        <img src={appImages.electricianWorker} alt="Electrician completing local service work" />
        <figcaption>
          <MapPin size={18} aria-hidden="true" />
          <strong>Trusted service</strong>
          <span>2.4 km away</span>
        </figcaption>
      </figure>

      <div className="storyCopy">
        <p className="eyebrow">App feel</p>
        <h2>Local discovery. Clear action.</h2>
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
