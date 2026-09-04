import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCategoriesList, useToggleCategory } from '@/hooks/useCategories';
import { useSettingsList, useUpsertSetting } from '@/hooks/useSettings';
import type { AuthFlowContent, LoginAnnouncement, OnboardingSlideContent } from '@/types';

const AUTH_FLOW_CONTENT_KEY = 'mobile.authFlow.content';
const ANNOUNCEMENT_KEY = 'mobile.loginAnnouncement';

const EMPTY_ANNOUNCEMENT: LoginAnnouncement = {
  enabled: false,
  title: '',
  body: '',
  imageUrl: '',
  buttonLabel: '',
  buttonUrl: '',
};

const EMPTY_AUTH_FLOW: AuthFlowContent = {
  onboardingSlides: [],
  phoneEntry: { title: '', subtitle: '', sendOtpLabel: '' },
  otpVerification: { title: '', otpSentToLabel: '', resendLabel: '', verifyLabel: '' },
  profileSetup: { title: '', nameLabel: '', namePlaceholder: '', locationLabel: '', finishLabel: '' },
};

const EMPTY_SLIDE: OnboardingSlideContent = {
  title: '',
  accent: '',
  subtitle: '',
  icon: 'star',
  tint: 'orange',
  features: [],
};

// Curated so the mobile app never renders an invalid MaterialCommunityIcons name.
const ICON_OPTIONS = [
  'handshake',
  'hammer',
  'briefcase-search',
  'account-group',
  'broom',
  'account-switch',
  'briefcase',
  'map-marker-radius',
  'map-marker-check',
  'shield-check',
  'cash-fast',
  'account-hard-hat',
  'note-edit',
  'account-check',
  'account-search',
  'apps',
  'note-plus',
  'magnify',
  'chat',
  'wallet',
  'bell-ring',
  'lifebuoy',
  'check-circle',
  'check-decagram',
  'star',
  'cellphone-message',
  'shield-check-outline',
  'camera-plus',
];

const VALID_TABS = ['categories', 'content'] as const;
type SettingsTab = (typeof VALID_TABS)[number];

const CONTENT_SECTIONS = [
  { key: 'onboarding', label: 'Onboarding' },
  { key: 'login', label: 'Login Screens' },
  { key: 'home', label: 'Home Screen' },
  { key: 'announcement', label: 'Announcement' },
  { key: 'legal', label: 'Legal' },
] as const;
type ContentSection = (typeof CONTENT_SECTIONS)[number]['key'];

