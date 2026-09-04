import { ArrowLeftRight, MapPin, Play, QrCode, ScanQrCode, Timer } from 'lucide-react';
import FeatureGrid from '../components/FeatureGrid';
import InstallSection from '../components/InstallSection';
import PhonePreview from '../components/PhonePreview';
import SectionHeading from '../components/SectionHeading';
import ServiceGrid from '../components/ServiceGrid';
import VisualStorySection from '../components/VisualStorySection';
import WorkflowPanel from '../components/WorkflowPanel';
import { PLAY_STORE_URL } from '../constants';
import { appImages, employerSteps, liveJobs, stats, trustItems, workerSteps } from '../data/siteData';
import type { NavigationHandler } from '../types';

type HomePageProps = {
  navigate: NavigationHandler;
};

function HomePage({ navigate }: HomePageProps) {
  return (
    <>
      <section className="heroSection" aria-labelledby="hero-title">
        <img className="heroBackdropImage" src={appImages.heroWorker} alt="" />
        <div className="heroInner">
          <div className="heroCopy">
            <p className="eyebrow heroPill">Hyperlocal offers and trusted services</p>
            <h1 id="hero-title">InquiryExperts</h1>
            <p className="heroTagline">
              Discover nearby offers.
              <br />
              Book trusted services.
              <span>All in one app.</span>
            </p>
            <p className="heroLead">Approved business offers within 10 KM and company-managed local professionals.</p>

            <div className="heroActions" aria-label="Download InquiryExperts">
              <a className="primaryAction" href={PLAY_STORE_URL} target="_blank" rel="noreferrer">
                <Play size={18} aria-hidden="true" />
                Open Play Store
              </a>
              <a className="secondaryAction" href="/download" onClick={(event) => navigate(event, '/download')}>
                <ScanQrCode size={18} aria-hidden="true" />
                Scan QR
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="statsRibbon" aria-label="InquiryExperts summary">
        {stats.map(({ icon: Icon, title, body }) => (
          <div className="statItem" key={title}>
            <span className="statIcon">
              <Icon size={20} aria-hidden="true" />
            </span>
            <div>
              <strong>{title}</strong>
              <span>{body}</span>
            </div>
          </div>
        ))}
      </section>

      <VisualStorySection />

      <section className="section flowSection">
        <SectionHeading
          eyebrow="Work Hub"
          title={
            <>
              One app for <span>customers and businesses</span>
            </>
          }
        />

        <div className="workflowWrap">
          <WorkflowPanel title="For Customers" items={workerSteps} tone="worker" />
          <div className="switchBubble" aria-hidden="true">
            <ArrowLeftRight size={25} />
          </div>
          <WorkflowPanel title="For Local Businesses" items={employerSteps} tone="employer" />
        </div>
      </section>

      <section className="section liveJobsSection">
        <SectionHeading eyebrow="Near you" title="Offers and service pricing are clear" />
        <div className="jobPreviewGrid">
          {liveJobs.map((job) => (
            <article className="jobPreviewCard" key={job.title}>
              <div className="jobPreviewTop">
                <span>{job.category}</span>
                <strong>{job.pay}</strong>
              </div>
              <h3>{job.title}</h3>
              <div className="jobMeta">
                <span>
                  <MapPin size={16} aria-hidden="true" />
                  {job.distance}
                </span>
                <span>
                  <Timer size={16} aria-hidden="true" />
                  {job.time}
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="serviceBand">
        <SectionHeading eyebrow="Services" title="Daily and skilled services" />
        <ServiceGrid navigate={navigate} />
      </section>

      <section className="section trustSection">
        <div className="trustCopy">
          <p className="eyebrow">Trust & safety</p>
          <h2>Safer hyperlocal discovery</h2>
          <p>See approval, distance, pricing, timing, and location before taking action.</p>
        </div>
        <div className="trustGrid">
          {trustItems.map(({ icon: Icon, title, body }) => (
            <article className="trustItem" key={title}>
              <span className="featureIcon">
                <Icon size={23} aria-hidden="true" />
              </span>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section featuresSection">
        <SectionHeading eyebrow="Features" title="Simple tools for local life" />
        <FeatureGrid />
      </section>

      <section className="appPreview" aria-label="InquiryExperts app preview">
        <PhonePreview />

        <div className="previewCopy">
          <p className="eyebrow">Mobile first</p>
          <h2>Install once. Discover and book from the app.</h2>
          <p>Scan or open Play Store, then use the app for offers, services, chat, and booking tracking.</p>
          <div className="previewActions">
            <a className="primaryAction" href={PLAY_STORE_URL} target="_blank" rel="noreferrer">
              <Play size={18} aria-hidden="true" />
              Open Play Store
            </a>
            <a className="secondaryAction darkText" href="/download" onClick={(event) => navigate(event, '/download')}>
              <QrCode size={18} aria-hidden="true" />
              Scan QR Code
            </a>
          </div>
        </div>
      </section>

      <section className="finalCta">
        <div>
          <p className="eyebrow">Start today</p>
          <h2>Discover nearby offers. Book trusted local services.</h2>
        </div>
        <a className="primaryAction" href={PLAY_STORE_URL} target="_blank" rel="noreferrer">
          <Play size={18} aria-hidden="true" />
          Open Play Store
        </a>
      </section>

      <InstallSection />
    </>
  );
}

export default HomePage;
