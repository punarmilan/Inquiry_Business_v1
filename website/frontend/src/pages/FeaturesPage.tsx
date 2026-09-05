import FeatureGrid from '../components/FeatureGrid';
import PageShell from '../components/PageShell';
import SectionHeading from '../components/SectionHeading';

function FeaturesPage() {
  return (
    <PageShell
      eyebrow="Features"
      title={
        <>
          Explore every part of the <span>InquiryExperts app</span>
        </>
      }
      body="Offers, trusted services, business tools, provider mode, payments and support — all built into one hyperlocal app."
    >
      <section className="section featuresSection pageSection" id="features">
        <SectionHeading eyebrow="App feature map" title="Built around the way you work locally" />
        <FeatureGrid />
      </section>
    </PageShell>
  );
}

export default FeaturesPage;
