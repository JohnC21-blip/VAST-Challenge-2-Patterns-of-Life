export const VENUE_MARKER_SHAPES = {
  Apartment: "circle",
  Workplace: "square",
  Restaurant: "diamond",
  Pub: "invertedTriangle",
};

export function markerPath(shape, size) {
  const half = size / 2;

  if (shape === "square") {
    return `M${-half},${-half} H${half} V${half} H${-half} Z`;
  }

  if (shape === "diamond") {
    return `M0,${-half} L${half},0 L0,${half} L${-half},0 Z`;
  }

  if (shape === "invertedTriangle") {
    return `M${-half},${-size * 0.42} L${half},${-size * 0.42} L0,${size * 0.56} Z`;
  }

  return null;
}
