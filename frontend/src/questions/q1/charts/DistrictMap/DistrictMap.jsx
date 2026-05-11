import {memo, useEffect, useMemo, useRef} from "react";
import Tooltip from "../Tooltip";
import "./DistrictMap.css";
import {
    districtIconColors,
    formatInteger,
    formatMoney,
    formatPercent,
} from "../Utils";

const baseMapUrl = "/VAST-Challenge-2022/BaseMap.png";
const markerTypes = [
    {key: "apartments", label: "Apartments"},
    {key: "employers", label: "Employers"},
    {key: "jobs", label: "Jobs"},
    {key: "schools", label: "Schools"},
    {key: "restaurants", label: "Restaurants"},
    {key: "pubs", label: "Pubs"},
];

const markerRadius = {
    jobs: 7,
    apartments: 7.4,
    employers: 7.4,
    schools: 7.8,
    restaurants: 7.8,
    pubs: 7.8,
};

const markerShape = {
    apartments: "circle",
    employers: "square",
    jobs: "hexagon",
    schools: "triangle",
    restaurants: "diamond",
    pubs: "invertedTriangle",
};

const markerOffset = {
    apartments: {x: 0, y: 4.8},
    employers: {x: 4.8, y: -3},
    jobs: {x: -4.8, y: -3},
    schools: {x: 0, y: -5.2},
    restaurants: {x: 4.8, y: 4},
    pubs: {x: -4.8, y: 4},
};

function getMarkerPath(shape, size, x = 0, y = 0) {
    const half = size / 2;

    if (shape === "square") {
        return `M${x - half},${y - half}H${x + half}V${y + half}H${x - half}Z`;
    }

    if (shape === "diamond") {
        return `M${x},${y - half}L${x + half},${y}L${x},${y + half}L${x - half},${y}Z`;
    }

    if (shape === "triangle") {
        return `M${x},${y - size * 0.56}L${x + half},${y + size * 0.42}L${x - half},${y + size * 0.42}Z`;
    }

    if (shape === "invertedTriangle") {
        return `M${x - half},${y - size * 0.42}L${x + half},${y - size * 0.42}L${x},${y + size * 0.56}Z`;
    }

    return `M${x - half * 0.58},${y - half}L${x + half * 0.58},${y - half}L${x + half},${y}L${x + half * 0.58},${y + half}L${x - half * 0.58},${y + half}L${x - half},${y}Z`;
}

function getMarkerIcon(category) {
    const shape = markerShape[category];
    const fill = districtIconColors[category];

    if (shape === "circle") {
        return <circle cx="8" cy="8" r="5.8" fill={fill}/>;
    }

    if (shape === "square") {
        return <rect x="3" y="3" width="10" height="10" rx="1.5" fill={fill}/>;
    }

    if (shape === "diamond") {
        return <path d="M8 2.4 13.6 8 8 13.6 2.4 8Z" fill={fill}/>;
    }

    if (shape === "triangle") {
        return <path d="M8 2.2 14 13.2 2 13.2Z" fill={fill}/>;
    }

    if (shape === "invertedTriangle") {
        return <path d="M2 2.8 14 2.8 8 13.8Z" fill={fill}/>;
    }

    return <path d="M5 2.4H11L14 8 11 13.6H5L2 8Z" fill={fill}/>;
}

function getTooltipRows(area, color) {
    return [
        {label: "Points", value: formatInteger(area.total), color},
        {label: "Home share", value: formatPercent(area.shares.apartments * 100), color},
        {label: "Work share", value: formatPercent(((area.employers + area.jobs) / area.total) * 100), color},
        {
            label: "Leisure share",
            value: formatPercent(((area.schools + area.restaurants + area.pubs) / area.total) * 100),
            color,
        },
        {label: "Median rent", value: formatMoney(area.metrics.rentalCost.median), color},
    ];
}

function getLayerPoints(areas) {
    const points = [];

    areas.forEach((area) => {
        const categoryCounts = area.points.reduce((counts, point) => {
            counts.set(point.category, (counts.get(point.category) || 0) + 1);
            return counts;
        }, new Map());

        area.points
            .slice()
            .sort((a, b) => (categoryCounts.get(b.category) - categoryCounts.get(a.category)) || a.id.localeCompare(b.id))
            .forEach((point) => {
                const offset = markerOffset[point.category];

                points.push({
                    ...point,
                    renderX: point.x + offset.x,
                    renderY: point.y + offset.y,
                });
            });
    });

    return points;
}

