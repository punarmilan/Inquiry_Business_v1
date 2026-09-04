import { Play } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { PLAY_STORE_URL } from '../constants';

function InstallSection() {
  return (
    <section className="installSection" id="install">
      <div className="installCopy">
        <p className="eyebrow">Install app</p>
        <h2>Scan QR or open Play Store</h2>
        <p>One tap takes Android users to the app listing.</p>
        <a className="primaryAction" href={PLAY_STORE_URL} target="_blank" rel="noreferrer">
          <Play size={18} aria-hidden="true" />
          Open Play Store
        </a>
      </div>

      <div className="qrPanel">
        <QRCodeSVG value={PLAY_STORE_URL} size={206} level="Q" marginSize={1} title="InquiryExperts Play Store QR" />
        <div>
          <strong>InquiryExperts Android App</strong>
          <span>Scan to open Play Store</span>
        </div>
      </div>
    </section>
  );
}

export default InstallSection;
