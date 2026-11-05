import type {ProductSpec} from './productPresentation';

type ModelLayout = {
  title: string;
  tagline: string;
  intro: string;
  heading: string;
  detail: string;
  illustration?: string;
  quickSpecs?: ProductSpec[];
};

const models: Record<string, ModelLayout> = {
  "xceed-electric-dirt-bike": {
    title: "XCEED 72V",
    tagline: "Responsive power for the trail.",
    intro: "A 72V electric dirt bike with responsive power, trail-ready handling and a clear upgrade path.",
    heading: "The balanced trail platform.",
    detail: "A Samsung 30Ah battery configuration pairs with a 72V system. Use the specifications and support sections to check the setup before choosing your upgrades.",
  },
  "cheerdmoto-performance-96v-electric-dirtbike-xtreme": {
    title: "XTREME 96V",
    tagline: "High output, built for serious terrain.",
    intro: "COWIN’s high-output electric dirt bike platform for riders who prioritize power and speed.",
    heading: "COWIN’s high-output platform.",
    detail: "A 96V 50Ah battery and mid motor are the core of the XTREME. Estimated range varies with terrain, load and riding conditions.",
  },
  "cheerdmoto-electric-wheelchair-smart-b02": {
    title: "SMART B02",
    tagline: "Folding mobility for everyday use.",
    intro: "A folding electric wheelchair with dual-motor drive, a steel frame and compact storage.",
    heading: "Check the fit for your day.",
    detail: "Review the load rating, folding frame and support information before ordering. Ask COWIN for current dimensions and model-specific guidance.",
  },
  "grandeux-xplore-electric-bike-1350w-over-frame-fat-tire-ebike-cheerdmoto": {
    title: "XPLORE",
    tagline: "Over-frame utility for mixed surfaces.",
    intro: "A fat-tire e-bike with an over-frame design, removable battery and 7-speed Shimano drivetrain.",
    heading: "An over-frame e-bike for everyday riding.",
    detail: "XPLORE puts a removable battery and hydraulic disc brakes in a utility-oriented frame. Review the specifications for the drive system and controls.",
  },
  "grandeux-xcite-electric-bike-1350w-step-thru-fat-tire-ebike-cheerdmoto": {
    title: "XCITE",
    tagline: "A step-through for daily rides.",
    intro: "A step-through fat-tire e-bike with a removable battery and hydraulic disc brakes.",
    heading: "Easy step-through access.",
    detail: "XCITE’s low step-through frame makes mounting and dismounting simpler. Confirm fit and sizing with COWIN before you order.",
  },
  "grandeux-xplus-electric-moped-bike-1350w-fat-tire-e-bike": {
    title: "XPLUS",
    tagline: "Full suspension for mixed surfaces.",
    intro: "A fat-tire moped-style e-bike with front and rear suspension and a removable battery.",
    heading: "A moped-style ride with full suspension.",
    detail: "XPLUS pairs front and rear suspension with hydraulic disc brakes. See the specifications for the motor, battery and braking system.",
  },
  "helmet": {
    title: "Motorcycle Helmet",
    tagline: "Riding gear.",
    intro: "Check available sizes, fit and applicable certification details with COWIN before purchase.",
    heading: "Check helmet fit before ordering.",
    detail: "Ask support for the current size chart and certification information for the exact helmet offered.",
    illustration: "hard-hat",
    quickSpecs: [{"label": "Type", "value": "Riding gear"}, {"label": "Sizing", "value": "Check fit"}],
  },
  "cheerdmoto-xceed-upgraded-high-temperature-performance-brake-upgrade-kit": {
    title: "XCEED Brake Upgrade Kit",
    tagline: "Braking upgrade for XCEED.",
    intro: "Confirm mounting points and fit for your XCEED configuration before ordering.",
    heading: "Confirm the brake fit.",
    detail: "Share your model and current brake setup with COWIN. Request the exact kit contents and installation guidance.",
    illustration: "disc3",
    quickSpecs: [{"label": "Model", "value": "XCEED"}, {"label": "Use", "value": "Brake upgrade"}],
  },
  "xceed-street-legal-kit": {
    title: "XCEED Street-Legal Kit",
    tagline: "Road equipment kit for XCEED.",
    intro: "Check fit for your XCEED and verify local requirements before riding on public roads.",
    heading: "Check fit and local road rules.",
    detail: "Confirm the components included and any local registration or equipment requirements before buying.",
    illustration: "signpost",
    quickSpecs: [{"label": "Model", "value": "XCEED"}, {"label": "Use", "value": "Road equipment"}],
  },
  "cheerdmoto-xceed-lcd-display-with-mount-bracket": {
    title: "XCEED LCD Display Kit",
    tagline: "LCD display with mounting bracket.",
    intro: "An XCEED display and mounting bracket. Check the connector and control system on your bike.",
    heading: "Check display and connector compatibility.",
    detail: "Share a photo of your current display and connector with support to confirm fit.",
    illustration: "monitor",
    quickSpecs: [{"label": "Model", "value": "XCEED"}, {"label": "Type", "value": "LCD + bracket"}],
  },
  "cheerdmoto-xceed-72v-30ah-battery": {
    title: "XCEED 72V 30Ah Battery",
    tagline: "Replacement power for XCEED 72V.",
    intro: "A 72V 30Ah battery for XCEED. Confirm connector, mounting and charger compatibility before purchase.",
    heading: "Confirm the battery configuration.",
    detail: "Match the battery to your model and charger. Ask support about delivery and handling for your destination.",
    illustration: "battery-charging",
    quickSpecs: [{"label": "Voltage", "value": "72V"}, {"label": "Capacity", "value": "30Ah"}, {"label": "Model", "value": "XCEED"}],
  },
  "cheerdmoto-xceed-dirtbike-wheel-upgrade-kit": {
    title: "XCEED Wheel Upgrade Kit",
    tagline: "Wheel upgrade for XCEED.",
    intro: "Check wheel size, axle and brake interface with support for your specific XCEED setup.",
    heading: "Match the wheel kit to your bike.",
    detail: "Share your current wheel size and axle details with COWIN to confirm the configuration.",
    illustration: "circle-dot",
    quickSpecs: [{"label": "Model", "value": "XCEED"}, {"label": "Type", "value": "Wheel kit"}],
  },
};

export function modelLayout(slug: string): ModelLayout | undefined {
  return Object.hasOwn(models, slug) ? models[slug] : undefined;
}
