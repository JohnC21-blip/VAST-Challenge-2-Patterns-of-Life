import {supportingColor} from "../../q1/charts/Utils";

export const VENUE_COLORS = {
  Apartment: supportingColor("apartments"),
  Workplace: supportingColor("employers"),
  Restaurant: supportingColor("restaurants"),
  Pub: supportingColor("pubs"),
};

export const VENUE_CATEGORIES = {
  Apartment: "apartments",
  Workplace: "employers",
  Restaurant: "restaurants",
  Pub: "pubs",
};

export const VENUE_MARKER_SHAPES = {
  Apartment: "circle",
  Workplace: "square",
  Restaurant: "diamond",
  Pub: "invertedTriangle",
};

export function venueColor(venueType) {
  return VENUE_COLORS[venueType] ?? "#94a3b8";
}
