import {useEffect, useMemo, useState} from "react";
import * as d3 from "d3";
import Dashboard from "../../../../components/common/Dashboard";
import Tooltip from "../../../q1/charts/Tooltip";
import {getSupportingColor} from "../../../q1/charts/Utils";
import {
    baseMapUrl,
    getTrafficColorScale,
    formatCount,
    isMatchingInteraction,
    getVenueCategory,
    getVenueLabel,
    q2VenueColors,
    trafficColors,
} from "../q2ChartUtils";
import "./CityMovementMap.css";

const rawCityBounds = {
    minX: -4701.462928834322,
    maxX: 2630,
    minY: 22.160978120468585,
    maxY: 7836.545593061912,
};

const buildingsUrl = "/VAST-Challenge-2022/Datasets/Attributes/Buildings.csv";
const buildingColors = {
    Commercial: q2VenueColors.employers,
    Residental: getSupportingColor("apartments"),
    Residential: getSupportingColor("apartments"),
    School: getSupportingColor("schools"),
};
const markerRadius = {
    apartments: 7.4,
    employers: 7.4,
    restaurants: 8.5,
    pubs: 7.8,
    pressure: 7.8,
};

const markerShape = {
    apartments: "circle",
    employers: "square",
    restaurants: "diamond",
    pubs: "invertedTriangle",
};

const legendItems = [
    {key: "apartments", label: "Apartments", color: q2VenueColors.apartments},
    {key: "employers", label: "Employers", color: q2VenueColors.employers},
    {key: "restaurants", label: "Restaurants", color: q2VenueColors.restaurants},
    {key: "pubs", label: "Pubs", color: q2VenueColors.pubs},
    {key: "corridors", label: "Trips", color: trafficColors.corridors},
    {key: "pressure", label: "Bottleneck load", color: trafficColors.pressure},
];

function getMarkerPath(shape, size) {
    const half = size / 2;

    if (shape === "square") {
        return `M${-half},${-half} H${half} V${half} H${-half} Z`;
    }

    if (shape === "diamond") {
        return `M0,${-half} L${half},0 L0,${half} L${-half},0 Z`;
    }

    if (shape === "triangle") {
        return `M0,${-size * 0.56} L${half},${size * 0.42} L${-half},${size * 0.42} Z`;
    }

    if (shape === "invertedTriangle") {
        return `M${-half},${-size * 0.42} L${half},${-size * 0.42} L0,${size * 0.56} Z`;
    }

    return null;
}

function LegendIcon({item}) {
    if (item.key === "corridors") {
        return <path d="M2 11C5.5 3.5 10.5 12.5 14 5" fill="none" stroke={item.color} strokeLinecap="round"
                     strokeWidth="3"/>;
    }

    if (item.key === "pressure") {
        return (
            <>
                <defs>
                    <radialGradient id="q2-pressure-legend-fade" cx="50%" cy="50%" r="62%">
                        <stop offset="0%" stopColor={item.color} stopOpacity="0.95"/>
                        <stop offset="62%" stopColor={item.color} stopOpacity="0.62"/>
                        <stop offset="100%" stopColor={item.color} stopOpacity="0.08"/>
                    </radialGradient>
                </defs>
                <circle cx="8" cy="8" r="6.8" fill="url(#q2-pressure-legend-fade)"/>
                <circle cx="8" cy="8" r="3.2" fill={item.color} fillOpacity="0.76"/>
            </>
        );
    }

    return (
        <Marker
            category={item.key}
            fill={item.color}
            size={11.6}
            stroke="#ffffff"
            strokeWidth={1.8}
            transform="translate(8 8)"
        />
    );
}

function Legend() {
    return (
        <div className="cityMovementMapLegend" aria-label="Map marker categories">
            {legendItems.map((item) => (
                <span key={item.key}>
                    <svg viewBox="0 0 16 16" aria-hidden="true">
                        <LegendIcon item={item}/>
                    </svg>
                    {item.label}
                </span>
            ))}
        </div>
    );
}

