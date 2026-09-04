import { BadgeCheck, BriefcaseBusiness, IndianRupee, MapPin, Timer } from 'lucide-react';
import { appImages } from '../data/siteData';

function PhonePreview() {
  return (
    <div className="phoneFrame">
      <div className="phoneTop">
        <MapPin size={15} aria-hidden="true" />
        <strong>Pune, Maharashtra</strong>
        <BadgeCheck size={16} aria-hidden="true" />
      </div>
      <div className="phoneHero">
        <div>
          <span>Offers Near You</span>
          <strong>Within 10 KM</strong>
          <small>Approved local deals</small>
        </div>
        <img src={appImages.heroWorker} alt="" />
      </div>
      <div className="phoneChips">
        <span className="active">Cleaning</span>
        <span>Electrician</span>
        <span>Driver</span>
        <span>More</span>
      </div>
      <div className="miniJobCard">
        <span className="miniIcon">
          <IndianRupee size={17} aria-hidden="true" />
        </span>
        <div>
          <strong>30% off family dinner</strong>
          <p>Rs. 699 - 1.7 km away</p>
        </div>
      </div>
      <div className="miniJobCard muted">
        <span className="miniIcon blue">
          <BriefcaseBusiness size={17} aria-hidden="true" />
        </span>
        <div>
          <strong>Book an electrician</strong>
          <p>From Rs. 499 - Managed service</p>
        </div>
      </div>
      <div className="miniJobCard muted">
        <span className="miniIcon green">
          <Timer size={17} aria-hidden="true" />
        </span>
        <div>
          <strong>Professional assigned</strong>
          <p>Booking chat available</p>
        </div>
      </div>
      <div className="phoneTabbar">
        <span className="active">Offers</span>
        <span>Services</span>
        <b>+</b>
        <span>More</span>
        <span>Profile</span>
      </div>
    </div>
  );
}

export default PhonePreview;