function setCanvasSize(canvas) {
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.round(rect.width * ratio));
    const height = Math.max(1, Math.round(rect.height * ratio));

    if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
    }

    return {ratio, rect};
}

function setCanvasMarker(context, point) {
    const shape = markerShape[point.category];
    const size = markerRadius[point.category] * 2;
    const half = size / 2;
    const x = point.renderX;
    const y = point.renderY;

    context.beginPath();

    if (shape === "circle") {
        context.arc(x, y, half, 0, Math.PI * 2);
    } else if (shape === "square") {
        context.rect(x - half, y - half, size, size);
    } else if (shape === "hexagon") {
        const path = new Path2D(getMarkerPath(shape, size, x, y));
        context.fillStyle = districtIconColors[point.category];
        context.strokeStyle = "#ffffff";
        context.lineWidth = 2;
        context.fill(path);
        context.stroke(path);
        return;
    } else {
        const path = new Path2D(getMarkerPath(shape, size, x, y));
        context.fillStyle = districtIconColors[point.category];
        context.strokeStyle = "#ffffff";
        context.lineWidth = 2;
        context.fill(path);
        context.stroke(path);
        return;
    }

    context.fillStyle = districtIconColors[point.category];
    context.strokeStyle = "#ffffff";
    context.lineWidth = 2;
    context.fill();
    context.stroke();
}

function setCanvasContent(context, bounds, points, rect) {
    const scale = Math.min(rect.width / bounds.width, rect.height / bounds.height);
    const offsetX = (rect.width - bounds.width * scale) / 2;
    const offsetY = (rect.height - bounds.height * scale) / 2;

    context.save();
    context.translate(offsetX, offsetY);
    context.scale(scale, scale);
    context.globalAlpha = 0.95;
    points.forEach((point) => setCanvasMarker(context, point));
    context.restore();
}

function isSelected(areaId, selectedAreaIds) {
    return selectedAreaIds.includes(areaId);
}

function Legend() {
    return (
        <div className="areaMapLegend" aria-label="Map marker categories">
            {markerTypes.map((item) => (
                <span key={item.key}>
                    <svg viewBox="0 0 16 16" aria-hidden="true">
                        {getMarkerIcon(item.key)}
                    </svg>
                    {item.label}
                </span>
            ))}
        </div>
    );
}

function Stats({area, color}) {
    return (
        <Tooltip
            title={area.label || area.name.replace(/\s+District$/, "")}
            rows={getTooltipRows(area, color)}
            className="areaMapTooltip"
        />
    );
}

const PointLayer = memo(function PointLayer({areas, bounds}) {
    const canvasRef = useRef(null);
    const points = useMemo(() => getLayerPoints(areas), [areas]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");

        function setCanvas() {
            const {ratio, rect} = setCanvasSize(canvas);

            context.setTransform(ratio, 0, 0, ratio, 0, 0);
            context.clearRect(0, 0, rect.width, rect.height);

            if (points.length) {
                setCanvasContent(context, bounds, points, rect);
            }
        }

        setCanvas();

        const observer = new ResizeObserver(setCanvas);
        observer.observe(canvas);

        return () => {
            observer.disconnect();
        };
    }, [bounds, bounds.height, bounds.width, points]);

    return <canvas ref={canvasRef} className="areaMapCanvas" aria-hidden="true"/>;
});

function AreaCells({areas, hoveredAreaId, onHoverArea, onSelectArea, selectedAreaIds}) {
    return areas.map((area) => (
        <g
            key={area.id}
            onClick={(event) => onSelectArea(area.id, event)}
            onMouseEnter={() => onHoverArea(area.id)}
            onMouseLeave={() => onHoverArea(null)}
            className={[
                "areaMapCellGroup",
                hoveredAreaId === area.id ? "isHovered" : "",
                isSelected(area.id, selectedAreaIds) ? "isSelected" : "",
            ].filter(Boolean).join(" ")}
            aria-label={`${area.label || area.name} cluster`}
        >
            {area.cells.map((cell) => (
                <rect
                    key={cell.id}
                    x={cell.x}
                    y={cell.y}
                    width={cell.width}
                    height={cell.height}
                    rx={3}
                    fill="#ffffff"
                    fillOpacity="0"
                    stroke="transparent"
                    strokeOpacity="0"
                    strokeWidth="0"
                    pointerEvents="all"
                />
            ))}
        </g>
    ));
}

