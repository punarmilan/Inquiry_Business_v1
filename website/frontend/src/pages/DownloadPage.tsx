import { Play, QrCode } from 'lucide-react';
import InstallSection from '../components/InstallSection';
import PageShell from '../components/PageShell';
import PhonePreview from '../components/PhonePreview';
import { PLAY_STORE_URL } from '../constants';

function DownloadPage() {
  return (
    <PageShell
      eyebrow="Download"
      title={
        <>
          Install the <span>InquiryExperts Android app</span>
        </>
      }
      body="Scan QR or open Play Store to install the Android app."
    >
      <section className="appPreview" aria-label="InquiryExperts app preview">
        <PhonePreview />

        <div className="previewCopy">
          <p className="eyebrow">Mobile first</p>
          <h2>Install once. Discover and book from the app.</h2>
          <p>Scan or open Play Store, then use the app for nearby offers, services, chat, and booking tracking.</p>
          <div className="previewActions">
            <a className="primaryAction" href={PLAY_STORE_URL} target="_blank" rel="noreferrer">
              <Play size={18} aria-hidden="true" />
              Open Play Store
            </a>
            <a className="secondaryAction darkText" href="#install">
              <QrCode size={18} aria-hidden="true" />
              Scan QR Code
            </a>
          </div>
        </div>
      </section>

      <InstallSection />
    </PageShell>
  );
}

export default DownloadPage;
