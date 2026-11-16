import { useState } from 'react';
import { ArrowCounterClockwise, Moon, Sun } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DesignStudioShell } from '@/components/hyperlocal/DesignStudioShell';
import { UIPhonePreview } from '@/components/hyperlocal/UIPhonePreview';
import { UIReleaseControls } from '@/components/hyperlocal/UIReleaseControls';
import { useUIWorkspace } from '@/hooks/useUIWorkspace';
import { palettes, themePresets, type UITheme } from '@/utils/uiConfigSchema';
import type { UIColorKey } from '../../../../../mobile/frontend/src/types/dynamicUI';
import { cn } from '@/lib/utils';

const COLOR_GROUPS: { name: string; description: string; keys: UIColorKey[] }[] = [
  {
    name: 'Brand & Accents',
    description: 'Core interactive and emphasis colors',
    keys: ['primary', 'primaryBright', 'primaryDark', 'accent'],
  },
  {
    name: 'Surfaces & Backgrounds',
    description: 'Containers, canvases and elevated cards',
    keys: ['background', 'surface', 'backdropStart', 'backdropEnd'],
  },
  {
    name: 'Typography & Text',
    description: 'High and medium contrast reading tokens',
    keys: ['text', 'textSecondary'],
  },
  {
    name: 'Borders & Geometry',
    description: 'Dividers, subtle outlines and borders',
    keys: ['border'],
  },
];