export default function DistrictMap({
                                        analysis,
                                        areas,
                                        areaColors,
                                        city,
                                        hoveredAreaId,
                                        onHoverArea,
                                        selectedAreaIds,
                                        onSelectArea,
                                    }) {
    const bounds = analysis.bounds;
    const hoveredArea = areas.find((area) => area.id === hoveredAreaId);
    const selectedArea = selectedAreaIds.length === 1 ? areas.find((area) => area.id === selectedAreaIds[0]) : null;
    const detailArea = selectedArea || hoveredArea || city;

    return (
        <div className="areaMapFrame">
            <div className="areaMapViewport">
                {/* Layer 1 – base map */}
                <svg
                    viewBox={`0 0 ${bounds.width} ${bounds.height}`}
                    preserveAspectRatio="xMidYMid meet"
                    className="areaMapSvg"
                >
                    <rect x={0} y={0} width={bounds.width} height={bounds.height} className="areaMapBackground"/>
                    <image href={baseMapUrl} x={0} y={0} width={bounds.width} height={bounds.height}
                           preserveAspectRatio="xMidYMid meet" className="areaMapImage"/>
                    <AreaCells
                        areas={areas}
                        hoveredAreaId={hoveredAreaId}
                        onHoverArea={onHoverArea}
                        onSelectArea={onSelectArea}
                        selectedAreaIds={selectedAreaIds}
                    />
                </svg>

                {/* Layer 2 – street coloring via HTML-level mix-blend-mode (works in Chromium) */}
                <svg
                    viewBox={`0 0 ${bounds.width} ${bounds.height}`}
                    preserveAspectRatio="xMidYMid meet"
                    className="areaColorOverlaySvg"
                    aria-hidden="true"
                >
                    <defs>
                        {areas.map((area) => (
                            <clipPath key={area.id} id={`area-color-clip-${area.id}`}>
                                {area.cells.map((cell) => (
                                    <rect
                                        key={cell.id}
                                        x={cell.x}
                                        y={cell.y}
                                        width={cell.width}
                                        height={cell.height}
                                        rx={3}
                                    />
                                ))}
                            </clipPath>
                        ))}
                    </defs>
                    {areas.map((area) => (
                        <g key={area.id} clipPath={`url(#area-color-clip-${area.id})`}>
                            <rect
                                x={0}
                                y={0}
                                width={bounds.width}
                                height={bounds.height}
                                fill={areaColors[area.id]}
                                fillOpacity="0.72"
                            />
                        </g>
                    ))}
                </svg>

                {/* Layer 3 – selection bounding boxes, above the color overlay so they render true color */}
                <svg
                    viewBox={`0 0 ${bounds.width} ${bounds.height}`}
                    preserveAspectRatio="xMidYMid meet"
                    className="areaSelectedOverlaySvg"
                    aria-hidden="true"
                >
                    <g className="areaMapSelectedLayer">
                        {areas.map((area) => {
                            const selected = isSelected(area.id, selectedAreaIds);

                            return (
                                <g key={area.id} className={selected ? "isVisible" : ""}>
                                    {area.cells.map((cell) => (
                                        <rect
                                            key={cell.id}
                                            x={cell.x}
                                            y={cell.y}
                                            width={cell.width}
                                            height={cell.height}
                                            rx={3}
                                            fill={areaColors[area.id]}
                                            fillOpacity="0.36"
                                            stroke={areaColors[area.id]}
                                            strokeOpacity="1"
                                            strokeWidth={1.7}
                                        />
                                    ))}
                                </g>
                            );
                        })}
                    </g>
                </svg>

                <PointLayer areas={hoveredArea ? [hoveredArea] : []} bounds={bounds}/>
            </div>

            <Legend/>
            <Stats area={detailArea} color={detailArea.id === "city" ? "#475569" : areaColors[detailArea.id]}/>
        </div>
    );
}
