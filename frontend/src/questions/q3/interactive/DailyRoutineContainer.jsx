/**
 * DailyRoutineContainer.jsx — React/Redux ↔ D3 glue
 * ---------------------------------------------------
 * Same 3-useEffect pattern as always:
 *   [] mount → create D3
 *   [data]   → renderVis
 *   cleanup  → clear
 */

import "./DailyRoutine.css";
import { useEffect, useMemo, useRef, useState }  from "react";
import { useDispatch, useSelector }     from "react-redux";
import {
  clearHoverInfo,
  setHoverInfo,
  setHoveredInteraction,
  setSelectedInfo,
  toggleSelectedInteraction,
} from "./slices/interactionSlice";
import DailyRoutineD3                   from "./DailyRoutine-d3";
import {venueColor}                     from "./venueColors";

function DailyRoutineContainer({participantId = null, showStatus = true}) {

  const dispatch    = useDispatch();
  const checkinData = useSelector(state => state.checkin.data);
  const selectedIds = useSelector(state => state.checkin.selectedIds);
  const status      = useSelector(state => state.checkin.status);
  const activeInteraction = useSelector(state => state.interaction.hoveredInteraction || state.interaction.selectedInteraction);
  const selectedInteraction = useSelector(state => state.interaction.selectedInteraction);
  const visibleData = useMemo(() => (
    participantId == null
      ? checkinData
      : checkinData.filter(event => event.participantId === participantId)
  ), [checkinData, participantId]);

  const divRef   = useRef(null);
  const chartRef = useRef(null);
  const [chartSize, setChartSize] = useState(null);

  useEffect(() => {
    const element = divRef.current;

    if (!element) {
      return undefined;
    }

    const resizeObserver = new ResizeObserver(([entry]) => {
      const width = Math.round(entry.contentRect.width);
      const height = Math.round(entry.contentRect.height);

      if (width > 0 && height > 0) {
        setChartSize((currentSize) => (
          currentSize?.width === width && currentSize?.height === height ? currentSize : {width, height}
        ));
      }
    });

    resizeObserver.observe(element);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // ── Mount ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!chartSize) {
      return undefined;
    }

    const chart = new DailyRoutineD3(divRef.current);
    chart.create({ size: chartSize });
    chartRef.current = chart;

    return () => {
      chart.clear();
      chartRef.current = null;
    };
  }, [chartSize]);

  // ── Update ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || status !== "succeeded") return;

    function getCellInteraction(d) {
      const dominantVenue = Object.entries(d.byVenue).sort((a,b) => b[1]-a[1])[0]?.[0] || null;

      return {
        kind: "routine-cell",
        key: `daily-${d.participantId}-${d.weekday}-${d.hour}-${dominantVenue || "all"}`,
        participantId: d.participantId,
        source: "Daily Routine",
        weekday: d.weekday,
        hour: d.hour,
        venueType: dominantVenue,
      };
    }

    function getCellInfo(d) {
      const interaction = getCellInteraction(d);

      return {
        title: `${d.weekday} ${d.hour}:00`,
        fields: {
          source: interaction.source,
          participant: `P${d.participantId}`,
          weekday: d.weekday,
          hour: `${d.hour}:00`,
          venue: interaction.venueType || "Mixed",
          venueColor: interaction.venueType ? venueColor(interaction.venueType) : null,
          checkins: d.total.toLocaleString(),
          Apartment: (d.byVenue.Apartment || 0).toLocaleString(),
          Workplace: (d.byVenue.Workplace || 0).toLocaleString(),
          Restaurant: (d.byVenue.Restaurant || 0).toLocaleString(),
          Pub: (d.byVenue.Pub || 0).toLocaleString(),
        },
      };
    }

    const controllerMethods = {
      handleCellMouseEnter(d) {
        if (d.total === 0) {
          dispatch(setHoveredInteraction(null));
          dispatch(clearHoverInfo());
          return;
        }

        const interaction = getCellInteraction(d);
        dispatch(setHoveredInteraction(interaction));
        dispatch(setHoverInfo(getCellInfo(d)));
      },
      handleCellClick(d) {
        if (d.total === 0) return;
        const interaction = getCellInteraction(d);
        const isSameSelection = selectedInteraction
          && selectedInteraction.kind === interaction.kind
          && selectedInteraction.key === interaction.key;

        dispatch(toggleSelectedInteraction(interaction));
        dispatch(setSelectedInfo(isSameSelection ? null : getCellInfo(d)));
      },
    };

    chart.renderVis(visibleData, controllerMethods);
  }, [chartSize, dispatch, selectedInteraction, status, visibleData]);

  useEffect(() => {
    chartRef.current?.highlightInteraction(activeInteraction);
  }, [activeInteraction]);

  function clearChartHover() {
    dispatch(setHoveredInteraction(null));
    dispatch(clearHoverInfo());
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="dailyRoutineWrapper">

      {/* Status bar */}
      {showStatus && (
        <div className="dailyRoutineStatus">
          {status === "loading"   && <span className="status-loading">Loading…</span>}
          {status === "failed"    && <span className="status-error">Error loading check-in CSV.</span>}
          {status === "succeeded" && (
            <span>
              <strong>P{participantId ?? selectedIds[0]}</strong>
              {participantId == null ? <> vs <strong>P{selectedIds[1]}</strong></> : null}
              &nbsp;·&nbsp;{visibleData.length.toLocaleString()} check-in events
              &nbsp;·&nbsp;Hover a cell for details
            </span>
          )}
        </div>
      )}

      {/* Chart */}
      <div ref={divRef} className="dailyRoutineChart" onMouseLeave={clearChartHover}>
        {(status !== "succeeded" || visibleData.length === 0) && (
          <div className="q3ChartState">
            {status === "failed"
              ? "Daily routine failed to load"
              : status === "succeeded"
                ? "No daily routine data for this participant"
                : "Loading daily routine"}
          </div>
        )}
      </div>

    </div>
  );
}

export default DailyRoutineContainer;
