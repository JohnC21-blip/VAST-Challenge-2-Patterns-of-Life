import * as d3 from "d3";
import Dashboard from "../../../../components/common/Dashboard";
import Q2ChartFrame from "../Q2ChartFrame/Q2ChartFrame";
import {
    compactFormat,
    formatCount,
    formatSignedCount,
    trafficColors,
} from "../q2ChartUtils";
import "./HourlyTrips.css";

export default function HourlyTrips({
                                        activeInteraction,
                                        className = "",
                                        isExpanded = false,
                                        isHidden = false,
                                        onHover,
                                        onLeave,
                                        onSelect,
                                        onToggle,
                                        rows,
                                        selected,
                                    }) {
    const width = 820;
    const height = 360;
    const margin = {top: 24, right: 28, bottom: 76, left: 72};
    const xScale = d3.scaleLinear().domain([0, 23]).range([margin.left, width - margin.right]);
    const hourHitWidth = (width - margin.left - margin.right) / 24;
    const maxY = d3.max(rows, (row) => Math.max(row.arrivals, row.departures));
    const yScale = d3.scaleLinear().domain([0, maxY]).nice().range([height - margin.bottom - 72, margin.top]);
    const yTicks = yScale.ticks(3);
    const getLine = (key) => d3.line().x((row) => xScale(row.hour)).y((row) => yScale(row[key]))(rows);
    const netData = rows.map((row) => ({...row, delta: row.departures - row.arrivals}));
    const netBaseline = height - margin.bottom - 24;
    const maxAbsDelta = d3.max(netData, (row) => Math.abs(row.delta)) || 1;
    const netScale = d3.scaleLinear().domain([-maxAbsDelta, maxAbsDelta]).range([netBaseline + 38, netBaseline - 38]);
    const barWidth = Math.max(8, hourHitWidth * 0.52);
    const detailHour = activeInteraction?.kind === "hour" ? activeInteraction.hour : selected?.kind === "hour" ? selected.hour : null;
    const detailRow = rows.find((row) => row.hour === detailHour);
    const totalDepartures = d3.sum(rows, (row) => row.departures);
    const totalArrivals = d3.sum(rows, (row) => row.arrivals);
    const peakDeparture = rows[d3.maxIndex(rows, (row) => row.departures)];
    const peakArrival = rows[d3.maxIndex(rows, (row) => row.arrivals)];
    const peakTraffic = rows[d3.maxIndex(rows, (row) => row.departures + row.arrivals)];
    const totalTrips = totalDepartures + totalArrivals;
    const totalNetFlow = totalDepartures - totalArrivals;
    const detailNetFlow = detailRow ? detailRow.departures - detailRow.arrivals : 0;
    const detailRows = detailRow
        ? [
            {label: "Total trips", value: formatCount(detailRow.departures + detailRow.arrivals)},
            {label: "Departures", value: formatCount(detailRow.departures), color: trafficColors.corridors},
            {label: "Arrivals", value: formatCount(detailRow.arrivals), color: trafficColors.hotspots},
            {
                label: "Net flow",
                value: formatSignedCount(detailNetFlow),
                color: detailNetFlow >= 0 ? trafficColors.corridors : trafficColors.hotspots
            },
            {
                label: "Share of day",
                value: `${Math.round(((detailRow.departures + detailRow.arrivals) / totalTrips) * 100)}%`
            },
            {
                label: "Direction",
                value: detailRow.departures >= detailRow.arrivals ? "mostly leaving" : "mostly arriving"
            },
        ]
        : [
            {label: "Total trips", value: formatCount(totalTrips)},
            {label: "Departures", value: formatCount(totalDepartures), color: trafficColors.corridors},
            {label: "Arrivals", value: formatCount(totalArrivals), color: trafficColors.hotspots},
            {
                label: "Net flow",
                value: formatSignedCount(totalNetFlow),
                color: totalNetFlow >= 0 ? trafficColors.corridors : trafficColors.hotspots
            },
            {label: "Peak traffic hour", value: `${peakTraffic.hour}:00`},
            {label: "Peak departure", value: `${peakDeparture.hour}:00`},
            {label: "Peak arrival", value: `${peakArrival.hour}:00`},
        ];

    return (
        <Dashboard
            title="Hourly Flow"
            className={className}
            isExpanded={isExpanded}
            isHidden={isHidden}
            onToggle={onToggle}
        >
            <Q2ChartFrame
                showDetail={isExpanded}
                detailTitle={detailRow ? `Hour ${detailRow.hour}:00` : "Entire city"}
                detailRows={detailRows}
            >
                <svg viewBox={`0 0 ${width} ${height}`} className="chartSvg tripsChart">
                    <line
                        className="refLine"
                        x1={margin.left}
                        y1={height - margin.bottom - 72}
                        x2={width - margin.right}
                        y2={height - margin.bottom - 72}
                    />
                    <line
                        className="refLine"
                        x1={margin.left}
                        y1={margin.top}
                        x2={margin.left}
                        y2={height - margin.bottom - 72}
                    />
                    <line
                        className="refLine netBaseline"
                        x1={margin.left}
                        y1={netBaseline}
                        x2={width - margin.right}
                        y2={netBaseline}
                    />

                    {yTicks.map((tick) => (
                        <g key={tick}>
                            <line
                                className="gridLine"
                                x1={margin.left}
                                x2={width - margin.right}
                                y1={yScale(tick)}
                                y2={yScale(tick)}
                            />
                            <text
                                className="axisText"
                                x={margin.left - 10}
                                y={yScale(tick) + 4}
                                textAnchor="end"
                            >
                                {compactFormat(tick)}
                            </text>
                        </g>
                    ))}

                    {[0, 4, 8, 12, 16, 20, 23].map((hour) => (
                        <g key={hour}>
                            <line
                                className="gridLine"
                                x1={xScale(hour)}
                                x2={xScale(hour)}
                                y1={margin.top}
                                y2={netBaseline + 40}
                            />
                            <text
                                className="axisText"
                                x={xScale(hour)}
                                y={height - 34}
                                textAnchor="middle"
                            >
                                {hour}
                            </text>
                        </g>
                    ))}

                    {selected?.kind === "hour" ? (
                        <rect
                            x={xScale(selected.hour) - hourHitWidth / 2}
                            y={margin.top}
                            width={hourHitWidth}
                            height={netBaseline + 40 - margin.top}
                            fill="transparent"
                            stroke="#0f172a"
                            strokeWidth="2"
                        />
                    ) : null}

                    {activeInteraction?.kind === "hour" && activeInteraction.hour !== selected?.hour ? (
                        <rect
                            x={xScale(activeInteraction.hour) - hourHitWidth / 2}
                            y={margin.top}
                            width={hourHitWidth}
                            height={netBaseline + 40 - margin.top}
                            fill="transparent"
                            stroke="#0f172a"
                            strokeWidth="2"
                        />
                    ) : null}

                    <path d={getLine("departures")} fill="none" stroke={trafficColors.corridors} strokeWidth="3"/>
                    <path d={getLine("arrivals")} fill="none" stroke={trafficColors.hotspots} strokeWidth="3"/>

                    {netData.map((row) => {
                        const y = row.delta >= 0 ? netScale(row.delta) : netBaseline;
                        const barHeight = Math.abs(netScale(row.delta) - netBaseline);

                        return (
                            <rect
                                key={`net-${row.hour}`}
                                x={xScale(row.hour) - barWidth / 2}
                                y={y}
                                width={barWidth}
                                height={Math.max(1, barHeight)}
                                rx="3"
                                fill={row.delta >= 0 ? trafficColors.corridors : trafficColors.hotspots}
                                opacity="0.72"
                            />
                        );
                    })}

                    <text x={width - 150} y={30} fill={trafficColors.corridors} fontSize="12" fontWeight="700">
                        Departures
                    </text>

                    <text x={width - 150} y={48} fill={trafficColors.hotspots} fontSize="12" fontWeight="700">
                        Arrivals
                    </text>

                    <text x={width - 150} y={66} fill="#64748b" fontSize="12" fontWeight="700">
                        Net bars
                    </text>

                    <text
                        className="axisTitle"
                        x={(margin.left + width - margin.right) / 2}
                        y={height - 10}
                        textAnchor="middle"
                    >
                        Hour of day
                    </text>

                    <text
                        className="axisTitle"
                        x="16"
                        y={(margin.top + height - margin.bottom) / 2}
                        textAnchor="middle"
                        transform={`rotate(-90 16 ${(margin.top + height - margin.bottom) / 2})`}
                    >
                        Trip count / net
                    </text>

                    {rows.map((row) => (
                        <rect
                            key={row.hour}
                            x={xScale(row.hour) - hourHitWidth / 2}
                            y={margin.top}
                            width={hourHitWidth}
                            height={netBaseline + 40 - margin.top}
                            fill="transparent"
                            onMouseEnter={() => onHover({kind: "hour", hour: row.hour, label: `Hour ${row.hour}:00`})}
                            onMouseLeave={onLeave}
                            onClick={() => onSelect({kind: "hour", hour: row.hour, label: `Hour ${row.hour}:00`})}
                        />
                    ))}
                </svg>
            </Q2ChartFrame>
        </Dashboard>
    );
}