export function ThemeStudioPage() {
  const w = useUIWorkspace('theme', 'global');
  const [mode, setMode] = useState<'light' | 'dark'>('light');
  const config = w.config as UITheme;

  const change = (key: UIColorKey, value: string) =>
    w.setConfig({
      ...config,
      modes: {
        ...config.modes,
        [mode]: { colors: { ...config.modes[mode].colors, [key]: value } },
      },
    });

  const reset = (key: UIColorKey) => {
    const colors = { ...config.modes[mode].colors };
    delete colors[key];
    w.setConfig({
      ...config,
      modes: { ...config.modes, [mode]: { colors } },
    });
  };

  return (
    <DesignStudioShell
      title="App colors"
      description="Edit a private draft, preview both modes and publish a versioned theme."
      activeTab="theme"
    >
      <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_420px]">
        {/* Left Column: Theme Controls */}
        <fieldset disabled={w.busy || !w.ready} className="min-w-0 space-y-6">
          {/* Preset Palettes */}
          <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-foreground">Theme Presets</h2>
                <p className="text-xs text-muted-foreground">
                  Quickly apply curated regional and festival color palettes
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2.5">
              {Object.entries(themePresets).map(([name, preset]) => {
                const presetPrimary = preset.modes[mode]?.colors?.primary || palettes[mode].primary;
                const presetBg = preset.modes[mode]?.colors?.background || palettes[mode].background;

                return (
                  <Button
                    key={name}
                    variant="outline"
                    type="button"
                    onClick={() => w.setConfig(structuredClone(preset))}
                    className="group relative flex items-center gap-2.5 rounded-xl px-3.5 py-2 text-xs font-semibold hover:border-primary transition-all"
                  >
                    <span className="flex -space-x-1">
                      <span
                        className="inline-block h-3.5 w-3.5 rounded-full ring-1 ring-background"
                        style={{ backgroundColor: presetPrimary }}
                      />
                      <span
                        className="inline-block h-3.5 w-3.5 rounded-full ring-1 ring-background"
                        style={{ backgroundColor: presetBg }}
                      />
                    </span>
                    <span>{name}</span>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Custom Theme Editor */}
          <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-5">
            {/* Header & Mode Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
              <div>
                <h2 className="text-base font-bold text-foreground">Custom Theme Tokens</h2>
                <p className="text-xs text-muted-foreground">
                  Fine-tune individual tokens for {mode} mode
                </p>
              </div>

              {/* Mode Segmented Control & accessible select */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground">Mode</span>
                <div className="flex items-center rounded-xl bg-muted/70 p-1 border border-border/60">
                  <button
                    type="button"
                    onClick={() => setMode('light')}
                    className={cn(
                      'flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all',
                      mode === 'light'
                        ? 'bg-card text-foreground shadow-xs ring-1 ring-border/50'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {Sun && <Sun className="h-3.5 w-3.5 text-amber-500" />}
                    Light
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('dark')}
                    className={cn(
                      'flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all',
                      mode === 'dark'
                        ? 'bg-card text-foreground shadow-xs ring-1 ring-border/50'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {Moon && <Moon className="h-3.5 w-3.5 text-indigo-400" />}
                    Dark
                  </button>
                </div>

                {/* Accessible select for test queries */}
                <select
                  aria-label="Theme mode"
                  value={mode}
                  onChange={(e) => setMode(e.target.value as typeof mode)}
                  className="sr-only"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>
            </div>

            <p className="text-xs leading-relaxed text-muted-foreground">
              Colors inherit the app palette until overridden. Both modes must pass contrast validation. Typography, secondary/status colors, spacing, shadows and geometry keep their native values in contract v1.
            </p>

            {/* Categorized Token Groups */}
            <div className="space-y-5">
              {COLOR_GROUPS.map((group) => (
                <div key={group.name} className="space-y-3">
                  <div className="flex items-baseline justify-between border-b border-border/40 pb-1.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
                      {group.name}
                    </h3>
                    <span className="text-[11px] text-muted-foreground">
                      {group.description}
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {group.keys.map((key) => {
                      const isOverridden = Boolean(config.modes[mode].colors[key]);
                      const currentColor =
                        /^#[a-fA-F0-9]{6}$/.test(config.modes[mode].colors[key] || '')
                          ? config.modes[mode].colors[key]
                          : palettes[mode][key];

                      return (
                        <div
                          key={key}
                          className={cn(
                            'rounded-xl border p-3 transition-colors space-y-2 bg-card',
                            isOverridden
                              ? 'border-primary/40 shadow-xs'
                              : 'border-border/60 hover:border-border'
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-foreground">
                              {key.replace(/([A-Z])/g, ' $1')}
                            </span>
                            {isOverridden ? (
                              <span className="rounded bg-primary/10 px-1.5 py-0.2 text-[9px] font-bold text-primary">
                                Custom
                              </span>
                            ) : (
                              <span className="text-[9px] font-medium text-muted-foreground">
                                Default
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Color picker input */}
                            <div className="relative shrink-0">
                              <input
                                type="color"
                                aria-label={`${key} color`}
                                className="h-9 w-9 cursor-pointer rounded-lg border border-input p-0.5 bg-background shadow-xs"
                                value={currentColor}
                                onChange={(e) => change(key, e.target.value)}
                              />
                            </div>

                            {/* Hex input */}
                            <Input
                              aria-label={`${key} hex value`}
                              value={config.modes[mode].colors[key] ?? ''}
                              placeholder={palettes[mode][key]}
                              maxLength={7}
                              className="h-9 font-mono text-xs uppercase"
                              onChange={(e) =>
                                e.target.value ? change(key, e.target.value) : reset(key)
                              }
                            />

                            {/* Reset button */}
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              aria-label={`Reset ${key}`}
                              disabled={!isOverridden}
                              onClick={() => reset(key)}
                              className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground"
                            >
                              {ArrowCounterClockwise && <ArrowCounterClockwise className="h-3.5 w-3.5" />}
                              <span className="sr-only sm:not-sr-only sm:text-[11px]">Reset</span>
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </fieldset>

        {/* Right Column: Sticky Mobile Phone Preview */}
        <aside className="xl:sticky xl:top-6 space-y-4">
          <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Live Interactive Preview
              </span>
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold text-primary capitalize">
                {mode} mode
              </span>
            </div>

            <div className="flex justify-center py-2">
              <UIPhonePreview
                theme={config}
                page={w.base.pages.offersHome}
                mode={mode}
              />
            </div>

            <p className="text-center text-[11px] text-muted-foreground">
              Renders real Native theme tokens on simulated iOS/Android frame.
            </p>
          </div>
        </aside>
      </div>

      {/* Release Controls Bar */}
      <UIReleaseControls workspace={w} />
    </DesignStudioShell>
  );
}
