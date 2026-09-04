import FeatureGrid from '../components/FeatureGrid';
import PageShell from '../components/PageShell';
import SectionHeading from '../components/SectionHeading';

function FeaturesPage() {
  return (
    <PageShell
      eyebrow="Features"
      title={
        <>
          Tools to discover and <span>book locally</span>
        </>
      }
      body="10 KM discovery, city availability, trusted services, contextual chat, and secure payment status."
    >
      <section className="section featuresSection pageSection" id="features">
        <SectionHeading eyebrow="Important features" title="Tools for offers, services and local businesses" />
        <FeatureGrid />
      </section>
    </PageShell>
  );
}

export default FeaturesPage;
