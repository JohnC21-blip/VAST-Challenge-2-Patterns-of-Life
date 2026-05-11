import * as d3 from "d3";
import Dashboard from "../../../../components/common/Dashboard";
import {
    formatCount,
    isMatchingInteraction,
    ratioFormat,
    trafficColors,
} from "../q2ChartUtils";
import "./HotTrafficLists.css";

function ListRows({
                      color = trafficColors.hotspots,
                      formatter = formatCount,
                      hovered,
                      labelKey,
                      maxItems = 12,
                      onLeave,
                      onSelect,
                      onHover,
                      trafficRows,
                      selected,
                      valueKey,
                  }) {
    const visibleTrafficRows = trafficRows.slice(0, maxItems);
    const maxValue = d3.max(visibleTrafficRows, (trafficRow) => trafficRow[valueKey]);

    return (
        <div className="barList">
            {visibleTrafficRows.map((trafficRow, index) => {
                const isSelected = isMatchingInteraction(selected, trafficRow.__interaction);
                const isHovered = isMatchingInteraction(hovered, trafficRow.__interaction);
                const width = `${(trafficRow[valueKey] / maxValue) * 100}%`;

                const rowClassName = [
                    "barRow",
                    isSelected ? "isSelected" : "",
                    isHovered ? "isHovered" : "",
                ].filter(Boolean).join(" ");

                return (
                    <button
                        type="button"
                        key={`${trafficRow[labelKey]}-${index}`}
                        className={rowClassName}
                        onMouseEnter={() => onHover(trafficRow.__interaction)}
                        onMouseLeave={onLeave}
                        onClick={() => onSelect(trafficRow.__interaction)}
                    >
                        <span className="barLabel">{trafficRow[labelKey]}</span>
                        <strong>{formatter(trafficRow[valueKey])}</strong>
                        <span className="barTrack">
                            <span style={{"--bar-color": color, width}}/>
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

export default function HotTrafficLists({
                                            hovered,
                                            hotspotRows,
                                            isExpanded,
                                            isHidden,
                                            onHover,
                                            onLeave,
                                            onSelect,
                                            onToggle,
                                            pressureRows,
                                            corridorRows,
                                            selected,
                                        }) {
    const maxItems = isExpanded ? 12 : 3;
    const corridorGradient = `linear-gradient(90deg, ${trafficColors.corridors} 0%, ${trafficColors.hotspots} 100%)`;
    const sections = [
        {title: "Top Hotspots (number of check-ins)", rows: hotspotRows, valueKey: "count", color: trafficColors.hotspots},
        {title: "Origin-Destination Corridors (number of trips)", rows: corridorRows, valueKey: "trips", color: corridorGradient},
        {
            title: "Destination Pressure (ratio)",
            rows: pressureRows,
            valueKey: "ratio",
            color: trafficColors.pressure,
            formatter: ratioFormat
        },
    ];

    return (
        <Dashboard
            title="Hot Traffic Lists"
            className="listPanel hotBarsPanel"
            isExpanded={isExpanded}
            isHidden={isHidden}
            onToggle={onToggle}
        >
            <div className="bars">
                {sections.map((section) => (
                    <section className="barSection" key={section.title}>
                        <h3>{section.title}</h3>
                        <ListRows
                            trafficRows={section.rows}
                            valueKey={section.valueKey}
                            labelKey="label"
                            color={section.color}
                            formatter={section.formatter}
                            hovered={hovered}
                            selected={selected}
                            maxItems={maxItems}
                            onHover={onHover}
                            onLeave={onLeave}
                            onSelect={onSelect}
                        />
                    </section>
                ))}
            </div>
        </Dashboard>
    );
}
