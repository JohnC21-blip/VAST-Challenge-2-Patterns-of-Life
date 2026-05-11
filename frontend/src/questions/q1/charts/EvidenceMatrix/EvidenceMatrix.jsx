import * as d3 from "d3";
import RowLabel from "../RowLabel";
import Tooltip from "../Tooltip";
import "./EvidenceMatrix.css";
import {getDistrictDisplayName, formatInteger, getSupportingColor} from "../Utils";

export default function EvidenceMatrix({
                                           areas,
                                           city,
                                           hoveredAreaId,
                                           onHoverArea,
                                           selectedAreaIds,
                                           onSelectArea,
                                           showHoverDetail = false
                                       }) {
    const width = 840;
    const rowHeight = 34;
    const margin = {top: 36, right: 10, bottom: 12, left: 158};

    const columns = [
        {key: "total", label: "Activity", color: "#475569", value: (area) => area.total},
        {
            key: "home",
            label: "Homes",
            color: getSupportingColor("apartments"),
            value: (area) => area.shares.apartments * 100
        },
        {
            key: "work",
            label: "Work",
            color: getSupportingColor("jobs"),
            value: (area) => ((area.jobs + area.employers) / area.total) * 100
        },
        {
            key: "leisure",
            label: "Leisure",
            color: getSupportingColor("restaurants"),
            value: (area) => ((area.restaurants + area.pubs + area.schools) / area.total) * 100
        },
        {key: "rent", label: "Rent", color: "#ca8a04", value: (area) => area.metrics.rentalCost.median},
        {
            key: "wage",
            label: "Wage",
            color: getSupportingColor("employers"),
            value: (area) => area.metrics.hourlyRate.median
        },
        {
            key: "jobs",
            label: "Jobs/apt",
            color: getSupportingColor("jobs"),
            value: (area) => area.metrics.support.jobsPerApartment
        },
    ];

    const cellWidth = (width - margin.left - margin.right) / columns.length;
    const height = margin.top + areas.length * rowHeight + margin.bottom;

    const extents = Object.fromEntries(
        columns.map((column) => {
            const values = areas.map(column.value);
            return [column.key, d3.extent(values)];
        })
    );

    function getScore(area, column) {
        const value = column.value(area);
        const [min, max] = extents[column.key];

        return (value - min) / (max - min);
    }

    function getValueLabel(area, column) {
        const val = column.value(area);

        if (column.key === "rent" || column.key === "wage") {
            return `€${Math.round(val)}`;
        }

        if (column.key === "jobs") {
            return val.toFixed(1);
        }

        if (column.key === "total") {
            return d3.format(".2s")(val);
        }

        return `${Math.round(val)}%`;
    }

    function getFill(column, normalized) {
        return d3.interpolateLab("#f8fafc", column.color)(0.2 + normalized * 0.8);
    }

    function getMedian(column) {
        const values = areas.map(column.value).sort((a, b) => a - b);

        return d3.median(values);
    }

    function getDeltaLabel(column, delta) {
        const sign = delta > 0 ? "+" : "";

        if (column.key === "rent" || column.key === "wage") {
            return `${sign}€${Math.round(delta)}`;
        }

        if (column.key === "jobs") {
            return `${sign}${delta.toFixed(1)}`;
        }

        if (column.key === "total") {
            return `${sign}${formatInteger(delta)}`;
        }

        return `${sign}${delta.toFixed(0)} pts`;
    }

    function getDetailRows(area) {
        if (area.id === "city") {
            return [
                {label: "Activity", value: formatInteger(area.total), color: "#475569"},
                {label: "Rent city median", value: `€${Math.round(area.metrics.rentalCost.median)}`, color: "#ca8a04"},
                {
                    label: "Wage city median",
                    value: `€${Math.round(area.metrics.hourlyRate.median)}`,
                    color: getSupportingColor("employers")
                },
                {
                    label: "Homes",
                    value: `${Math.round(area.shares.apartments * 100)}%`,
                    color: getSupportingColor("apartments")
                },
                {
                    label: "Work",
                    value: `${Math.round(((area.jobs + area.employers) / area.total) * 100)}%`,
                    color: getSupportingColor("jobs")
                },
                {
                    label: "Jobs/apt",
                    value: area.metrics.support.jobsPerApartment.toFixed(1),
                    color: getSupportingColor("jobs")
                },
                {label: "Apartments", value: formatInteger(area.apartments), color: getSupportingColor("apartments")},
                {label: "Employers", value: formatInteger(area.employers), color: getSupportingColor("employers")},
                {label: "Jobs", value: formatInteger(area.jobs), color: getSupportingColor("jobs")},
            ];
        }

        const activityRank = [...areas].sort((a, b) => b.total - a.total).findIndex((entry) => entry.id === area.id) + 1;
        const rentColumn = columns.find((column) => column.key === "rent");
        const wageColumn = columns.find((column) => column.key === "wage");
        const rentMedian = getMedian(rentColumn);
        const wageMedian = getMedian(wageColumn);

        return [
            {label: "Activity rank", value: `#${activityRank} of ${areas.length}`},

            {
                label: "Rent vs city median",
                value: getDeltaLabel(rentColumn, rentColumn.value(area) - rentMedian),
                color: rentColumn.color
            },
            {
                label: "Wage vs city median",
                value: getDeltaLabel(wageColumn, wageColumn.value(area) - wageMedian),
                color: wageColumn.color,
            },

            {label: "Apartments", value: formatInteger(area.apartments), color: getSupportingColor("apartments")},
            {label: "Employers", value: formatInteger(area.employers), color: getSupportingColor("employers")},
            {label: "Jobs", value: formatInteger(area.jobs), color: getSupportingColor("jobs")},
            {label: "Schools", value: formatInteger(area.schools), color: getSupportingColor("schools")},
            {label: "Restaurants", value: formatInteger(area.restaurants), color: getSupportingColor("restaurants")},
            {label: "Pubs", value: formatInteger(area.pubs), color: getSupportingColor("pubs")}
        ];
    }

    const hoveredArea = areas.find((area) => area.id === hoveredAreaId);
    const selectedArea = selectedAreaIds.length === 1 ? areas.find((area) => area.id === selectedAreaIds[0]) : null;
    const detailArea = selectedArea || hoveredArea || city;
    const frameClassName = `frame evidenceChart ${showHoverDetail ? "hasDetail" : ""}`.trim();

    return (
        <div className={frameClassName}>
            <svg viewBox={`0 0 ${width} ${height}`} className="chartSvg">

                {columns.map((column, index) => (
                    <text
                        key={column.key}
                        x={margin.left + index * cellWidth + cellWidth / 2}
                        y={18}
                        textAnchor="middle"
                        className="axisText"
                    >
                        {column.label}
                    </text>
                ))}

                {areas.map((area, rowIndex) => {
                    const isDimmed = selectedAreaIds.length === 0 || !selectedAreaIds.includes(area.id);
                    const y = margin.top + rowIndex * rowHeight;

                    return (
                        <g
                            key={area.id}
                            className={`pointGroup ${hoveredAreaId === area.id ? "isLinked" : ""}`}
                            onClick={(event) => onSelectArea(area.id, event)}
                            onMouseEnter={() => onHoverArea(area.id)}
                            onMouseLeave={() => onHoverArea(null)}
                        >
                            <rect
                                x={0}
                                y={y}
                                width={width}
                                height={rowHeight}
                                className="hitbox"
                            />

                            <RowLabel label={getDistrictDisplayName(area)} x={margin.left - 12} y={y + rowHeight / 2}/>

                            {columns.map((column, columnIndex) => {
                                const normalized = getScore(area, column);

                                return (
                                    <g key={`${area.id}-${column.key}`}>
                                        <rect
                                            x={margin.left + columnIndex * cellWidth + 3}
                                            y={y + 4}
                                            width={cellWidth - 6}
                                            height={rowHeight - 8}
                                            rx={5}
                                            fill={getFill(column, normalized)}
                                            opacity={isDimmed ? 0.36 : 0.92}
                                        />
                                        <text
                                            x={margin.left + columnIndex * cellWidth + cellWidth / 2}
                                            y={y + 22}
                                            textAnchor="middle"
                                            className="cellText"
                                            opacity={isDimmed ? 0.55 : 1}
                                        >
                                            {getValueLabel(area, column)}
                                        </text>
                                    </g>
                                );
                            })}
                        </g>
                    );
                })}
            </svg>

            {showHoverDetail ? (
                <div className="detail">
                    <Tooltip
                        title={detailArea.label || getDistrictDisplayName(detailArea)}
                        rows={getDetailRows(detailArea)}
                    />
                </div>
            ) : null}
        </div>
    );
}
