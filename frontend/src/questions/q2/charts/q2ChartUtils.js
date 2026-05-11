import * as d3 from "d3";
import {getSupportingColor} from "../../q1/charts/Utils";

export const baseMapUrl = "/VAST-Challenge-2022/BaseMap.png";
export const numberFormat = d3.format(",");
export const percentFormat = d3.format(".0%");
export const ratioFormat = d3.format(".2f");
export const compactFormat = d3.format(".2s");

export const trafficColors = {
    hotspots: getSupportingColor("restaurants"),
    corridors: getSupportingColor("employers"),
    pressure: getSupportingColor("pubs"),
};

export const q2VenueColors = {
    apartments: getSupportingColor("apartments"),
    employers: "#593211",
    restaurants: "#facc15",
    pubs: getSupportingColor("pubs"),
};

const venueCategoryMap = {
    Apartment: "apartments",
    Workplace: "employers",
    Restaurant: "restaurants",
    Pub: "pubs",
};

export function getVenueCategory(venueType) {
    return venueCategoryMap[venueType];
}

export function getVenueLabel(row) {
    return `${row.venueType === "Workplace" ? "Employer" : row.venueType} #${row.venueId}`;
}

export function formatCount(value) {
    return numberFormat(value);
}

export function formatSignedCount(value) {
    const sign = value > 0 ? "+" : "";
    return `${sign}${numberFormat(value)}`;
}

export function getTrafficColorScale(color) {

    return (value) => d3.interpolateLab("#f8fafc", color)(0.16 + value * 0.84);
}

export function isMatchingInteraction(active, rowInteraction) {
    if (!active || !rowInteraction || active.kind !== rowInteraction.kind) {
        return false;
    }

    if (active.kind === "corridor") {
        return active.startId === rowInteraction.startId && active.endId === rowInteraction.endId;
    }

    if (active.kind === "hour") {
        return active.hour === rowInteraction.hour;
    }

    return active.id === rowInteraction.id;
}
