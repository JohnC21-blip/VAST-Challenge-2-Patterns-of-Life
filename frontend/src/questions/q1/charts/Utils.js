import * as d3 from "d3";

export const chartGridColor = "#edf1f5";
export const categoryColors = {
    apartments: "#2563eb",
    employers: "#7c3aed",
    jobs: "#16a34a",
    schools: "#d4a017",
    restaurants: "#94a3b8",
    pubs: "#db2777",
};

export const districtIconColors = {
    apartments: "#0f6fc6",
    employers: "#7c3aed",
    jobs: "#0f9f6e",
    schools: "#d97706",
    restaurants: "#dc2626",
    pubs: "#c026d3",
};

export const categoryMeta = {
    apartments: {label: "Apartments"},
    employers: {label: "Employers"},
    jobs: {label: "Jobs"},
    schools: {label: "Schools"},
    restaurants: {label: "Restaurants"},
    pubs: {label: "Pubs"},
};

export const areaTypeMeta = {
    residential: {label: "Residential"},
    commercial: {label: "Commercial"},
    education: {label: "Education"},
    leisure: {label: "Hospitality"},
    mixed: {label: "Mixed"},
};

export function getDistrictColor(index, total) {
    const position = index / (total - 1);

    return d3.interpolateTurbo(0.08 + position * 0.84);
}

export function getSupportingColor(key) {

    return districtIconColors[key];
}

export const supportingColor = getSupportingColor;

export function getDistrictDisplayName(area) {

    return area.name.replace("NorthWest", "Northwest").replace(/\s+District$/, "");
}

export function getChartLabelLines(label) {
    const words = label.split(/\s+/).filter(Boolean);

    if (words.length <= 1 || label.length <= 16) {
        return [label];
    }

    const midpoint = Math.ceil(words.length / 2);
    return [words.slice(0, midpoint).join(" "), words.slice(midpoint).join(" ")];
}

const intFormatter = new Intl.NumberFormat("fr-LU");
const moneyFormatter = new Intl.NumberFormat("fr-LU", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
});

export function formatInteger(value) {

    return intFormatter.format(Math.round(value));
}

export function formatMoney(value) {

    return moneyFormatter.format(value);
}

export function formatPercent(value) {

    return `${value.toFixed(0)}%`;
}
