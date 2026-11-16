import { Link } from 'react-router-dom';
import { ArrowRight, House, Ticket } from '@phosphor-icons/react';
import { PageHeader } from '@/components/shared/PageHeader';
import { navGroups } from '@/components/layout/navigation';

const linkStyle = 'rounded-xl border bg-card transition-colors hover:border-primary/50 hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:bg-accent';

export function AppContentPage() {
  const tools = navGroups.find(group => group.label === 'Dynamic UI')!.items;
  return <div className="space-y-7">
    <PageHeader title="App content" description="Choose what you want to change in the mobile app." />
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
      <section aria-label="Home editing" className="space-y-4">
        <div><h2 className="text-lg font-semibold">Manage the home screen</h2><p className="mt-1 text-sm text-muted-foreground">Cards and banners have one editor. Trending offers have their own selection list.</p></div>
        <Link to="/home-content" className={`${linkStyle} flex items-start gap-4 p-5 sm:p-6`}>
          <span className="rounded-xl bg-accent p-3 text-accent-foreground"><House aria-hidden="true" className="h-6 w-6" /></span>
          <span className="min-w-0 flex-1"><span className="block text-base font-semibold">Home cards & banners</span><span className="mt-1 block text-sm leading-6 text-muted-foreground">Change the Local Offers, Create Post, Local Events and Find Services cards. Edit both banners, images, text and animations.</span><span className="mt-3 block text-sm font-semibold text-primary">Open home editor →</span><span className="mt-2 block text-xs text-muted-foreground">Save a draft, then publish to update the app.</span></span>
        </Link>
        <Link to="/home-showcase" className={`${linkStyle} flex items-start gap-4 p-5 sm:p-6`}>
          <span className="rounded-xl bg-accent p-3 text-accent-foreground"><Ticket aria-hidden="true" className="h-6 w-6" /></span>
          <span className="min-w-0 flex-1"><span className="block text-base font-semibold">Trending offers</span><span className="mt-1 block text-sm leading-6 text-muted-foreground">Choose approved user posters, remove offers and change their order in Trending Near You.</span><span className="mt-3 block text-sm font-semibold text-primary">Choose trending offers →</span><span className="mt-2 block text-xs text-muted-foreground">Publish the selection to update the app.</span></span>
        </Link>
      </section>
      <aside className="rounded-2xl border bg-card p-5">
        <h2 className="text-sm font-semibold">Where changes appear</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Home screen sections, from top to bottom.</p>
        <div className="mt-4 space-y-2 rounded-2xl border bg-background p-3">
          <div className="px-2 py-2 text-xs text-muted-foreground">Location & profile</div>
          <Link to="/home-content" className={`${linkStyle} block p-3 text-sm font-medium`}>Carousel cards <ArrowRight aria-hidden="true" className="float-right h-4 w-4 text-primary" /></Link>
          <div className="px-2 py-2 text-xs text-muted-foreground">Search & filters</div>
          <Link to="/home-content" className={`${linkStyle} block p-3 text-sm font-medium`}>Top banner <ArrowRight aria-hidden="true" className="float-right h-4 w-4 text-primary" /></Link>
          <Link to="/home-showcase" className={`${linkStyle} block p-3 text-sm font-medium`}>Trending offers <ArrowRight aria-hidden="true" className="float-right h-4 w-4 text-primary" /></Link>
          <Link to="/home-content" className={`${linkStyle} block p-3 text-sm font-medium`}>Bottom banner <ArrowRight aria-hidden="true" className="float-right h-4 w-4 text-primary" /></Link>
        </div>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">Location, profile, search and filters are part of the app and cannot be edited here.</p>
      </aside>
    </div>
    <section className="space-y-3" aria-labelledby="other-content-tools"><h2 id="other-content-tools" className="text-base font-semibold">Dynamic UI — layout & appearance</h2><p className="text-sm text-muted-foreground">Use these tools to add extra screen sections, change app colors or schedule an experience.</p>
      <div className="grid gap-3 md:grid-cols-2">{tools.map(tool => <Link key={tool.to} to={tool.to} className={`${linkStyle} p-4`}><tool.icon aria-hidden="true" className="mb-3 h-5 w-5 text-primary" /><span className="block text-sm font-semibold">{tool.label}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{tool.description}</span></Link>)}</div>
    </section>
  </div>;
}
