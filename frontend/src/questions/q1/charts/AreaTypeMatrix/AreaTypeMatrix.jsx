import RowLabel from "../RowLabel";
import Tooltip from "../Tooltip";
import "./AreaTypeMatrix.css";
import {
    areaTypeMeta,
    getDistrictDisplayName,
    formatInteger,
    formatPercent,
    getSupportingColor
} from "../Utils";

function getTypeColor(value) {
    const palette = {
        Residential: getSupportingColor("apartments"),
        Commercial: getSupportingColor("jobs"),
        Education: getSupportingColor("schools"),
        Hospitality: getSupportingColor("pubs"),
        "Mixed-use": "#64748b",
        "Housing core": getSupportingColor("apartments"),
        "High-rent housing": getSupportingColor("apartments"),
        "Sparse housing": "#94a3b8",
        "Job center": getSupportingColor("jobs"),
        "High-wage jobs": getSupportingColor("employers"),
        "Low-work area": "#94a3b8",
        "High activity": "#64748b",
        "Work destination": getSupportingColor("jobs"),
        "Social activity": getSupportingColor("pubs"),
        "Home activity": getSupportingColor("apartments"),
    };

    return palette[value];
}

export default function AreaTypeMatrix({
                                           areas,
                                           city,
                                           hoveredAreaId,
                                           onHoverArea,
                                           selectedAreaIds,
                                           onSelectArea,
                                           showHoverDetail = false,
                                       }) {
    const width = 780;
    const rowHeight = 34;
    const height = areas.length * rowHeight + 38;
    const margin = {top: 30, right: 10, bottom: 8, left: 158};

    const columns = [
        {key: "primary", label: "Combined", value: (area) => areaTypeMeta[area.areaType].label},
        {key: "housing", label: "Housing", value: (area) => area.clusterLenses.housing},
        {key: "jobMarket", label: "Job Market", value: (area) => area.clusterLenses.jobMarket},
        {key: "activity", label: "Activity", value: (area) => area.clusterLenses.activity}
    ];

    const cellWidth = (width - margin.left - margin.right) / columns.length;
    const hoveredArea = areas.find((area) => area.id === hoveredAreaId);
    const selectedArea = selectedAreaIds.length === 1 ? areas.find((area) => area.id === selectedAreaIds[0]) : null;
    const detailArea = selectedArea || hoveredArea || city;
    const frameClassName = `frame lensChart ${showHoverDetail ? "hasDetail" : ""}`.trim();

    function getDetailRows(area) {
        const homeShare = (area.apartments / area.total) * 100;
        const workShare = ((area.employers + area.jobs) / area.total) * 100;
        const leisureShare = ((area.schools + area.restaurants + area.pubs) / area.total) * 100;

        const drivers = [
            {label: "Housing", value: homeShare, color: getSupportingColor("apartments")},
            {label: "Work", value: workShare, color: getSupportingColor("jobs")},
            {label: "Leisure", value: leisureShare, color: getSupportingColor("pubs")}
        ];

        const dominant = drivers.reduce((best, driver) => (driver.value > best.value ? driver : best), drivers[0]);

        return [
            {
                label: "Dominant driver",
                value: `${dominant.label} (${formatPercent(dominant.value)})`,
                color: dominant.color
            },
            {label: "Median wage", value: `€${area.metrics.hourlyRate.median.toFixed(0)}/hr`},
            {label: "Apartments", value: formatInteger(area.apartments), color: getSupportingColor("apartments")},
            {label: "Employers", value: formatInteger(area.employers), color: getSupportingColor("employers")},
            {label: "Jobs", value: formatInteger(area.jobs), color: getSupportingColor("jobs")},
            {label: "Schools", value: formatInteger(area.schools), color: getSupportingColor("schools")},
            {label: "Restaurants", value: formatInteger(area.restaurants), color: getSupportingColor("restaurants")},
            {label: "Pubs", value: formatInteger(area.pubs), color: getSupportingColor("pubs")}
        ];
    }

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
                    const y = margin.top + rowIndex * rowHeight;
                    const isDimmed = selectedAreaIds.length === 0 || !selectedAreaIds.includes(area.id);

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
                                const value = column.value(area);

                                return (
                                    <g key={`${area.id}-${column.key}`}>
                                        <rect
                                            x={margin.left + columnIndex * cellWidth + 4}
                                            y={y + 4}
                                            width={cellWidth - 8}
                                            height={rowHeight - 8}
                                            rx={6}
                                            fill={getTypeColor(value)}
                                            opacity={isDimmed ? 0.36 : 0.9}
                                        />
                                        <text
                                            x={margin.left + columnIndex * cellWidth + cellWidth / 2}
                                            y={y + 21}
                                            textAnchor="middle"
                                            className="lensText"
                                            opacity={isDimmed ? 0.58 : 1}
                                        >
                                            {value}
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
