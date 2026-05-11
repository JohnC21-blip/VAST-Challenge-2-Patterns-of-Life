import * as d3 from "d3";
import Dashboard from "../../../../components/common/Dashboard";
import {getSupportingColor} from "../../../q1/charts/Utils";
import Q2ChartFrame from "../Q2ChartFrame/Q2ChartFrame";
import {formatCount, percentFormat} from "../q2ChartUtils";
import "./WeekdayHeatmap.css";

export default function WeekdayHeatmap({
                                           activeInteraction,
                                           className = "",
                                           weekdayData,
                                           isExpanded = false,
                                           isHidden = false,
                                           onHover,
                                           onLeave,
                                           onSelect,
                                           onToggle,
                                           selected,
                                       }) {
    const activityMatrix = weekdayData.matrix;
    const weekdays = weekdayData.days;
    const maxActivity = d3.max(activityMatrix.flat());

    const activityColor = d3
        .scaleSequential((normalizedActivity) => d3.interpolateRgbBasis([
            "#f8fafc",
            getSupportingColor("apartments"),
            getSupportingColor("jobs"),
            getSupportingColor("pubs"),
        ])(normalizedActivity))
        .domain([0, maxActivity]);

    const detailHour = activeInteraction?.kind === "hour" ? activeInteraction.hour : selected?.kind === "hour" ? selected.hour : null;
    const selectedHour = selected?.kind === "hour" ? selected.hour : null;
    const hoveredHour = activeInteraction?.kind === "hour" ? activeInteraction.hour : null;
    const hourActivityByDay = detailHour == null ? [] : activityMatrix.map((dayActivity) => dayActivity[detailHour]);
    const hourActivityTotal = d3.sum(hourActivityByDay);
    const peakDayIndex = d3.maxIndex(hourActivityByDay);
    const peakDay = weekdays[peakDayIndex];
    const dayTotals = activityMatrix.map((dayActivity) => d3.sum(dayActivity));
    const hourTotals = weekdayData.hours.map((hour) => d3.sum(activityMatrix, (dayActivity) => dayActivity[hour]));
    const totalActivity = d3.sum(dayTotals);
    const overallPeakWeekdayIndex = d3.maxIndex(dayTotals);
    const overallPeakHourIndex = d3.maxIndex(hourTotals);

    const detailRows = detailHour == null
        ? [
            {label: "Activity", value: formatCount(totalActivity)},
            {label: "Peak day", value: weekdays[overallPeakWeekdayIndex]},
            {label: "Peak activity hour", value: `${weekdayData.hours[overallPeakHourIndex]}:00`},
            {label: "Peak activity share", value: percentFormat(hourTotals[overallPeakHourIndex] / totalActivity)},
            {label: "Peak day share", value: percentFormat(dayTotals[overallPeakWeekdayIndex] / totalActivity)},
        ]
        : [
            {label: "Activity at this hour", value: formatCount(hourActivityTotal)},
            {label: "Peak day", value: peakDay},
            {label: "Peak day share", value: percentFormat(hourActivityByDay[peakDayIndex] / hourActivityTotal)},
            {label: "Hour share", value: percentFormat(hourActivityTotal / totalActivity)},
        ];

    return (
        <Dashboard
            title="Weekday and Hour Intensity"
            className={className}
            isExpanded={isExpanded}
            isHidden={isHidden}
            onToggle={onToggle}
        >
            <Q2ChartFrame
                showDetail={isExpanded}
                detailTitle={detailHour == null ? "Entire city" : `Hour ${detailHour}:00`}
                detailRows={detailRows}
            >
                <div className="scrollChart">
                    <svg viewBox="0 0 820 292" className="chartSvg heatmapChart">
                        {activityMatrix.map((dayActivity, rowIndex) => (
                            dayActivity.map((activityCount, columnIndex) => {
                                return (
                                    <rect
                                        key={`${rowIndex}-${columnIndex}`}
                                        x={78 + columnIndex * 28}
                                        y={28 + rowIndex * 26}
                                        width="24"
                                        height="22"
                                        rx="3"
                                        fill={activityColor(activityCount)}
                                        stroke="#ffffff"
                                        strokeWidth="0.5"
                                        onMouseEnter={() => onHover({
                                            kind: "hour",
                                            hour: columnIndex,
                                            label: `${weekdays[rowIndex]} ${columnIndex}:00`
                                        })}
                                        onMouseLeave={onLeave}
                                        onClick={() => onSelect({
                                            kind: "hour",
                                            hour: columnIndex,
                                            label: `${weekdays[rowIndex]} ${columnIndex}:00`
                                        })}
                                    />
                                );
                            })
                        ))}
                        {selectedHour != null ? (
                            <rect
                                className="weekdayHourMarker"
                                x={78 + selectedHour * 28}
                                y="28"
                                width="24"
                                height={weekdays.length * 26 - 4}
                                rx="4"
                            />
                        ) : null}
                        {hoveredHour != null && hoveredHour !== selectedHour ? (
                            <rect
                                className="weekdayHourMarker"
                                x={78 + hoveredHour * 28}
                                y="28"
                                width="24"
                                height={weekdays.length * 26 - 4}
                                rx="4"
                            />
                        ) : null}
                        {weekdays.map((weekday, index) => (
                            <text
                                key={weekday}
                                className="axisText"
                                x="52"
                                y={44 + index * 26}
                                textAnchor="end"
                            >
                                {weekday}
                            </text>
                        ))}

                        {[0, 4, 8, 12, 16, 20, 23].map((hour) => (
                            <text
                                key={hour}
                                className="axisText"
                                x={84 + hour * 28}
                                y="20"
                                textAnchor="middle"
                            >
                                {hour}
                            </text>
                        ))}

                        <text className="axisTitle" x="414" y="232" textAnchor="middle">Hour of day</text>
                        <text
                            className="axisTitle"
                            x="16"
                            y="128"
                            textAnchor="middle"
                            transform="rotate(-90 16 128)"
                        >
                            Weekday
                        </text>

                        {Array.from({length: 120}).map((_, index) => (
                            <rect
                                key={index}
                                x={78 + index * 4}
                                y="254"
                                width="4"
                                height="10"
                                fill={activityColor((index / 119) * maxActivity)}
                            />
                        ))}

                        <text className="axisText" x="78" y="280">0</text>
                        <text className="axisText" x="528" y="280">{formatCount(maxActivity)}</text>
                    </svg>
                </div>
            </Q2ChartFrame>
        </Dashboard>
    );
}
