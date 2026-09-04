import PageShell from '../components/PageShell';
import SectionHeading from '../components/SectionHeading';
import ServiceGrid from '../components/ServiceGrid';
import type { NavigationHandler } from '../types';

type ServicesPageProps = {
  navigate: NavigationHandler;
};

function ServicesPage({ navigate }: ServicesPageProps) {
  return (
    <PageShell
      eyebrow="Services"
      title={
        <>
          From daily work to <span>professional services</span>
        </>
      }
      body="Daily help, skilled work, and professional categories in one place."
    >
      <section className="serviceBand pageServiceBand" id="services">
        <SectionHeading eyebrow="Categories" title="Explore service categories" />
        <ServiceGrid navigate={navigate} />
      </section>
    </PageShell>
  );
}

export default ServicesPage;
