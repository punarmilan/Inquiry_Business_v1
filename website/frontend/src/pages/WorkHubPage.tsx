import { ArrowLeftRight } from 'lucide-react';
import PageShell from '../components/PageShell';
import SectionHeading from '../components/SectionHeading';
import WorkHubGallery from '../components/WorkHubGallery';
import WorkflowPanel from '../components/WorkflowPanel';
import { employerSteps, workerSteps } from '../data/siteData';

function WorkHubPage() {
  return (
    <PageShell
      eyebrow="How It Works"
      title={
        <>
          One place for <span>offers and trusted services</span>
        </>
      }
      body="Discover nearby offers, book services, chat, and track every booking in one app."
    >
      <WorkHubGallery />

      <section className="section flowSection pageSection">
        <SectionHeading
          eyebrow="How the app works"
          title={
            <>
              A <span>simple flow</span> for customers and businesses
            </>
          }
        />

        <div className="workflowWrap">
          <WorkflowPanel title="For Customers" items={workerSteps} tone="worker" />
          <div className="switchBubble" aria-hidden="true">
            <ArrowLeftRight size={25} />
          </div>
          <WorkflowPanel id="employer" title="For Businesses" items={employerSteps} tone="employer" />
        </div>
      </section>
    </PageShell>
  );
}

export default WorkHubPage;
