import { ArrowLeftRight, MapPin, Timer } from 'lucide-react';
import FeatureGrid from '../components/FeatureGrid';
import InstallSection from '../components/InstallSection';
import SectionHeading from '../components/SectionHeading';
import ServiceGrid from '../components/ServiceGrid';
import VisualStorySection from '../components/VisualStorySection';
import WorkflowPanel from '../components/WorkflowPanel';
import { employerSteps, liveJobs, stats, trustItems, workerSteps } from '../data/siteData';
import AnimatedHero from '../components/AnimatedHero';
import type { NavigationHandler } from '../types';
import DiscoveryExperience from '../components/DiscoveryExperience';

type HomePageProps = {
  navigate: NavigationHandler;
};

function HomePage({ navigate }: HomePageProps) {
  return (
    <>
      <AnimatedHero navigate={navigate} />

      <div className="statsBand">
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
      </div>

      <div className="homeExperience">
      <DiscoveryExperience navigate={navigate} />
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
        <p className="sampleNote">Illustrative app listings. Offers, prices and availability vary by location.</p>
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
        <SectionHeading eyebrow="Inside the app" title="Everything you need, in one place" />
        <FeatureGrid limit={6} />
        <a className="experienceLink" href="/features" onClick={(event) => navigate(event, '/features')}>Explore every feature <span aria-hidden="true">↗</span></a>
      </section>

      <InstallSection />
      </div>
    </>
  );
}

export default HomePage;
