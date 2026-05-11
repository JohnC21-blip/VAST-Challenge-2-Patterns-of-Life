import {useEffect, useState} from "react";
import {runViewTransition} from "../../utils/viewTransition";
import CityMovementMap from "./charts/CityMovementMap/CityMovementMap";
import HotTrafficLists from "./charts/HotTrafficLists/HotTrafficLists";
import HourlyTrips from "./charts/HourlyTrips/HourlyTrips";
import LocationPressureHeatmap from "./charts/LocationPressureHeatmap/LocationPressureHeatmap";
import WeekdayHeatmap from "./charts/WeekdayHeatmap/WeekdayHeatmap";
import {isMatchingInteraction, getVenueLabel} from "./charts/q2ChartUtils";
import "./Question2.css";

const analysisUrl = "/json/q2_analysis.json";
const corridorHourlyUrl = "/json/q2_corridor_hourly.json";
const defaultTrafficHour = 17;

export default function Question2() {
    const [analysis, setAnalysis] = useState(null);
    const [focus, setFocus] = useState(null);
    const [selectedHour, setSelectedHour] = useState(null);
    const [hover, setHover] = useState(null);
    const [expandedPanel, setExpandedPanel] = useState(null);

    useEffect(() => {
        async function getAnalysis() {
            const [analysisResponse, corridorHourlyResponse] = await Promise.all([
                fetch(analysisUrl),
                fetch(corridorHourlyUrl),
            ]);
            const nextAnalysis = await analysisResponse.json();
            nextAnalysis.corridorHourly = await corridorHourlyResponse.json();
            setAnalysis(nextAnalysis);
            setSelectedHour(defaultTrafficHour);
        }

        getAnalysis();
    }, []);

    if (!analysis) {
        return <div className="emptyState">Building coordinated traffic analysis...</div>;
    }

    const selectedHourInteraction = selectedHour == null ? null : {
        kind: "hour",
        hour: selectedHour,
        label: `Hour ${selectedHour}:00`
    };
    const activeInteraction = hover || focus || selectedHourInteraction;
    const mapInteraction = hover || focus;
    const summary = analysis.summary;
    const panelClasses = expandedPanel ? "gridQ2 hasExpanded" : "gridQ2";
    const venueRowsById = new Map(analysis.hotspotPoints.map((row) => [row.venueId, row]));
    const getVenueReference = (venueId) => {
        const venueRow = venueRowsById.get(venueId);
        if (!venueRow) {
            return `Location #${venueId}`;
        }
        const venueType = venueRow.venueType === "Workplace" ? "Employer" : venueRow.venueType;
        return `${venueType} #${venueId}`;
    };
    const corridorRows = analysis.topCorridors.map((row) => {
        const label = `${getVenueReference(row.startId)} \u2192 ${getVenueReference(row.endId)}`;
        return {
            ...row,
            label,
            __interaction: {kind: "corridor", startId: row.startId, endId: row.endId, label}
        };
    });

    const pressureRows = analysis.pressure.map((row) => ({
        ...row,
        label: row.label,
        __interaction: {kind: "location", id: row.locationId, label: row.label}
    }));

    const hotspotRows = analysis.hotspotPoints.slice().sort((a, b) => b.count - a.count).slice(0, 12)
        .map((row) => {
            const label = getVenueLabel(row);

            return {
                ...row,
                label,
                __interaction: {kind: "venue", id: row.venueId, label}
            };
        });

    function setPanel(panelId) {
        const setNextPanel = () => {
            setExpandedPanel((currentPanel) => (currentPanel === panelId ? null : panelId));
        };

        runViewTransition(setNextPanel);
    }

    const panelState = (panelId) => ({
        isExpanded: expandedPanel === panelId,
        isHidden: expandedPanel && expandedPanel !== panelId,
        onToggle: () => setPanel(panelId),
    });

    function setInteraction(nextInteraction) {
        if (nextInteraction.kind === "hour") {
            setSelectedHour((currentHour) => (currentHour === nextInteraction.hour ? null : nextInteraction.hour));
            return;
        }

        setFocus((currentInteraction) => (isMatchingInteraction(currentInteraction, nextInteraction) ? null : nextInteraction));
    }

    return (
        <main className="content contentQ2">
            <section className="module moduleQ2">
                <section className={panelClasses}>
                    <CityMovementMap
                        activeInteraction={mapInteraction}
                        corridorHourly={analysis.corridorHourly}
                        corridors={analysis.topCorridorMap}
                        hovered={hover}
                        hotspots={analysis.hotspotPoints}
                        selected={focus}
                        selectedHour={selectedHour}
                        summary={summary}
                        hourlyTrips={analysis.hourlyTrips}
                        onHover={setHover}
                        onLeave={() => setHover(null)}
                        onSelect={setInteraction}
                        pressure={analysis.pressure}
                    />

                    <HotTrafficLists
                        hovered={hover}
                        selected={focus}
                        hotspotRows={hotspotRows}
                        corridorRows={corridorRows}
                        pressureRows={pressureRows}
                        {...panelState("hot-bars")}
                        onHover={setHover}
                        onLeave={() => setHover(null)}
                        onSelect={setInteraction}
                    />

                    <HourlyTrips
                        rows={analysis.hourlyTrips}
                        activeInteraction={activeInteraction}
                        selected={selectedHourInteraction}
                        className="hourlyPanel"
                        {...panelState("hourly")}
                        onHover={setHover}
                        onLeave={() => setHover(null)}
                        onSelect={setInteraction}
                    />

                    <LocationPressureHeatmap
                        pressureData={analysis.hourlyPressure}
                        activeInteraction={activeInteraction}
                        selected={focus}
                        selectedHour={selectedHour}
                        className="pressureHeatmapPanel"
                        {...panelState("pressure-heatmap")}
                        onHover={setHover}
                        onLeave={() => setHover(null)}
                        onSelect={setInteraction}
                    />

                    <WeekdayHeatmap
                        weekdayData={analysis.weekdayHour}
                        activeInteraction={activeInteraction}
                        selected={selectedHourInteraction}
                        className="heatmapPanel"
                        {...panelState("heatmap")}
                        onHover={setHover}
                        onLeave={() => setHover(null)}
                        onSelect={setInteraction}
                    />

                </section>
            </section>
        </main>
    );
}