export const SettingsPage = () => {
  const { tab } = useParams<{ tab?: string }>();
  const navigate = useNavigate();
  const activeTab: SettingsTab = tab && VALID_TABS.includes(tab as SettingsTab) ? (tab as SettingsTab) : 'categories';
  const [activeSection, setActiveSection] = useState<ContentSection>('onboarding');
  const [expandedSlide, setExpandedSlide] = useState<number | null>(0);

  const { data: categories } = useCategoriesList();
  const toggleCategory = useToggleCategory();
  const { data: settings } = useSettingsList();
  const upsertSetting = useUpsertSetting();

  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const getContent = (key: string) => {
    if (drafts[key] !== undefined) return drafts[key];
    const setting = settings?.find((s) => s.key === key);
    return typeof setting?.value === 'string' ? setting.value : '';
  };

  const handleSaveContent = (key: string) => {
    upsertSetting.mutate(
      { key, type: 'content', value: getContent(key) },
      {
        onSuccess: () => toast.success('Saved.'),
        onError: () => toast.error('Failed to save.'),
      }
    );
  };

  const authFlowSetting = settings?.find((s) => s.key === AUTH_FLOW_CONTENT_KEY);
  const [authFlowDraft, setAuthFlowDraft] = useState<AuthFlowContent | undefined>(undefined);
  const authFlow: AuthFlowContent =
    authFlowDraft ?? (authFlowSetting?.value as AuthFlowContent | undefined) ?? EMPTY_AUTH_FLOW;

  const updateAuthFlow = (patch: Partial<AuthFlowContent>) => {
    setAuthFlowDraft({ ...authFlow, ...patch });
  };

  const updateSlide = (index: number, patch: Partial<OnboardingSlideContent>) => {
    const slides = authFlow.onboardingSlides.map((slide, i) => (i === index ? { ...slide, ...patch } : slide));
    updateAuthFlow({ onboardingSlides: slides });
  };

  const addSlide = () => {
    const nextIndex = authFlow.onboardingSlides.length;
    updateAuthFlow({ onboardingSlides: [...authFlow.onboardingSlides, { ...EMPTY_SLIDE, features: [] }] });
    setExpandedSlide(nextIndex);
  };

  const removeSlide = (index: number) => {
    updateAuthFlow({ onboardingSlides: authFlow.onboardingSlides.filter((_, i) => i !== index) });
    setExpandedSlide((current) => (current === index ? null : current));
  };

  const updateFeature = (slideIndex: number, featureIndex: number, patch: Partial<OnboardingSlideContent['features'][number]>) => {
    const slide = authFlow.onboardingSlides[slideIndex];
    const features = slide.features.map((feature, i) => (i === featureIndex ? { ...feature, ...patch } : feature));
    updateSlide(slideIndex, { features });
  };

  const addFeature = (slideIndex: number) => {
    const slide = authFlow.onboardingSlides[slideIndex];
    updateSlide(slideIndex, { features: [...slide.features, { icon: 'star', title: '', body: '' }] });
  };

  const removeFeature = (slideIndex: number, featureIndex: number) => {
    const slide = authFlow.onboardingSlides[slideIndex];
    updateSlide(slideIndex, { features: slide.features.filter((_, i) => i !== featureIndex) });
  };

  const handleSaveAuthFlow = () => {
    upsertSetting.mutate(
      { key: AUTH_FLOW_CONTENT_KEY, type: 'json', value: authFlow },
      {
        onSuccess: () => toast.success('Saved.'),
        onError: () => toast.error('Failed to save.'),
      }
    );
  };

  const announcementSetting = settings?.find((s) => s.key === ANNOUNCEMENT_KEY);
  const [announcementDraft, setAnnouncementDraft] = useState<LoginAnnouncement | undefined>(undefined);
  const announcement =
    announcementDraft ?? (announcementSetting?.value as LoginAnnouncement | undefined) ?? EMPTY_ANNOUNCEMENT;

  const updateAnnouncement = (patch: Partial<LoginAnnouncement>) => {
    setAnnouncementDraft({ ...announcement, ...patch });
  };

  const handleSaveAnnouncement = () => {
    upsertSetting.mutate(
      { key: ANNOUNCEMENT_KEY, type: 'json', value: announcement },
      {
        onSuccess: () => toast.success('Saved.'),
        onError: () => toast.error('Failed to save.'),
      }
    );
  };

  return (
    <div>
      <PageHeader title="App Settings" description="Toggle features and edit static content." />

      <Tabs value={activeTab} onValueChange={(value) => navigate(`/settings/${value}`)}>
        <TabsList>
          <TabsTrigger value="categories">Category Toggles</TabsTrigger>
          <TabsTrigger value="content">Static Content</TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="mt-4 space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Enable / disable categories</CardTitle>
              <CardDescription>Disabling a category hides it platform-wide immediately.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {categories?.map((category) => (
                <div key={category._id} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                  <Label htmlFor={`toggle-${category._id}`}>{category.name}</Label>
                  <Switch
                    id={`toggle-${category._id}`}
                    checked={category.isActive}
                    onCheckedChange={() => toggleCategory.mutate(category._id)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content" className="mt-4">
          <div className="flex flex-wrap gap-2 border-b pb-3">
            {CONTENT_SECTIONS.map((section) => (
              <button
                key={section.key}
                type="button"
                onClick={() => setActiveSection(section.key)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  activeSection === section.key
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/70'
                }`}
              >
                {section.label}
              </button>
            ))}
          </div>

          {activeSection === 'onboarding' && (
            <div className="mt-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Onboarding Slides</CardTitle>
                  <CardDescription>
                    Every slide shown before login. Add or remove slides freely — the app renders exactly what's here.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {authFlow.onboardingSlides.map((slide, slideIndex) => {
                    const isOpen = expandedSlide === slideIndex;
                    return (
                      <div key={slideIndex} className="rounded-md border">
                        <button
                          type="button"
                          onClick={() => setExpandedSlide(isOpen ? null : slideIndex)}
                          className="flex w-full items-center justify-between p-3 text-left"
                        >
                          <span className="flex items-center gap-2 text-sm font-semibold">
                            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            Slide {slideIndex + 1}
                            {slide.title ? `: ${slide.title}` : ''}
                          </span>
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation();
                              removeSlide(slideIndex);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.stopPropagation();
                                removeSlide(slideIndex);
                              }
                            }}
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                          >
                            <Trash2 className="h-4 w-4" />
                          </span>
                        </button>

                        {isOpen && (
                          <div className="space-y-3 border-t p-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label>Title</Label>
                                <Input value={slide.title} onChange={(e) => updateSlide(slideIndex, { title: e.target.value })} />
                              </div>
                              <div className="space-y-1">
                                <Label>Accent (highlighted word)</Label>
                                <Input value={slide.accent} onChange={(e) => updateSlide(slideIndex, { accent: e.target.value })} />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <Label>Subtitle</Label>
                              <Input value={slide.subtitle} onChange={(e) => updateSlide(slideIndex, { subtitle: e.target.value })} />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label>Icon</Label>
                                <Select value={slide.icon} onValueChange={(value) => updateSlide(slideIndex, { icon: value })}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Icon" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {ICON_OPTIONS.map((icon) => (
                                      <SelectItem key={icon} value={icon}>
                                        {icon}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1">
                                <Label>Tint</Label>
                                <Select
                                  value={slide.tint}
                                  onValueChange={(value) => updateSlide(slideIndex, { tint: value as 'orange' | 'green' })}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Tint" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="orange">Orange</SelectItem>
                                    <SelectItem value="green">Green</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label>Features</Label>
                              {slide.features.map((feature, featureIndex) => (
                                <div key={featureIndex} className="flex items-center gap-2">
                                  <Select
                                    value={feature.icon || 'star'}
                                    onValueChange={(value) => updateFeature(slideIndex, featureIndex, { icon: value })}
                                  >
                                    <SelectTrigger className="w-32 shrink-0">
                                      <SelectValue placeholder="Icon" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {ICON_OPTIONS.map((icon) => (
                                        <SelectItem key={icon} value={icon}>
                                          {icon}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Input
                                    placeholder="Feature title"
                                    value={feature.title}
                                    onChange={(e) => updateFeature(slideIndex, featureIndex, { title: e.target.value })}
                                  />
                                  <Input
                                    placeholder="Feature body (optional)"
                                    value={feature.body}
                                    onChange={(e) => updateFeature(slideIndex, featureIndex, { body: e.target.value })}
                                  />
                                  <Button variant="ghost" size="sm" onClick={() => removeFeature(slideIndex, featureIndex)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                              <Button variant="outline" size="sm" onClick={() => addFeature(slideIndex)}>
                                <Plus className="mr-1 h-4 w-4" /> Add Feature
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <Button variant="outline" size="sm" onClick={addSlide}>
                    <Plus className="mr-1 h-4 w-4" /> Add Slide
                  </Button>
                  <div>
                    <Button size="sm" onClick={handleSaveAuthFlow} disabled={upsertSetting.isPending}>
                      Save Onboarding Slides
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeSection === 'login' && (
            <div className="mt-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Phone Entry Screen</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <Label>Title</Label>
                    <Input
                      value={authFlow.phoneEntry.title}
                      onChange={(e) => updateAuthFlow({ phoneEntry: { ...authFlow.phoneEntry, title: e.target.value } })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Subtitle</Label>
                    <Input
                      value={authFlow.phoneEntry.subtitle}
                      onChange={(e) => updateAuthFlow({ phoneEntry: { ...authFlow.phoneEntry, subtitle: e.target.value } })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Send OTP Button Label</Label>
                    <Input
                      value={authFlow.phoneEntry.sendOtpLabel}
                      onChange={(e) => updateAuthFlow({ phoneEntry: { ...authFlow.phoneEntry, sendOtpLabel: e.target.value } })}
                    />
                  </div>
                  <Button size="sm" onClick={handleSaveAuthFlow} disabled={upsertSetting.isPending}>
                    Save Phone Entry
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">OTP Verification Screen</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <Label>Title</Label>
                    <Input
                      value={authFlow.otpVerification.title}
                      onChange={(e) =>
                        updateAuthFlow({ otpVerification: { ...authFlow.otpVerification, title: e.target.value } })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>"OTP sent to" label</Label>
                    <Input
                      value={authFlow.otpVerification.otpSentToLabel}
                      onChange={(e) =>
                        updateAuthFlow({ otpVerification: { ...authFlow.otpVerification, otpSentToLabel: e.target.value } })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Resend Button Label</Label>
                    <Input
                      value={authFlow.otpVerification.resendLabel}
                      onChange={(e) =>
                        updateAuthFlow({ otpVerification: { ...authFlow.otpVerification, resendLabel: e.target.value } })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Verify Button Label</Label>
                    <Input
                      value={authFlow.otpVerification.verifyLabel}
                      onChange={(e) =>
                        updateAuthFlow({ otpVerification: { ...authFlow.otpVerification, verifyLabel: e.target.value } })
                      }
                    />
                  </div>
                  <Button size="sm" onClick={handleSaveAuthFlow} disabled={upsertSetting.isPending}>
                    Save OTP Verification
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Profile Setup Screen</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <Label>Title</Label>
                    <Input
                      value={authFlow.profileSetup.title}
                      onChange={(e) => updateAuthFlow({ profileSetup: { ...authFlow.profileSetup, title: e.target.value } })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Name Field Label</Label>
                    <Input
                      value={authFlow.profileSetup.nameLabel}
                      onChange={(e) => updateAuthFlow({ profileSetup: { ...authFlow.profileSetup, nameLabel: e.target.value } })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Name Field Placeholder</Label>
                    <Input
                      value={authFlow.profileSetup.namePlaceholder}
                      onChange={(e) =>
                        updateAuthFlow({ profileSetup: { ...authFlow.profileSetup, namePlaceholder: e.target.value } })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Location Section Label</Label>
                    <Input
                      value={authFlow.profileSetup.locationLabel}
                      onChange={(e) =>
                        updateAuthFlow({ profileSetup: { ...authFlow.profileSetup, locationLabel: e.target.value } })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Finish Button Label</Label>
                    <Input
                      value={authFlow.profileSetup.finishLabel}
                      onChange={(e) => updateAuthFlow({ profileSetup: { ...authFlow.profileSetup, finishLabel: e.target.value } })}
                    />
                  </div>
                  <Button size="sm" onClick={handleSaveAuthFlow} disabled={upsertSetting.isPending}>
                    Save Profile Setup
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {activeSection === 'home' && (
            <div className="mt-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Splash Tagline</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <textarea
                    className="min-h-[100px] w-full rounded-md border bg-background p-3 text-sm"
                    value={getContent('mobile.splash.tagline')}
                    onChange={(e) => setDrafts((prev) => ({ ...prev, ['mobile.splash.tagline']: e.target.value }))}
                  />
                  <Button size="sm" onClick={() => handleSaveContent('mobile.splash.tagline')} disabled={upsertSetting.isPending}>
                    Save Splash Tagline
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Home Hero</CardTitle>
                  <CardDescription>Shown at the top of the home feed and reused as the onboarding illustration.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <Label>Headline</Label>
                    <textarea
                      className="min-h-[80px] w-full rounded-md border bg-background p-3 text-sm"
                      value={getContent('mobile.home.heroHeadline')}
                      onChange={(e) => setDrafts((prev) => ({ ...prev, ['mobile.home.heroHeadline']: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Subhead</Label>
                    <textarea
                      className="min-h-[80px] w-full rounded-md border bg-background p-3 text-sm"
                      value={getContent('mobile.home.heroSubhead')}
                      onChange={(e) => setDrafts((prev) => ({ ...prev, ['mobile.home.heroSubhead']: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Image URL</Label>
                    <Input
                      value={getContent('mobile.home.heroImageUrl')}
                      onChange={(e) => setDrafts((prev) => ({ ...prev, ['mobile.home.heroImageUrl']: e.target.value }))}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleSaveContent('mobile.home.heroHeadline')} disabled={upsertSetting.isPending}>
                      Save Headline
                    </Button>
                    <Button size="sm" onClick={() => handleSaveContent('mobile.home.heroSubhead')} disabled={upsertSetting.isPending}>
                      Save Subhead
                    </Button>
                    <Button size="sm" onClick={() => handleSaveContent('mobile.home.heroImageUrl')} disabled={upsertSetting.isPending}>
                      Save Image URL
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeSection === 'announcement' && (
            <div className="mt-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Login Announcement Popup</CardTitle>
                  <CardDescription>Shown once per login on the mobile app's home screen.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between border-b pb-3">
                    <Label htmlFor="announcement-enabled">Enabled</Label>
                    <Switch
                      id="announcement-enabled"
                      checked={announcement.enabled}
                      onCheckedChange={(checked) => updateAnnouncement({ enabled: checked })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="announcement-title">Title</Label>
                    <Input
                      id="announcement-title"
                      value={announcement.title}
                      onChange={(e) => updateAnnouncement({ title: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="announcement-body">Body</Label>
                    <textarea
                      id="announcement-body"
                      className="min-h-[100px] w-full rounded-md border bg-background p-3 text-sm"
                      value={announcement.body}
                      onChange={(e) => updateAnnouncement({ body: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="announcement-image">Image URL</Label>
                    <Input
                      id="announcement-image"
                      value={announcement.imageUrl}
                      onChange={(e) => updateAnnouncement({ imageUrl: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="announcement-button-label">Button Label (optional)</Label>
                    <Input
                      id="announcement-button-label"
                      value={announcement.buttonLabel}
                      onChange={(e) => updateAnnouncement({ buttonLabel: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="announcement-button-url">Button URL (optional)</Label>
                    <Input
                      id="announcement-button-url"
                      value={announcement.buttonUrl}
                      onChange={(e) => updateAnnouncement({ buttonUrl: e.target.value })}
                    />
                  </div>
                  <Button size="sm" onClick={handleSaveAnnouncement} disabled={upsertSetting.isPending}>
                    Save Announcement
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {activeSection === 'legal' && (
            <div className="mt-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Terms & Conditions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <textarea
                    className="min-h-[240px] w-full rounded-md border bg-background p-3 text-sm"
                    value={getContent('terms')}
                    onChange={(e) => setDrafts((prev) => ({ ...prev, terms: e.target.value }))}
                  />
                  <Button size="sm" onClick={() => handleSaveContent('terms')} disabled={upsertSetting.isPending}>
                    Save Terms & Conditions
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">FAQs</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <textarea
                    className="min-h-[240px] w-full rounded-md border bg-background p-3 text-sm"
                    value={getContent('faq')}
                    onChange={(e) => setDrafts((prev) => ({ ...prev, faq: e.target.value }))}
                  />
                  <Button size="sm" onClick={() => handleSaveContent('faq')} disabled={upsertSetting.isPending}>
                    Save FAQs
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
