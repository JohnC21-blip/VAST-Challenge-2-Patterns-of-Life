import {startTransition, useDeferredValue, useEffect, useState} from "react";
import Dashboard from "../../components/common/Dashboard";
import {runViewTransition} from "../../utils/viewTransition";
import DistrictMap from "./charts/DistrictMap/DistrictMap";
import EvidenceMatrix from "./charts/EvidenceMatrix/EvidenceMatrix";
import HousingWorkBalance from "./charts/HousingWorkBalance/HousingWorkBalance";
import AreaTypeMatrix from "./charts/AreaTypeMatrix/AreaTypeMatrix.jsx";
import AreaContent from "./charts/AreaContent/AreaContent";
import {getDistrictColor, getDistrictDisplayName} from "./charts/Utils";
import "./Question1.css";

export default function Question1() {
    const [selectedAreaIds, setSelectedAreaIds] = useState([]);
    const [analysis, setAnalysis] = useState(null);
    const [expandedPanel, setExpandedPanel] = useState(null);
    const [hoveredAreaId, setHoveredAreaId] = useState(null);

    useEffect(() => {
        async function getAnalysis() {
            const response = await fetch("/json/area_analysis.json");
            const next = await response.json();
            setAnalysis(next);
            setSelectedAreaIds(next.areas.map((area) => area.id));
        }

        getAnalysis();
    }, []);

    const selectedDeferredAreaIds = useDeferredValue(selectedAreaIds);

    function setArea(areaId) {
        startTransition(() => {
            setSelectedAreaIds((currentAreaIds) => (currentAreaIds.includes(areaId) ? currentAreaIds.filter((id) => id !== areaId) : [...currentAreaIds, areaId]));
        });
    }

    function setSelectedArea(areaId, event) {
        event.stopPropagation();
        setArea(areaId);
    }

    function setPanel(panelId) {
        runViewTransition(() => {
            setExpandedPanel((currentPanel) => (currentPanel === panelId ? null : panelId));
        });
    }

    if (!analysis) {
        return <main className="content">Loading...</main>;
    }

    const areas = analysis.areas;
    const areaRanking = [...areas].sort((a, b) => b.total - a.total);
    const areaColors = Object.fromEntries(areaRanking.map((area, index) => [area.id, getDistrictColor(index, areaRanking.length)]));
    const sumAreas = (selector) => areas.reduce((sum, area) => sum + selector(area), 0);
    const totalApartments = sumAreas((area) => area.apartments);
    const totalJobs = sumAreas((area) => area.jobs);
    const totalEmployers = sumAreas((area) => area.employers);
    const cityTotal = sumAreas((area) => area.total);

    const city = {
        id: "city",
        label: "Entire city",
        total: cityTotal,
        apartments: totalApartments,
        employers: totalEmployers,
        jobs: totalJobs,
        schools: sumAreas((area) => area.schools),
        restaurants: sumAreas((area) => area.restaurants),
        pubs: sumAreas((area) => area.pubs),
        metrics: {
            rentalCost: {median: sumAreas((area) => area.metrics.rentalCost.median) / areas.length},
            hourlyRate: {median: sumAreas((area) => area.metrics.hourlyRate.median) / areas.length},
            support: {jobsPerApartment: totalJobs / totalApartments}
        }
    };

    city.shares = {apartments: city.apartments / city.total};
    city.homeShare = Number((city.shares.apartments * 100).toFixed(1));
    city.workShare = Number((((city.jobs + city.employers) / city.total) * 100).toFixed(1));

    const compositionData = areaRanking.map((area) => ({
        id: area.id,
        label: getDistrictDisplayName(area),
        apartments: area.apartments,
        employers: area.employers,
        jobs: area.jobs,
        schools: area.schools,
        restaurants: area.restaurants,
        pubs: area.pubs,
    }));

    const balanceData = areaRanking.map((area) => ({
        id: area.id,
        label: getDistrictDisplayName(area),
        apartments: area.apartments,
        employers: area.employers,
        jobs: area.jobs,
        schools: area.schools,
        restaurants: area.restaurants,
        pubs: area.pubs,
        total: area.total,
        homeShare: Number((area.shares.apartments * 100).toFixed(1)),
        workShare: Number((((area.jobs + area.employers) / area.total) * 100).toFixed(1)),
    }));

    const chartHeight = expandedPanel === "composition" ? 420 : 230;
    const panelClasses = expandedPanel ? "grid hasExpanded" : "grid";
    const panelState = (panelId) => ({
        isExpanded: expandedPanel === panelId,
        isHidden: expandedPanel && expandedPanel !== panelId,
        onToggle: () => setPanel(panelId),
    });

    return (
        <main className="content">
            <section className="module" id="spatial-diagnostics">
                <section className={panelClasses}>
                    <Dashboard
                        title="City Areas"
                        className="mapPanel"
                    >
                        <DistrictMap
                            analysis={analysis}
                            areas={areas}
                            areaColors={areaColors}
                            hoveredAreaId={hoveredAreaId}
                            onHoverArea={setHoveredAreaId}
                            selectedAreaIds={selectedDeferredAreaIds}
                            onSelectArea={setSelectedArea}
                            city={city}
                        />
                    </Dashboard>

                    <Dashboard
                        title="Why This Area Type?"
                        className="activityPanel"
                        {...panelState("activity")}
                    >
                        <AreaTypeMatrix
                            areas={areaRanking}
                            hoveredAreaId={hoveredAreaId}
                            onHoverArea={setHoveredAreaId}
                            selectedAreaIds={selectedDeferredAreaIds}
                            onSelectArea={setSelectedArea}
                            showHoverDetail={expandedPanel === "activity"}
                            city={city}
                        />
                    </Dashboard>

                    <Dashboard
                        title="What Is in Each Area?"
                        className="compositionPanel"
                        {...panelState("composition")}
                    >
                        <AreaContent
                            compositionRows={compositionData}
                            hoveredAreaId={hoveredAreaId}
                            onHoverArea={setHoveredAreaId}
                            selectedAreaIds={selectedDeferredAreaIds}
                            onSelectArea={setSelectedArea}
                            height={chartHeight}
                            showHoverDetail={expandedPanel === "composition"}
                            city={city}
                        />
                    </Dashboard>

                    <Dashboard
                        title="Key Area Measures"
                        className="evidencePanel"
                        {...panelState("evidence")}
                    >
                        <EvidenceMatrix
                            areas={areaRanking}
                            hoveredAreaId={hoveredAreaId}
                            onHoverArea={setHoveredAreaId}
                            selectedAreaIds={selectedDeferredAreaIds}
                            onSelectArea={setSelectedArea}
                            showHoverDetail={expandedPanel === "evidence"}
                            city={city}
                        />
                    </Dashboard>

                    <Dashboard
                        title="Homes and Jobs"
                        className="balancePanel"
                        {...panelState("balance")}
                    >
                        <HousingWorkBalance
                            balanceRows={balanceData}
                            areaColors={areaColors}
                            hoveredAreaId={hoveredAreaId}
                            onHoverArea={setHoveredAreaId}
                            selectedAreaIds={selectedDeferredAreaIds}
                            onSelectArea={setSelectedArea}
                            showHoverDetail={expandedPanel === "balance"}
                            city={city}
                        />
                    </Dashboard>
                </section>
            </section>
        </main>
    );
}
