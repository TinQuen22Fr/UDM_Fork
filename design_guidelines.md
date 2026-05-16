{
  "design_system_name": "UDM SQM Control — Astronomer Night Ops",
  "brand_attributes": [
    "professional",
    "trustworthy",
    "night-friendly",
    "dense-but-readable",
    "instrument-grade",
    "mission-control calm"
  ],
  "visual_personality": {
    "north_star": "Space observatory console: matte near-black surfaces, subtle indigo depth, crisp mono telemetry, restrained accents.",
    "avoid": [
      "neon sci-fi HUD clutter",
      "large gradients",
      "centered marketing layouts",
      "purple/pink gradients",
      "glow everywhere"
    ],
    "signature_motif": "Subtle starfield/noise overlay + thin gridlines + pill status chips + mono telemetry blocks."
  },
  "typography": {
    "font_pairing": {
      "ui": {
        "google_font": "Space Grotesk",
        "fallback": "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu",
        "usage": "Navigation, headings, labels, buttons"
      },
      "mono": {
        "google_font": "IBM Plex Mono",
        "fallback": "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono",
        "usage": "All measurements, ports, baud, timestamps, logs, console"
      }
    },
    "scale_tailwind": {
      "h1": "text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight",
      "h2": "text-base md:text-lg font-medium text-muted-foreground",
      "section_title": "text-sm font-semibold tracking-wide uppercase text-muted-foreground",
      "body": "text-sm md:text-base leading-relaxed",
      "caption": "text-xs text-muted-foreground",
      "telemetry_value": "font-mono text-2xl md:text-3xl font-semibold tabular-nums",
      "telemetry_unit": "font-mono text-xs text-muted-foreground"
    },
    "rules": [
      "Use mono for any numeric readout (mpsas, counts, Hz, °C, timestamps).",
      "Prefer tabular numbers (tabular-nums) for stable alignment.",
      "Keep labels short; use tooltips for long explanations."
    ]
  },
  "design_tokens": {
    "css_custom_properties": {
      "notes": "Implement tokens in /app/frontend/src/index.css under :root and .dark plus a new .night-vision class. Keep shadcn HSL format.",
      "base_dark_theme_hsl": {
        "--background": "222 35% 6%",
        "--foreground": "210 20% 96%",
        "--card": "223 30% 9%",
        "--card-foreground": "210 20% 96%",
        "--popover": "223 30% 9%",
        "--popover-foreground": "210 20% 96%",
        "--primary": "198 88% 55%",
        "--primary-foreground": "222 35% 6%",
        "--secondary": "223 22% 14%",
        "--secondary-foreground": "210 20% 96%",
        "--muted": "223 18% 16%",
        "--muted-foreground": "215 16% 70%",
        "--accent": "223 22% 14%",
        "--accent-foreground": "210 20% 96%",
        "--destructive": "0 72% 52%",
        "--destructive-foreground": "210 20% 96%",
        "--border": "223 18% 20%",
        "--input": "223 18% 20%",
        "--ring": "198 88% 55%",
        "--radius": "0.75rem",
        "--chart-1": "198 88% 55%",
        "--chart-2": "160 60% 45%",
        "--chart-3": "43 74% 66%",
        "--chart-4": "210 18% 78%",
        "--chart-5": "14 80% 60%"
      },
      "night_vision_theme_hsl": {
        "selector": ".night-vision",
        "--background": "0 60% 3%",
        "--foreground": "0 35% 88%",
        "--card": "0 55% 6%",
        "--card-foreground": "0 35% 88%",
        "--popover": "0 55% 6%",
        "--popover-foreground": "0 35% 88%",
        "--primary": "0 78% 52%",
        "--primary-foreground": "0 60% 3%",
        "--secondary": "0 45% 10%",
        "--secondary-foreground": "0 35% 88%",
        "--muted": "0 40% 12%",
        "--muted-foreground": "0 22% 72%",
        "--accent": "0 45% 10%",
        "--accent-foreground": "0 35% 88%",
        "--destructive": "0 78% 52%",
        "--destructive-foreground": "0 60% 3%",
        "--border": "0 35% 16%",
        "--input": "0 35% 16%",
        "--ring": "0 78% 52%",
        "--chart-1": "0 78% 52%",
        "--chart-2": "0 55% 70%",
        "--chart-3": "0 35% 82%",
        "--chart-4": "0 25% 60%",
        "--chart-5": "0 45% 40%"
      },
      "extended_tokens": {
        "--shadow-elev-1": "0 1px 0 hsl(var(--border) / 0.6), 0 10px 30px rgba(0,0,0,0.35)",
        "--shadow-elev-2": "0 1px 0 hsl(var(--border) / 0.7), 0 18px 50px rgba(0,0,0,0.45)",
        "--gridline": "hsl(var(--border) / 0.55)",
        "--noise-opacity": "0.06",
        "--focus-outline": "0 0 0 3px hsl(var(--ring) / 0.35)",
        "--telemetry-good": "160 60% 45%",
        "--telemetry-warn": "43 74% 66%",
        "--telemetry-bad": "0 72% 52%",
        "--telemetry-idle": "215 16% 70%"
      }
    },
    "spacing": {
      "philosophy": "2–3x more spacing than typical admin dashboards; dense data is grouped, not cramped.",
      "container": "px-4 sm:px-6 lg:px-8",
      "panel_gap": "gap-4 lg:gap-6",
      "card_padding": "p-4 sm:p-5",
      "kpi_gap": "gap-3",
      "table_density_modes": {
        "compact": "text-xs leading-5",
        "regular": "text-sm leading-6",
        "comfortable": "text-sm leading-7"
      }
    },
    "radii": {
      "app": "rounded-2xl",
      "card": "rounded-xl",
      "control": "rounded-lg",
      "chip": "rounded-full"
    }
  },
  "layout": {
    "app_shell": {
      "pattern": "Sidebar + Topbar + Content",
      "sidebar": {
        "width": "w-[280px]",
        "mobile": "Use Sheet (drawer) with hamburger",
        "sections": [
          "Connection",
          "Information",
          "Readings",
          "Logging",
          "Charts",
          "Configuration",
          "Firmware",
          "Console",
          "Help"
        ]
      },
      "topbar": {
        "height": "h-14",
        "contents": [
          "Device status chip (Connected/Disconnected)",
          "Model + Port",
          "Live mini indicators (Temp, RSSI if available)",
          "Night Vision toggle",
          "Density toggle (Compact/Regular)",
          "Time range selector for charts"
        ],
        "behavior": "Sticky topbar with subtle blur; never large gradients."
      },
      "content_grid": {
        "default": "grid grid-cols-1 xl:grid-cols-12 gap-4 lg:gap-6",
        "recommended_split": {
          "left": "xl:col-span-4",
          "right": "xl:col-span-8"
        }
      }
    },
    "page_templates": {
      "connection": "Left: device discovery + port list. Right: connection settings + connect button + recent devices.",
      "readings": "Top KPI strip (mpsas, temp, counts, Hz). Below: live table + mini chart.",
      "logging": "Card: file path + format + start/stop + rolling status. Below: recent sessions table.",
      "charts": "Main chart canvas with series toggles + smoothing toggle + export PNG/CSV.",
      "firmware": "Stepper-like layout: select file -> validate -> flash -> verify; show progress + logs.",
      "console": "Split: terminal output (ScrollArea) + input row; command presets as chips.",
      "help": "Accordion FAQ + troubleshooting checklist + copy diagnostics button."
    }
  },
  "components": {
    "component_path": {
      "shadcn_primary": "/app/frontend/src/components/ui",
      "use_components": [
        { "name": "button", "path": "components/ui/button.jsx" },
        { "name": "card", "path": "components/ui/card.jsx" },
        { "name": "badge", "path": "components/ui/badge.jsx" },
        { "name": "tabs", "path": "components/ui/tabs.jsx" },
        { "name": "table", "path": "components/ui/table.jsx" },
        { "name": "progress", "path": "components/ui/progress.jsx" },
        { "name": "switch", "path": "components/ui/switch.jsx" },
        { "name": "select", "path": "components/ui/select.jsx" },
        { "name": "dialog", "path": "components/ui/dialog.jsx" },
        { "name": "sheet", "path": "components/ui/sheet.jsx" },
        { "name": "scroll-area", "path": "components/ui/scroll-area.jsx" },
        { "name": "separator", "path": "components/ui/separator.jsx" },
        { "name": "tooltip", "path": "components/ui/tooltip.jsx" },
        { "name": "accordion", "path": "components/ui/accordion.jsx" },
        { "name": "calendar", "path": "components/ui/calendar.jsx" },
        { "name": "sonner", "path": "components/ui/sonner.jsx" }
      ]
    },
    "buttons": {
      "style": "Professional / mission-control",
      "variants": {
        "primary": "Use Button default with bg-primary text-primary-foreground; hover: bg-primary/90; active: translate-y-px",
        "secondary": "Use secondary variant; hover: bg-secondary/80",
        "ghost": "Use ghost for icon buttons; hover: bg-accent/60",
        "destructive": "Use destructive for disconnect/erase; confirm via AlertDialog"
      },
      "sizes": {
        "sm": "h-8 px-3 text-xs",
        "md": "h-9 px-4 text-sm",
        "lg": "h-10 px-5 text-sm"
      },
      "micro_interactions": [
        "Hover: subtle brightness + border emphasis (no transition:all).",
        "Press: scale-[0.98] and translate-y-px.",
        "Loading: inline spinner left of label; keep width stable."
      ]
    },
    "status_badges": {
      "connected": "Badge with bg-[hsl(var(--telemetry-good))]/15 text-[hsl(var(--telemetry-good))] border border-[hsl(var(--telemetry-good))]/30",
      "disconnected": "Badge with bg-muted text-muted-foreground border",
      "warning": "Badge with bg-[hsl(var(--telemetry-warn))]/15 text-[hsl(var(--telemetry-warn))] border border-[hsl(var(--telemetry-warn))]/30",
      "error": "Badge with bg-destructive/15 text-destructive border border-destructive/30"
    },
    "forms": {
      "inputs": "Use Input + Label. Add helper text as text-xs text-muted-foreground.",
      "port_picker": "Use Select for port list; include vendor chip (FTDI/CH340) in item label.",
      "validation": "Inline error text with data-testid='form-error-text' and role='alert'."
    },
    "tables": {
      "style": "Dense, sticky header, mono numeric columns.",
      "rules": [
        "Use Table component; header row: bg-card/60 backdrop-blur supports sticky.",
        "First column can be sticky for timestamps.",
        "Numeric columns: font-mono tabular-nums text-right.",
        "Row hover: bg-accent/40."
      ]
    },
    "dialogs_drawers": {
      "device_discovery": "Dialog for advanced filters (VID/PID, show all ports).",
      "mobile_sidebar": "Sheet from left.",
      "confirmations": "AlertDialog for disconnect, erase config, flash firmware."
    },
    "toasts": {
      "library": "sonner",
      "usage": "Use for connect/disconnect, logging started/stopped, firmware flash success/fail. Keep copy short and actionable."
    }
  },
  "charts": {
    "library": "Recharts",
    "style": {
      "canvas": "Card with subtle border; no gradients. Use thin gridlines and muted axes.",
      "grid": "stroke: var(--gridline), strokeDasharray: '3 6'",
      "axes": "tick fill: hsl(var(--muted-foreground)); axisLine: false; tickLine: false",
      "series": {
        "mpsas": "stroke: hsl(var(--chart-1)); strokeWidth: 2",
        "temperature": "stroke: hsl(var(--chart-2)); strokeWidth: 2",
        "counts": "stroke: hsl(var(--chart-5)); strokeWidth: 1.5"
      },
      "tooltip": "Use custom tooltip: bg-card/95 border border-border shadow-[var(--shadow-elev-1)] rounded-lg p-3; values in mono.",
      "interaction": [
        "Brush for time range (optional).",
        "Legend as ToggleGroup to show/hide series.",
        "Smoothing toggle (monotone) vs linear for raw truth."
      ]
    },
    "accessibility": [
      "Enable Recharts accessibilityLayer where available.",
      "Provide a text summary below chart (min/max/avg) with data-testid='chart-summary'."
    ]
  },
  "motion": {
    "library": "framer-motion (recommended)",
    "install": "npm i framer-motion",
    "principles": [
      "Motion is functional: reveal hierarchy, confirm actions, show live updates without jitter.",
      "Respect prefers-reduced-motion: reduce."
    ],
    "patterns": {
      "page_enter": "fade + slight y (8px) over 180ms",
      "card_hover": "shadow intensifies (no transform on large tables)",
      "live_value_update": "brief background pulse using bg-primary/10 for 120ms when value changes",
      "connection_state": "status chip crossfade + subtle dot ping"
    }
  },
  "micro_interactions": {
    "night_vision_toggle": {
      "behavior": "Switch toggles .night-vision class on <html> or <body>. Persist in localStorage.",
      "safety": "When enabled, reduce overall brightness: lower foreground contrast slightly; avoid white highlights."
    },
    "device_discovery": {
      "behavior": "Scan button shows Progress bar + rotating icon; results animate in with stagger.",
      "empty_state": "Show Skeleton rows then an empty card with troubleshooting link."
    },
    "logging": {
      "behavior": "Start logging button becomes Stop (destructive) with elapsed timer chip.",
      "file_path": "Copy-to-clipboard icon button with toast confirmation."
    },
    "firmware": {
      "behavior": "Progress component with percent + stage label; disable navigation during flash; show log tail in ScrollArea."
    },
    "console": {
      "behavior": "Enter sends command; show echo line; errors highlighted; auto-scroll toggle."
    }
  },
  "accessibility": {
    "requirements": [
      "WCAG AA contrast for text on surfaces in both themes.",
      "Visible focus ring using --ring and --focus-outline.",
      "Keyboard navigation for sidebar, tabs, dialogs.",
      "Do not rely on color alone for status: pair with icon + label."
    ],
    "reduced_motion": "Wrap motion with prefers-reduced-motion checks; disable pulsing backgrounds."
  },
  "data_testid_conventions": {
    "rule": "All interactive and key informational elements MUST include data-testid.",
    "naming": "kebab-case describing role",
    "examples": [
      "data-testid='sidebar-connection-link'",
      "data-testid='device-scan-button'",
      "data-testid='port-select'",
      "data-testid='baudrate-select'",
      "data-testid='connect-toggle-button'",
      "data-testid='device-status-badge'",
      "data-testid='live-mpsas-value'",
      "data-testid='logging-start-button'",
      "data-testid='firmware-flash-button'",
      "data-testid='console-send-button'",
      "data-testid='help-copy-diagnostics-button'"
    ]
  },
  "imagery": {
    "image_urls": [
      {
        "category": "app-shell-background",
        "description": "Optional subtle starfield background image used ONLY as a faint overlay (opacity 4–7%) behind the entire app. Must not reduce readability.",
        "url": "https://images.unsplash.com/photo-1570284613060-766c33850e00?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Njl8MHwxfHNlYXJjaHwxfHxzdGFycnklMjBuaWdodCUyMHNreSUyMGJhY2tncm91bmR8ZW58MHx8fGJsdWV8MTc3ODkyNTkyOHww&ixlib=rb-4.1.0&q=85"
      },
      {
        "category": "help-empty-state",
        "description": "Use as a subtle header image in Help page (max 160px height) with dark overlay; keep gradients under 20% viewport.",
        "url": "https://images.unsplash.com/photo-1595178302776-fa04e6d45879?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Njl8MHwxfHNlYXJjaHwyfHxzdGFycnklMjBuaWdodCUyMHNreSUyMGJhY2tncm91bmR8ZW58MHx8fGJsdWV8MTc3ODkyNTkyOHww&ixlib=rb-4.1.0&q=85"
      },
      {
        "category": "night-vision-texture",
        "description": "Optional very subtle texture for night-vision mode panels (opacity 3–5%). Prefer CSS noise; if using image, keep it extremely faint.",
        "url": "https://images.unsplash.com/flagged/photo-1593005510509-d05b264f1c9c?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1OTV8MHwxfHNlYXJjaHwxfHxyZWQlMjBkYXJrJTIwdGV4dHVyZSUyMG5vaXNlJTIwYmFja2dyb3VuZHxlbnwwfHx8cmVkfDE3Nzg5MjU5MzJ8MA&ixlib=rb-4.1.0&q=85"
      }
    ]
  },
  "instructions_to_main_agent": {
    "global_css_updates": [
      "Replace default :root/.dark tokens in /app/frontend/src/index.css with the base_dark_theme_hsl tokens above; keep light theme optional but default app should mount with class 'dark'.",
      "Add a '.night-vision' class alongside '.dark' that overrides tokens (night_vision_theme_hsl).",
      "Add font imports in index.html or via CSS @import for Space Grotesk + IBM Plex Mono.",
      "Remove any centered layout rules from App.css; App.css currently centers .App-header—do not use that pattern in the actual app shell."
    ],
    "app_shell_implementation": [
      "Build a responsive shell: Sidebar (desktop) + Sheet (mobile) + sticky Topbar.",
      "Use ScrollArea for sidebar nav and for console/log panes.",
      "Topbar must include Night Vision toggle (Switch) and show device status Badge.",
      "Persist theme toggles (night vision, density) in localStorage."
    ],
    "device_discovery_ui": [
      "Device list should show: port path, vendor (FTDI/CH340), VID:PID, and a 'recommended' chip.",
      "Add a filter toggle: 'Show only SQM devices' vs 'Show all serial ports'.",
      "Use Skeleton while scanning; show empty state with troubleshooting link."
    ],
    "telemetry_readability": [
      "All live values use font-mono + tabular-nums.",
      "Use KPI cards with large value + small unit + delta indicator (optional).",
      "For 1–10Hz updates, avoid layout shift: fixed-width containers for values."
    ],
    "charts": [
      "Use Recharts LineChart with thin gridlines and custom tooltip.",
      "Provide series toggles (ToggleGroup) and time range controls.",
      "Add chart summary text for accessibility and quick scanning."
    ],
    "testing": [
      "Add data-testid to every button, input, select, switch, nav link, and key readout.",
      "Use stable IDs based on role, not styling."
    ]
  },
  "gradient_restriction_rule": {
    "prohibited": [
      "blue-500 to purple-600",
      "purple-500 to pink-500",
      "green-500 to blue-500",
      "red to pink"
    ],
    "never": [
      "Let gradients cover more than 20% of the viewport",
      "Apply gradients to text-heavy reading areas",
      "Use gradients on small UI elements (<100px width)",
      "Stack multiple gradient layers in the same viewport"
    ],
    "allowed": [
      "Very subtle hero/header background only (e.g., topbar backdrop) with mild 2-color shift",
      "Decorative overlays only"
    ],
    "enforcement": "If gradient area exceeds 20% of viewport OR affects readability, use solid colors."
  },
  "General UI UX Design Guidelines": [
    "You must **not** apply universal transition. Eg: `transition: all`. This results in breaking transforms. Always add transitions for specific interactive elements like button, input excluding transforms",
    "You must **not** center align the app container, ie do not add `.App { text-align: center; }` in the css file. This disrupts the human natural reading flow of text",
    "NEVER: use AI assistant Emoji characters like`🤖🧠💭💡🔮🎯📚🎭🎬🎪🎉🎊🎁🎀🎂🍰🎈🎨🎰💰💵💳🏦💎🪙💸🤑📊📈📉💹🔢🏆🥇 etc for icons. Always use **FontAwesome cdn** or **lucid-react** library already installed in the package.json",
    "**GRADIENT RESTRICTION RULE**",
    "NEVER use dark/saturated gradient combos (e.g., purple/pink) on any UI element.  Prohibited gradients: blue-500 to purple 600, purple 500 to pink-500, green-500 to blue-500, red to pink etc",
    "NEVER use dark gradients for logo, testimonial, footer etc",
    "NEVER let gradients cover more than 20% of the viewport.",
    "NEVER apply gradients to text-heavy content or reading areas.",
    "NEVER use gradients on small UI elements (<100px width).",
    "NEVER stack multiple gradient layers in the same viewport.",
    "**ENFORCEMENT RULE:**",
    "    • Id gradient area exceeds 20% of viewport OR affects readability, **THEN** use solid colors",
    "**How and where to use:**",
    "   • Section backgrounds (not content backgrounds)",
    "   • Hero section header content. Eg: dark to light to dark color",
    "   • Decorative overlays and accent elements only",
    "   • Hero section with 2-3 mild color",
    "   • Gradients creation can be done for any angle say horizontal, vertical or diagonal",
    "- For AI chat, voice application, **do not use purple color. Use color like light green, ocean blue, peach orange etc**",
    "- Every interaction needs micro-animations - hover states, transitions, parallax effects, and entrance animations. Static = dead.",
    "- Use 2-3x more spacing than feels comfortable. Cramped designs look cheap.",
    "- Subtle grain textures, noise overlays, custom cursors, selection states, and loading animations: separates good from extraordinary.",
    "- Before generating UI, infer the visual style from the problem statement (palette, contrast, mood, motion) and immediately instantiate it by setting global design tokens (primary, secondary/accent, background, foreground, ring, state colors), rather than relying on any library defaults. Don't make the background dark as a default step, always understand problem first and define colors accordingly",
    "**Component Reuse:**",
    "\t- Prioritize using pre-existing components from src/components/ui when applicable",
    "\t- Create new components that match the style and conventions of existing components when needed",
    "\t- Examine existing components to understand the project's component patterns before creating new ones",
    "**IMPORTANT**: Do not use HTML based component like dropdown, calendar, toast etc. You **MUST** always use `/app/frontend/src/components/ui/ ` only as a primary components as these are modern and stylish component",
    "**Best Practices:**",
    "\t- Use Shadcn/UI as the primary component library for consistency and accessibility",
    "\t- Import path: ./components/[component-name]",
    "**Export Conventions:**",
    "\t- Components MUST use named exports (export const ComponentName = ...)",
    "\t- Pages MUST use default exports (export default function PageName() {...})",
    "**Toasts:**",
    "  - Use `sonner` for toasts\"",
    "  - Sonner component are located in `/app/src/components/ui/sonner.tsx`",
    "Use 2–4 color gradients, subtle textures/noise overlays, or CSS-based noise to avoid flat visuals."
  ]
}
