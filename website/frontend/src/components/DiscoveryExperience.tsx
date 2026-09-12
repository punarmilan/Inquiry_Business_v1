import { useState } from 'react';
import { ArrowUpRight, BadgeCheck, MapPin, Navigation, Sparkles, Wrench, Store, Pause, Play } from 'lucide-react';
import { categories } from '../data/siteData';
import { getServicePath } from '../utils/routes';
import type { NavigationHandler } from '../types';

export default function DiscoveryExperience({ navigate }: { navigate: NavigationHandler }) {
  const [selected, setSelected] = useState(0);
  const [paused, setPaused] = useState(false);
  const service = categories[selected];
  return <section className={`discoveryExperience ${paused ? 'motionPaused' : ''}`} aria-labelledby="discovery-title">
    <div className="experienceIntro"><p className="eyebrow"><Sparkles size={16} /> YOUR NEIGHBOURHOOD. REIMAGINED.</p><h2 id="discovery-title">Small radius.<br /><span>Endless possibilities.</span></h2><p>The best things aren’t always far away. Discover local offers and the right people for your everyday needs.</p></div>
    <div className="discoveryBento">
      <article className="radarCard">
        <div className="bentoLabel"><span><i /> CLOSER THAN YOU THINK</span><button type="button" onClick={() => setPaused(!paused)} aria-label={paused ? 'Resume discovery animation' : 'Pause discovery animation'}>{paused ? <Play size={16} /> : <Pause size={16} />}</button></div>
        <div className="neighbourhoodRadar" aria-hidden="true"><div className="radarSweep" /><div className="radarRing ringOne" /><div className="radarRing ringTwo" /><div className="radarRing ringThree" /><span className="radarCenter"><Navigation size={28} /></span><span className="radarPin pinOne"><Store size={21} /> Local offers</span><span className="radarPin pinTwo"><Wrench size={21} /> Skilled pros</span><span className="radarPin pinThree"><BadgeCheck size={21} /> Approved businesses</span></div>
        <div className="radarCaption"><h3>Your world, within <span>10 KM.</span></h3><p>Less searching everywhere. More discovering right here.</p><small>Illustration of nearby discovery · Availability varies by city</small></div>
      </article>
      <article className="serviceSpotlight">
        <img key={service.slug} src={service.image} alt={service.imageAlt || service.title} loading="lazy" />
        <div className="spotlightContent"><span className="spotlightTag"><BadgeCheck size={16} /> COMPANY-MANAGED SERVICES</span><div><p>GOOD PEOPLE. GREAT WORK.</p><h3>A little help.<br />A big difference.</h3></div><a href={getServicePath(service.slug)} onClick={(event) => navigate(event, getServicePath(service.slug))}><span>Explore {service.title.toLowerCase()} services</span><ArrowUpRight size={24} /></a></div>
      </article>
      <div className="discoverySelector" aria-label="Explore service categories"><span>What can we help with?</span><div>{categories.map(({ icon: Icon, title }, index) => <button type="button" key={title} aria-pressed={selected === index} onClick={() => setSelected(index)}><Icon size={18} />{title}</button>)}</div></div>
    </div>
    <div className="experiencePromise"><MapPin size={18} /><span>Nearby by design.</span><span>Trusted by process.</span><span>Simple by nature.</span></div>
  </section>;
}
