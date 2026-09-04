import type { PageTitle } from '../types';

type SectionHeadingProps = {
  eyebrow: string;
  title: PageTitle;
};

function SectionHeading({ eyebrow, title }: SectionHeadingProps) {
  return (
    <div className="sectionHead">
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
    </div>
  );
}

export default SectionHeading;
