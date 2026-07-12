import type { GenerateOptions, TableStyle, FontSize } from './generator/generateLatex';

// All user-facing table formatting settings, held as one object in App state.
// Toggle-able knobs pair an `*Enabled` flag with the value so the value is kept
// while disabled (nicer UX than clearing it).
export interface TableSettings {
  style: TableStyle;
  wideTable: boolean;
  captionEnabled: boolean;
  caption: string;
  labelEnabled: boolean;
  label: string;
  tabcolsepEnabled: boolean;
  tabcolsep: string;
  arraystretchEnabled: boolean;
  arraystretch: string;
  fontSize: FontSize;
}

export const DEFAULT_SETTINGS: TableSettings = {
  style: 'grid',
  wideTable: false,
  captionEnabled: false,
  caption: 'Table caption',
  labelEnabled: false,
  label: 'tab:label',
  tabcolsepEnabled: false,
  tabcolsep: '6pt',
  arraystretchEnabled: false,
  arraystretch: '1.2',
  fontSize: 'normal',
};

// Map UI settings to the generator's options: a toggle-able knob only becomes an
// option when its flag is on.
export function settingsToOptions(s: TableSettings): GenerateOptions {
  return {
    style: s.style,
    wideTable: s.wideTable,
    caption: s.captionEnabled ? s.caption : undefined,
    label: s.labelEnabled ? s.label : undefined,
    tabcolsep: s.tabcolsepEnabled ? s.tabcolsep : undefined,
    arraystretch: s.arraystretchEnabled ? s.arraystretch : undefined,
    fontSize: s.fontSize,
  };
}
