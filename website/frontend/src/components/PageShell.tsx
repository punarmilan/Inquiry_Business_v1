import { appImages } from '../data/siteData';
import type { PageTitle } from '../types';

type PageShellProps = {
  eyebrow: string;
  title: PageTitle;
  body: string;
  children: React.ReactNode;
};

function PageShell({ eyebrow, title, body, children }: PageShellProps) {
  return (
    <>
      <section className="pageHero">
        <div className="pageHeroCopy">
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p>{body}</p>
        </div>
        <img className="pageHeroImage" src={appImages.electricianWorker} alt="" />
      </section>
      {children}
    </>
  );
}

export default PageShell;
