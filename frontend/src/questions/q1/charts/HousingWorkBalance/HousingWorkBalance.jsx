import * as d3 from "d3";
import RowLabel from "../RowLabel";
import Tooltip from "../Tooltip";
import "./HousingWorkBalance.css";
import {formatInteger, getSupportingColor} from "../Utils";

export default function HousingWorkBalance({
                                               city,
                                               balanceRows,
                                               areaColors,
                                               hoveredAreaId,
                                               onHoverArea,
                                               selectedAreaIds,
                                               onSelectArea,
                                               showHoverDetail = false,
                                           }) {
    const width = 800;
    const rowHeight = 36;
    const height = balanceRows.length * rowHeight + 58;
    const margin = {top: 24, right: 24, bottom: 28, left: 158};
    const centerX = margin.left + (width - margin.left - margin.right) / 2;
    const maxShare = d3.max(balanceRows, (balanceRow) => Math.max(balanceRow.homeShare, balanceRow.workShare));
    const halfWidth = (width - margin.left - margin.right) / 2;
    const shareScale = d3.scaleLinear().domain([0, Math.max(100, maxShare)]).range([0, halfWidth]);
    const yScale = d3.scaleBand().domain(balanceRows.map((balanceRow) => balanceRow.label)).range([margin.top, height - margin.bottom]).padding(0.32);
    const hoveredBalance = balanceRows.find((balanceRow) => balanceRow.id === hoveredAreaId);
    const selectedBalance = selectedAreaIds.length === 1 ? balanceRows.find((balanceRow) => balanceRow.id === selectedAreaIds[0]) : null;
    const detailBalance = selectedBalance || hoveredBalance || city;
    const frameClassName = `frame balanceChart ${showHoverDetail ? "hasDetail" : ""}`.trim();

    function getDetailRows(balanceRow) {
        const workCount = balanceRow.employers + balanceRow.jobs;
        const shareGap = balanceRow.workShare - balanceRow.homeShare;

        return [
            {label: "Homes counted", value: formatInteger(balanceRow.apartments), color: areaColors[balanceRow.id]},
            {label: "Work points counted", value: formatInteger(workCount), color: areaColors[balanceRow.id]},
            {label: "Work per apartment", value: (workCount / balanceRow.apartments).toFixed(1)},
            {label: "Balance gap", value: `${shareGap > 0 ? "+" : ""}${shareGap.toFixed(1)} pts`},
            {label: "Apartments", value: formatInteger(balanceRow.apartments), color: getSupportingColor("apartments")},
            {label: "Employers", value: formatInteger(balanceRow.employers), color: getSupportingColor("employers")},
            {label: "Jobs", value: formatInteger(balanceRow.jobs), color: getSupportingColor("jobs")},
            {label: "Schools", value: formatInteger(balanceRow.schools), color: getSupportingColor("schools")},
            {
                label: "Restaurants",
                value: formatInteger(balanceRow.restaurants),
                color: getSupportingColor("restaurants")
            },
            {label: "Pubs", value: formatInteger(balanceRow.pubs), color: getSupportingColor("pubs")},
        ];
    }

    return (
        <div className={frameClassName}>
            <svg viewBox={`0 0 ${width} ${height}`} className="chartSvg">
                <line
                    x1={centerX}
                    x2={centerX}
                    y1={margin.top - 8}
                    y2={height - margin.bottom + 4}
                    className="refLine"
                />

                {[25, 50, 75].map((tick) => (
                    <g key={tick}>
                        <line
                            x1={centerX - shareScale(tick)}
                            x2={centerX - shareScale(tick)}
                            y1={margin.top - 4}
                            y2={height - margin.bottom}
                            className="gridLine"
                        />
                        <line
                            x1={centerX + shareScale(tick)}
                            x2={centerX + shareScale(tick)}
                            y1={margin.top - 4}
                            y2={height - margin.bottom}
                            className="gridLine"
                        />
                    </g>
                ))}

                <text x={centerX - halfWidth} y={14} textAnchor="start" className="axisTitle">
                    Residential share
                </text>
                <text x={centerX + halfWidth} y={14} textAnchor="end" className="axisTitle">
                    Work share
                </text>

                {balanceRows.map((balanceRow) => {
                    const y = yScale(balanceRow.label);
                    const barHeight = yScale.bandwidth();
                    const isDimmed = selectedAreaIds.length === 0 || !selectedAreaIds.includes(balanceRow.id);
                    const homeWidth = shareScale(balanceRow.homeShare);
                    const workWidth = shareScale(balanceRow.workShare);

                    return (
                        <g
                            key={balanceRow.id}
                            className={`pointGroup ${hoveredAreaId === balanceRow.id ? "isLinked" : ""}`}
                            onClick={(event) => onSelectArea(balanceRow.id, event)}
                            onMouseEnter={() => onHoverArea(balanceRow.id)}
                            onMouseLeave={() => onHoverArea(null)}
                        >
                            <rect
                                x={0}
                                y={y - 2}
                                width={width}
                                height={barHeight + 4}
                                className="hitbox"
                            />

                            <RowLabel label={balanceRow.label} x={margin.left - 12} y={y + barHeight / 2}/>

                            <rect
                                x={centerX - homeWidth}
                                y={y}
                                width={homeWidth}
                                height={barHeight}
                                rx={6}
                                fill={areaColors[balanceRow.id]}
                                opacity={isDimmed ? 0.18 : 0.48}
                            />
                            <rect
                                x={centerX}
                                y={y}
                                width={workWidth}
                                height={barHeight}
                                rx={6}
                                fill={areaColors[balanceRow.id]}
                                opacity={isDimmed ? 0.18 : 0.9}
                            />

                            {homeWidth > 34 ? (
                                <text
                                    x={centerX - homeWidth + 8}
                                    y={y + barHeight / 2 + 4}
                                    className="inbarText"
                                    opacity={isDimmed ? 0.18 : 1}
                                >
                                    {balanceRow.homeShare.toFixed(0)}%
                                </text>
                            ) : (
                                <text
                                    x={centerX - homeWidth - 8}
                                    y={y + barHeight / 2 + 4}
                                    textAnchor="end"
                                    className="valueText"
                                    opacity={isDimmed ? 0.18 : 1}
                                >
                                    {balanceRow.homeShare.toFixed(0)}%
                                </text>
                            )}

                            <text
                                x={centerX + workWidth + 8}
                                y={y + barHeight / 2 + 4}
                                className="valueText"
                                opacity={isDimmed ? 0.18 : 1}
                            >
                                {balanceRow.workShare.toFixed(0)}%
                            </text>
                        </g>
                    );
                })}
            </svg>

            {showHoverDetail ? (
                <div className="detail">
                    <Tooltip
                        title={detailBalance.label}
                        rows={getDetailRows(detailBalance)}
                    />
                </div>
            ) : null}
        </div>
    );
}
