/**
 * Fixed categorical colors, in a fixed order, reused everywhere the same
 * three Bottleneck Radar series appear (Executive Control Tower and Credit
 * Intelligence both chart the same three drivers). Per the dataviz
 * guidance: categorical hues are assigned in a fixed order and never
 * cycled or reassigned per page.
 */
export const RADAR_SERIES_COLORS = {
  "Queue growth": "#552988",
  "Repeat query cycles": "#f0a53c",
  "Long inactive periods": "#51c1ad",
} as const;

/** Same series, lightened for sufficient contrast against a dark surface (Credit Intelligence). */
export const RADAR_SERIES_COLORS_DARK = {
  "Queue growth": "#a48bd0",
  "Repeat query cycles": "#f0a53c",
  "Long inactive periods": "#51c1ad",
} as const;
