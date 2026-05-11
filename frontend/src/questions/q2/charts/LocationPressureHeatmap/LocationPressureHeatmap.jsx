import * as d3 from "d3";
import Dashboard from "../../../../components/common/Dashboard";
import Q2ChartFrame from "../Q2ChartFrame/Q2ChartFrame";
import {
    getTrafficColorScale,
    compactFormat,
    formatCount,
    ratioFormat,
    trafficColors,
} from "../q2ChartUtils";
import "./LocationPressureHeatmap.css";

export default function LocationPressureHeatmap({
                                                    activeInteraction,
                                                    className = "",
                                                    pressureData,
                                                    isExpanded = false,
                                                    isHidden = false,
                                                    onHover,
                                                    onLeave,
                                                    onSelect,
                                                    onToggle,
                                                    selected,
                                                    selectedHour,
                                                }) {
    const pressureLocations = pressureData.locations.slice(0, isExpanded ? 12 : 8);
    const width = 820;
    const height = 350;
    const margin = {top: 36, right: 28, bottom: 58, left: 106};
    const xScale = d3.scaleBand().domain(pressureData.hours).range([margin.left, width - margin.right]).padding(0.08);
    const yScale = d3.scaleBand().domain(pressureLocations.map((locationPressure) => locationPressure.locationId)).range([margin.top, height - margin.bottom]).padding(0.12);
    const maxRatio = d3.max(pressureLocations, (locationPressure) => d3.max(locationPressure.hourlyRatios));
    const color = d3.scaleSequential(getTrafficColorScale(trafficColors.pressure)).domain([0, maxRatio]);
    const hoverId = activeInteraction?.kind === "location" ? activeInteraction.id : null;
    const selectedId = selected?.kind === "location" ? selected.id : null;
    const detailId = hoverId ?? selectedId;
    const hoverHour = activeInteraction?.kind === "hour" ? activeInteraction.hour : null;
    const detailHour = hoverHour ?? selectedHour;
    const detailLocation = pressureLocations.find((locationPressure) => locationPressure.locationId === detailId);
    const hoverLocation = pressureLocations.find((locationPressure) => locationPressure.locationId === hoverId);
    const selectedLocation = pressureLocations.find((locationPressure) => locationPressure.locationId === selectedId);
    const worstLocation = pressureLocations[d3.maxIndex(pressureLocations, (locationPressure) => locationPressure.peakRatio)];
    const hourPeakLocation = detailHour == null
        ? null
        : pressureLocations[d3.maxIndex(pressureLocations, (locationPressure) => locationPressure.hourlyRatios[detailHour])];

    const detailRows = detailHour != null && !detailLocation
        ? [
            {label: "Hour", value: `${detailHour}:00`, color: trafficColors.pressure},
            {label: "Worst location", value: hourPeakLocation.label},
            {label: "Load", value: `${ratioFormat(hourPeakLocation.hourlyRatios[detailHour])}x`},
            {label: "Arrivals", value: formatCount(hourPeakLocation.hourlyArrivals[detailHour])},
            {label: "Capacity", value: formatCount(hourPeakLocation.capacity)},
        ]
        : detailLocation
            ? [
                {label: "Peak pressure hour", value: `${detailLocation.peakHour}:00`, color: trafficColors.pressure},
                {label: "Peak load", value: `${ratioFormat(detailLocation.peakRatio)}x`},
                {label: "Peak arrivals", value: formatCount(detailLocation.peakArrivals)},
                {label: "Capacity", value: formatCount(detailLocation.capacity)},
                {label: "Total load", value: `${ratioFormat(detailLocation.totalRatio)}x`},
            ]
            : [
                {label: "Worst location", value: worstLocation.label, color: trafficColors.pressure},
                {label: "Peak pressure hour", value: `${worstLocation.peakHour}:00`},
                {label: "Peak load", value: `${ratioFormat(worstLocation.peakRatio)}x`},
                {label: "Peak arrivals", value: formatCount(worstLocation.peakArrivals)},
                {label: "Capacity", value: formatCount(worstLocation.capacity)},
            ];

    return (
        <Dashboard
            title="Hourly Bottleneck Severity"
            className={className}
            isExpanded={isExpanded}
            isHidden={isHidden}
            onToggle={onToggle}
        >
            <Q2ChartFrame
                showDetail={isExpanded}
                detailTitle={detailLocation ? detailLocation.label : detailHour == null ? "Location by hour" : `Hour ${detailHour}:00`}
                detailRows={detailRows}
            >
                <svg viewBox={`0 0 ${width} ${height}`} className="chartSvg locationPressureHeatmap">
                    {pressureLocations.map((location) => (
                        <text
                            key={location.locationId}
                            className="axisText pressureLocationLabel"
                            x={margin.left - 10}
                            y={yScale(location.locationId) + yScale.bandwidth() / 2 + 4}
                            textAnchor="end"
                        >
                            {location.label}
                        </text>
                    ))}

                    {[0, 4, 8, 12, 16, 20, 23].map((hour) => (
                        <text
                            key={hour}
                            className="axisText"
                            x={xScale(hour) + xScale.bandwidth() / 2}
                            y={margin.top - 12}
                            textAnchor="middle"
                        >
                            {hour}
                        </text>
                    ))}

                    {pressureLocations.map((location) => {
                        const interaction = {
                            kind: "location",
                            id: location.locationId,
                            label: location.label,
                        };

                        return (
                            <g key={location.locationId}>
                                {pressureData.hours.map((hour) => {
                                    return (
                                        <rect
                                            key={`${location.locationId}-${hour}`}
                                            className="pressureHourCell"
                                            x={xScale(hour)}
                                            y={yScale(location.locationId)}
                                            width={xScale.bandwidth()}
                                            height={yScale.bandwidth()}
                                            rx="3"
                                            fill={color(location.hourlyRatios[hour])}
                                            stroke="#ffffff"
                                            strokeWidth="0.5"
                                        />
                                    );
                                })}
                                <rect
                                    className="pressureLocationHitArea"
                                    x={margin.left}
                                    y={yScale(location.locationId)}
                                    width={width - margin.left - margin.right}
                                    height={yScale.bandwidth()}
                                    rx="4"
                                    onMouseEnter={() => onHover(interaction)}
                                    onMouseLeave={onLeave}
                                    onClick={() => onSelect(interaction)}
                                />
                            </g>
                        );
                    })}
                    {selectedHour != null ? (
                        <rect
                            className="pressureHourMarker isSelected"
                            x={xScale(selectedHour)}
                            y={margin.top}
                            width={xScale.bandwidth()}
                            height={height - margin.top - margin.bottom}
                            rx="4"
                        />
                    ) : null}
                    {hoverHour != null && hoverHour !== selectedHour ? (
                        <rect
                            className="pressureHourMarker isHovered"
                            x={xScale(hoverHour)}
                            y={margin.top}
                            width={xScale.bandwidth()}
                            height={height - margin.top - margin.bottom}
                            rx="4"
                        />
                    ) : null}
                    {selectedLocation ? (
                        <rect
                            className="pressureLocationMarker isSelected"
                            x={margin.left}
                            y={yScale(selectedLocation.locationId)}
                            width={width - margin.left - margin.right}
                            height={yScale.bandwidth()}
                            rx="4"
                        />
                    ) : null}
                    {hoverLocation && hoverLocation.locationId !== selectedLocation?.locationId ? (
                        <rect
                            className="pressureLocationMarker isHovered"
                            x={margin.left}
                            y={yScale(hoverLocation.locationId)}
                            width={width - margin.left - margin.right}
                            height={yScale.bandwidth()}
                            rx="4"
                        />
                    ) : null}
                    <text
                        className="axisTitle"
                        x={(margin.left + width - margin.right) / 2}
                        y={height - 30}
                        textAnchor="middle"
                    >
                        Hour of day
                    </text>

                    {Array.from({length: 100}).map((_, index) => (
                        <rect
                            key={index}
                            x={margin.left + index * 4}
                            y={height - 18}
                            width="4"
                            height="9"
                            fill={color((index / 99) * maxRatio)}
                        />
                    ))}
                    <text className="axisText" x={margin.left} y={height - 24}>0</text>
                    <text className="axisText" x={margin.left + 400} y={height - 24}>{compactFormat(maxRatio)}x</text>
                </svg>
            </Q2ChartFrame>
        </Dashboard>
    );
}