function Marker({category, className = "", fill, fillOpacity = 1, size, stroke, strokeWidth, ...props}) {
    const shape = markerShape[category];

    if (shape === "circle") {
        return (
            <circle
                className={className}
                r={size / 2}
                fill={fill}
                fillOpacity={fillOpacity}
                stroke={stroke}
                strokeWidth={strokeWidth}
                {...props}
            />
        );
    }

    return (
        <path
            className={className}
            d={getMarkerPath(shape, size)}
            fill={fill}
            fillOpacity={fillOpacity}
            stroke={stroke}
            strokeWidth={strokeWidth}
            {...props}
        />
    );
}

function getPolygonPoints(value) {
    const match = /POLYGON\s*\(\((.+)\)\)/.exec(value);

    return match[1].split(",").map((pair) => {
        const [x, y] = pair.trim().split(/\s+/).map(Number);
        return {x, y};
    });
}

function getPolygonPath(points, getPoint) {
    return points.map((point, index) => {
        const projected = getPoint(point.x, point.y);
        return `${index ? "L" : "M"}${projected.x.toFixed(1)},${projected.y.toFixed(1)}`;
    }).join(" ") + " Z";
}

function getCorridorRoute(start, end, index = 0) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const bendOffset = ((index % 5) - 2) * 7;
    const useHorizontalFirst = Math.abs(dx) > Math.abs(dy);

    if (useHorizontalFirst) {
        const midX = start.x + dx * 0.52 + bendOffset;

        return [
            start,
            {x: midX, y: start.y},
            {x: midX, y: end.y},
            end,
        ];
    }

    const midY = start.y + dy * 0.52 + bendOffset;

    return [
        start,
        {x: start.x, y: midY},
        {x: end.x, y: midY},
        end,
    ];
}

function getRoutePath(points) {
    return points.map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
}

function Particles({corridors, getPoint, hourCorridorMax}) {
    const particles = useMemo(() => corridors.flatMap((corridor, corridorIndex) => {
        if (!corridor.hourTrips) {
            return [];
        }

        const volume = Math.max(1, Math.round((corridor.hourTrips / hourCorridorMax) * 7));

        return Array.from({length: volume}, (_, particleIndex) => ({
            ...corridor,
            key: `${corridor.startId}-${corridor.endId}-${particleIndex}`,
            routeIndex: corridorIndex,
            delay: -((corridorIndex * 0.37 + particleIndex * 0.73) % 5),
            duration: Math.max(1.4, 5 - (corridor.hourTrips / hourCorridorMax) * 2.8),
        }));
    }).slice(0, 130), [corridors, hourCorridorMax]);

    return particles.map((particle) => {
        const start = getPoint(particle.x0, particle.y0);
        const end = getPoint(particle.x1, particle.y1);
        const path = getRoutePath(getCorridorRoute(start, end, particle.routeIndex));
        const carScale = 0.78 + (particle.hourTrips / hourCorridorMax) * 0.42;

        return (
            <g
                key={particle.key}
                className="trafficCar"
                style={{
                    "--car-opacity": 0.42 + (particle.hourTrips / hourCorridorMax) * 0.54,
                }}
            >
                <animateMotion
                    dur={`${particle.duration}s`}
                    begin={`${particle.delay}s`}
                    repeatCount="indefinite"
                    path={path}
                    rotate="auto"
                />
                <g transform={`scale(${carScale})`}>
                    <rect className="trafficCarBody" x="-5.5" y="-2.8" width="11" height="5.6" rx="1.8"/>
                    <rect className="trafficCarCabin" x="-1.2" y="-2" width="3.8" height="4" rx="1"/>
                    <circle className="trafficCarLight" cx="5.1" cy="-1.4" r="0.7"/>
                    <circle className="trafficCarLight" cx="5.1" cy="1.4" r="0.7"/>
                </g>
            </g>
        );
    });
}

function Summary({activeInteraction, displayHour, hourRow}) {
    const rows = [
        {label: "Hour", value: `${String(displayHour).padStart(2, "0")}:00`, color: getSupportingColor("employers")},
        {label: "Departures", value: formatCount(hourRow.departures), color: trafficColors.corridors},
        {label: "Arrivals", value: formatCount(hourRow.arrivals), color: trafficColors.hotspots},
        {
            label: "Focus",
            value: activeInteraction ? activeInteraction.label : "None",
            color: "#0f172a"
        }
    ];

    return (
        <Tooltip
            title={activeInteraction ? "Traffic Selection" : "Traffic Overview"}
            rows={rows}
            className="mapTooltip"
        />
    );
}

