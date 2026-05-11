import * as d3 from "d3";
import RowLabel from "../RowLabel";
import Tooltip from "../Tooltip";
import "./AreaContent.css";
import {
    categoryMeta,
    chartGridColor,
    formatInteger,
    formatPercent,
    getSupportingColor,
} from "../Utils";

export default function AreaContent({
                                        city,
                                        compositionRows,
                                        hoveredAreaId,
                                        onHoverArea,
                                        selectedAreaIds,
                                        onSelectArea,
                                        height = 230,
                                        showHoverDetail = false
                                    }) {
    const width = 820;
    const margin = {top: 10, right: 10, bottom: 24, left: 158};
    const keys = Object.keys(categoryMeta);
    const colorByKey = Object.fromEntries(keys.map((key) => [key, getSupportingColor(key)]));
    const maxTotal = d3.max(compositionRows, (areaComposition) => keys.reduce((sum, key) => sum + areaComposition[key], 0));
    const xScale = d3.scaleLinear().domain([0, maxTotal]).nice(4).range([margin.left, width - margin.right]);
    const yScale = d3.scaleBand().domain(compositionRows.map((areaComposition) => areaComposition.id)).range([margin.top, height - margin.bottom]).padding(0.28);
    const ticks = xScale.ticks(4);
    const hoveredComposition = compositionRows.find((areaComposition) => areaComposition.id === hoveredAreaId);
    const selectedComposition = selectedAreaIds.length === 1 ? compositionRows.find((areaComposition) => areaComposition.id === selectedAreaIds[0]) : null;
    const detailComposition = selectedComposition || hoveredComposition || city;
    const frameClassName = `frame compositionChart ${showHoverDetail ? "hasDetail" : ""}`.trim();

    function getSegments(areaComposition) {
        let start = 0;
        return keys.map((key) => {
            const count = areaComposition[key];
            const segment = {
                key,
                label: categoryMeta[key].label,
                value: count,
                x0: start,
                x1: start + count
            };

            start += count;

            return segment;
        });
    }

    function getDetailRows(areaComposition) {
        const compositionSegments = getSegments(areaComposition);
        const total = compositionSegments.reduce((sum, segment) => sum + segment.value, 0);
        const dominant = compositionSegments.reduce((best, segment) => (segment.value > best.value ? segment : best), compositionSegments[0]);
        const activeUses = compositionSegments.filter((segment) => segment.value > 0).length;

        return [
            {
                label: "Dominant use",
                value: `${dominant.label} (${formatPercent((dominant.value / total) * 100)})`,
                color: colorByKey[dominant.key],
            },
            {label: "Active", value: `${activeUses} of ${keys.length}`},
            ...compositionSegments.map((segment) => ({
                label: segment.label,
                value: formatInteger(segment.value),
                color: colorByKey[segment.key],
            }))
        ];
    }

    return (
        <div className={frameClassName}>
            <svg viewBox={`0 0 ${width} ${height}`} className="chartSvg">
                {ticks.map((tick) => (
                    <g key={tick}>
                        <line
                            x1={xScale(tick)}
                            x2={xScale(tick)}
                            y1={margin.top}
                            y2={height - margin.bottom + 4}
                            stroke={chartGridColor}
                        />
                        <text
                            x={xScale(tick)}
                            y={height - 7}
                            textAnchor="middle"
                            className="axisText"
                        >
                            {d3.format(".2s")(tick)}
                        </text>
                    </g>
                ))}

                {compositionRows.map((areaComposition) => {
                    const y = yScale(areaComposition.id);
                    const barHeight = yScale.bandwidth();
                    const isDimmed = selectedAreaIds.length === 0 || !selectedAreaIds.includes(areaComposition.id);

                    return (
                        <g
                            key={areaComposition.id}
                            className={`pointGroup ${hoveredAreaId === areaComposition.id ? "isLinked" : ""}`}
                            onClick={(event) => onSelectArea(areaComposition.id, event)}
                            onMouseEnter={() => onHoverArea(areaComposition.id)}
                            onMouseLeave={() => onHoverArea(null)}
                        >
                            <rect
                                x={0}
                                y={y - 2}
                                width={width}
                                height={barHeight + 4}
                                className="hitbox"
                            />

                            <RowLabel label={areaComposition.label} x={margin.left - 12} y={y + barHeight / 2}/>
                            {getSegments(areaComposition).map((segment) => (
                                <rect
                                    key={`${areaComposition.id}-${segment.key}`}
                                    x={xScale(segment.x0)}
                                    y={y}
                                    width={Math.max(0, xScale(segment.x1) - xScale(segment.x0))}
                                    height={barHeight}
                                    rx={5}
                                    ry={5}
                                    fill={colorByKey[segment.key]}
                                    opacity={isDimmed ? 0.32 : 0.9}
                                >
                                    <title>{`${areaComposition.label}: ${segment.label} ${segment.value}`}</title>
                                </rect>
                            ))}
                        </g>
                    );
                })}

                <line
                    x1={margin.left}
                    x2={width - margin.right}
                    y1={height - margin.bottom + 4}
                    y2={height - margin.bottom + 4}
                    className="refLine"
                />

            </svg>

            {showHoverDetail ? (
                <div className="detail">
                    <Tooltip
                        title={detailComposition.label}
                        rows={getDetailRows(detailComposition)}
                    />
                </div>
            ) : null}
        </div>
    );
}