function isEndpoint(interaction, id) {
    return interaction?.kind === "corridor" && (interaction.startId === id || interaction.endId === id);
}

function isEitherEndpoint(primary, secondary, id) {
    return isEndpoint(primary, id) || isEndpoint(secondary, id);
}

export default function CityMovementMap({
                                            activeInteraction,
                                            corridorHourly,
                                            corridors,
                                            hovered,
                                            hourlyTrips = [],
                                            hotspots,
                                            onHover,
                                            onLeave,
                                            onSelect,
                                            pressure,
                                            selected,
                                            selectedHour,
                                            summary,
                                        }) {
    const [buildings, setBuildings] = useState([]);

    const width = 1076;
    const height = 1144;
    const padding = 20;

    const getPoint = useMemo(() => {
        const dx = rawCityBounds.maxX - rawCityBounds.minX;
        const dy = rawCityBounds.maxY - rawCityBounds.minY;

        return (x, y) => ({
            x: padding + ((x - rawCityBounds.minX) / dx) * (width - padding * 2),
            y: height - padding - ((y - rawCityBounds.minY) / dy) * (height - padding * 2),
        });
    }, []);

    useEffect(() => {
        d3.csv(buildingsUrl).then((rows) => {
            setBuildings(rows.map((row) => ({
                id: Number(row.buildingId),
                type: row.buildingType,
                occupancy: Number(row.maxOccupancy),
                shape: getPolygonPoints(row.location),
            })));
        });
    }, []);

    const visibleHotspots = useMemo(() => {
        const visible = hotspots.slice().sort((a, b) => b.count - a.count).slice(0, 380);

        if (hovered?.kind === "corridor" || selected?.kind === "corridor") {
            const visibleIds = new Set(visible.map((row) => row.venueId));

            hotspots.forEach((row) => {
                if (isEitherEndpoint(hovered, selected, row.venueId) && !visibleIds.has(row.venueId)) {
                    visible.push(row);
                    visibleIds.add(row.venueId);
                }
            });
        }

        return visible.sort((a, b) => {
            const aSelected = isEitherEndpoint(hovered, selected, a.venueId);
            const bSelected = isEitherEndpoint(hovered, selected, b.venueId);

            if (aSelected !== bSelected) {
                return aSelected ? 1 : -1;
            }

            return b.count - a.count;
        });
    }, [hotspots, hovered, selected]);

    const visiblePressure = useMemo(
        () => pressure.slice().sort((a, b) => {
            const aSelected = isEitherEndpoint(hovered, selected, a.locationId);
            const bSelected = isEitherEndpoint(hovered, selected, b.locationId);

            if (aSelected !== bSelected) {
                return aSelected ? 1 : -1;
            }

            return b.arrivals - a.arrivals;
        }),
        [hovered, pressure, selected]
    );
    const layeredHotspots = useMemo(() => {
        const typeCounts = visibleHotspots.reduce((counts, row) => {
            const category = getVenueCategory(row.venueType);
            counts.set(category, (counts.get(category) || 0) + 1);
            return counts;
        }, new Map());

        return visibleHotspots.slice().sort((a, b) => {
            const aItem = {kind: "venue", id: a.venueId};
            const bItem = {kind: "venue", id: b.venueId};
            const aHighlighted = isMatchingInteraction(hovered, aItem) || isMatchingInteraction(selected, aItem) || isEitherEndpoint(hovered, selected, a.venueId);
            const bHighlighted = isMatchingInteraction(hovered, bItem) || isMatchingInteraction(selected, bItem) || isEitherEndpoint(hovered, selected, b.venueId);

            if (aHighlighted !== bHighlighted) {
                return aHighlighted ? 1 : -1;
            }

            const aCategory = getVenueCategory(a.venueType);
            const bCategory = getVenueCategory(b.venueType);
            const typeCountDelta = (typeCounts.get(bCategory) || 0) - (typeCounts.get(aCategory) || 0);

            return typeCountDelta || b.count - a.count;
        });
    }, [hovered, selected, visibleHotspots]);

    const displayHour = selectedHour ?? summary.peakDepartureHour;
    const hourRow = hourlyTrips.find((row) => row.hour === displayHour);
    const corridorHourlyByKey = useMemo(() => new Map(corridorHourly.corridors.map((row) => [
        `${row.startId}-${row.endId}`,
        row.hours,
    ])), [corridorHourly]);
    const corridorHourMax = d3.max(corridorHourly.corridors, (row) => d3.max(row.hours));
    const visibleCorridors = useMemo(() => corridors.map((row) => {
        const hours = corridorHourlyByKey.get(`${row.startId}-${row.endId}`);
        const hourTrips = hours[displayHour];

        return {
            ...row,
            hourTrips,
            hourRatio: hourTrips / corridorHourMax,
        };
    }), [corridorHourMax, corridorHourlyByKey, corridors, displayHour]);
    const visibleBuildings = useMemo(() => buildings.filter((_, index) => index % 3 === 0).slice(0, 420), [buildings]);
    const pressureColor = d3.scaleSequential(getTrafficColorScale(trafficColors.pressure))
        .domain([0, d3.max(pressure, (row) => row.ratio)]);

    return (
        <Dashboard title="City Movement Map" className="mapPanel">
            <div className="mapFrame">
                <svg viewBox={`0 0 ${width} ${height}`} className="mapSvg">
                    <defs>
                        <filter id="q2-map-selection-glow" x="-80%" y="-80%" width="260%" height="260%">
                            <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#0f172a" floodOpacity="0.34"/>
                            <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#ffffff" floodOpacity="0.85"/>
                        </filter>
                        <filter id="q2-activity-glow" x="-70%" y="-70%" width="240%" height="240%">
                            <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor={trafficColors.corridors}
                                          floodOpacity="0.48"/>
                            <feDropShadow dx="0" dy="0" stdDeviation="8" floodColor={trafficColors.pressure}
                                          floodOpacity="0.18"/>
                        </filter>
                        <linearGradient id="q2-traffic-gradient" x1="0%" x2="100%">
                            <stop offset="0%" stopColor={trafficColors.hotspots}/>
                            <stop offset="55%" stopColor={trafficColors.corridors}/>
                            <stop offset="100%" stopColor={trafficColors.pressure}/>
                        </linearGradient>
                    </defs>
                    <rect
                        x="0"
                        y="0"
                        width={width}
                        height={height}
                        className="mapBackground"
                    />
                    <image
                        href={baseMapUrl}
                        x="0"
                        y="0"
                        width={width}
                        height={height}
                        preserveAspectRatio="xMidYMid meet"
                        className="mapImage isActivity"
                    />
                    <g className="buildingFabric">
                        {visibleBuildings.map((building) => (
                            <path
                                key={building.id}
                                d={getPolygonPath(building.shape, getPoint)}
                                fill={buildingColors[building.type]}
                                opacity={0.16 + Math.min(0.2, building.occupancy / 600)}
                            />
                        ))}
                    </g>

                    {visibleCorridors.map((row, index) => {
                        const start = getPoint(row.x0, row.y0);
                        const end = getPoint(row.x1, row.y1);
                        const path = getRoutePath(getCorridorRoute(start, end, index));
                        const item = {
                            kind: "corridor",
                            startId: row.startId,
                            endId: row.endId,
                            label: row.label,
                            trips: row.trips,
                            avgDurationMin: row.avgDurationMin,
                        };
                        const venueHit = hovered && (hovered.kind === "venue" || hovered.kind === "location") && (hovered.id === row.startId || hovered.id === row.endId);
                        const selectedHit = selected && (selected.kind === "venue" || selected.kind === "location") && (selected.id === row.startId || selected.id === row.endId);
                        const isHovered = isMatchingInteraction(hovered, item) || venueHit;
                        const isSelected = isMatchingInteraction(selected, item) || selectedHit;
                        const isHighlighted = isHovered || isSelected;
                        const shouldMute = !selected && hovered?.kind === "corridor" && !isHighlighted;

                        return (
                            <path
                                key={`${row.startId}-${row.endId}-${index}`}
                                className={[
                                    "corridor",
                                    isSelected ? "isSelected" : "",
                                    isHovered ? "isHovered" : "",
                                    shouldMute ? "isMuted" : "",
                                ].filter(Boolean).join(" ")}
                                d={path}
                                fill="none"
                                stroke={isHighlighted ? trafficColors.corridors : "url(#q2-traffic-gradient)"}
                                strokeOpacity={isHighlighted ? 1 : 0.2 + row.hourRatio * 0.72}
                                strokeWidth={isHighlighted ? 10 : 2.4 + row.hourRatio * 11.2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                onMouseEnter={() => onHover(item)}
                                onMouseLeave={onLeave}
                                onClick={() => onSelect(item)}
                            />
                        );
                    })}

                    <Particles
                        corridors={visibleCorridors.slice(0, 50)}
                        getPoint={getPoint}
                        hourCorridorMax={corridorHourMax}
                    />

                    {layeredHotspots.map((row, index) => {
                        const point = getPoint(row.x, row.y);
                        const item = {
                            kind: "venue",
                            id: row.venueId,
                            label: getVenueLabel(row),
                            venueType: row.venueType,
                            count: row.count,
                        };
                        const isHovered = isMatchingInteraction(hovered, item) || isEndpoint(hovered, row.venueId);
                        const isSelected = isMatchingInteraction(selected, item) || isEndpoint(selected, row.venueId);
                        const isHighlighted = isHovered || isSelected;
                        const shouldMute = !selected && hovered?.kind === "corridor" && !isHighlighted;
                        const category = getVenueCategory(row.venueType);
                        const size = markerRadius[category] * 2;

                        return (
                            <Marker
                                key={`${row.venueId}-${index}`}
                                className={[
                                    "mapPoint",
                                    isSelected ? "isSelected" : "",
                                    isHovered ? "isHovered" : "",
                                    shouldMute ? "isMuted" : "",
                                ].filter(Boolean).join(" ")}
                                category={category}
                                size={size}
                                transform={`translate(${point.x} ${point.y})`}
                                fill={q2VenueColors[category]}
                                fillOpacity={isHighlighted ? 1 : 0.95}
                                stroke={isHighlighted ? "#0f172a" : "#ffffff"}
                                strokeWidth={isHighlighted ? 3 : 2}
                                onMouseEnter={() => onHover(item)}
                                onMouseLeave={onLeave}
                                onClick={() => onSelect(item)}
                            />
                        );
                    })}

                    {visiblePressure.map((row, index) => {
                        const point = getPoint(row.x, row.y);
                        const category = getVenueCategory(row.venueType);
                        const size = markerRadius[category] * 2;
                        const item = {
                            kind: "location",
                            id: row.locationId,
                            label: row.label,
                            venueType: row.venueType,
                            arrivals: row.arrivals,
                            capacity: row.capacity,
                            ratio: row.ratio,
                        };
                        const isHovered = isMatchingInteraction(hovered, item) || isEndpoint(hovered, row.locationId);
                        const isSelected = isMatchingInteraction(selected, item) || isEndpoint(selected, row.locationId);
                        const isHighlighted = isHovered || isSelected;
                        const shouldMute = !selected && hovered?.kind === "corridor" && !isHighlighted;

                        return (
                            <Marker
                                key={`${row.locationId}-${index}`}
                                className={[
                                    "pressurePoint",
                                    isSelected ? "isSelected" : "",
                                    isHovered ? "isHovered" : "",
                                    shouldMute ? "isMuted" : "",
                                ].filter(Boolean).join(" ")}
                                category={category}
                                size={size}
                                transform={`translate(${point.x} ${point.y})`}
                                fill={pressureColor(row.ratio)}
                                fillOpacity={isHighlighted ? 1 : 0.92}
                                stroke={isHighlighted ? "#0f172a" : "#ffffff"}
                                strokeWidth={isHighlighted ? 3 : 2}
                                onMouseEnter={() => onHover(item)}
                                onMouseLeave={onLeave}
                                onClick={() => onSelect(item)}
                            />
                        );
                    })}
                </svg>

                <Summary activeInteraction={activeInteraction} displayHour={displayHour} hourRow={hourRow}/>
                <Legend/>
            </div>
        </Dashboard>
    );
}
