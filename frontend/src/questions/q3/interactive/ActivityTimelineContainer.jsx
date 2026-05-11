/**
 * ActivityTimelineContainer.jsx — React/Redux ↔ D3 glue
 * -------------------------------------------------------
 * Same 3-useEffect pattern as DailyRoutineContainer:
 *   []       mount   → create D3
 *   [data]   update  → renderVis
 *   cleanup          → clear
 *
 */

import "./ActivityTimeline.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector }     from "react-redux";
import {
  clearHoverInfo,
  setHoverInfo,
  setHoveredInteraction,
  setSelectedInfo,
  toggleSelectedInteraction,
} from "./slices/interactionSlice";
import ActivityTimelineD3               from "./ActivityTimeline-d3";
import {venueColor} from "./venueColors";

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun",
                     "Jul","Aug","Sep","Oct","Nov","Dec"];
const fmtMonth = str => {
  const [y, m] = str.split("-");
  return `${MONTH_NAMES[+m - 1]} ${y}`;
};

// ── Container ─────────────────────────────────────────────────────────────────
function ActivityTimelineContainer({participantId = null, selectedMonth = null, showStatus = true}) {

  const dispatch    = useDispatch();
  const checkinData = useSelector(state => state.checkin.data);
  const selectedIds = useSelector(state => state.checkin.selectedIds);
  const status      = useSelector(state => state.checkin.status);
  const activeInteraction = useSelector(state => state.interaction.hoveredInteraction || state.interaction.selectedInteraction);
  const selectedInteraction = useSelector(state => state.interaction.selectedInteraction);
  const visibleData = useMemo(() => (
    (participantId == null
      ? checkinData
      : checkinData.filter(event => event.participantId === participantId))
      .filter(event => selectedMonth == null || event.date.startsWith(selectedMonth))
  ), [checkinData, participantId, selectedMonth]);

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

    const chart = new ActivityTimelineD3(divRef.current);
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
      return {
        kind: "routine-cell",
        key: `monthly-${d.participantId ?? participantId ?? "all"}-${d.month || "all"}-${d.weekday}-${d.hour}-${d.venueType || "all"}`,
        participantId: d.participantId ?? participantId,
        source: "Monthly Routine",
        month: d.month || null,
        weekday: d.weekday,
        hour: d.hour,
        venueType: d.venueType,
      };
    }

    function getCellInfo(d) {
        const time = d.timestamp
          ? new Date(d.timestamp).toLocaleTimeString([], {
              hour: "2-digit", minute: "2-digit",
            })
          : `${d.hour}:00`;

        return {
          title: d.date,
          fields: {
            source: "Monthly Routine",
            participant: participantId == null ? "All" : `P${participantId}`,
            date: d.month || d.date,
            weekday: d.weekday,
            hour: time,
            venue: d.venueType || "Mixed",
            venueColor: d.venueType ? venueColor(d.venueType) : null,
            checkins: (d.total || 0).toLocaleString(),
            Apartment: (d.byVenue?.Apartment || 0).toLocaleString(),
            Workplace: (d.byVenue?.Workplace || 0).toLocaleString(),
            Restaurant: (d.byVenue?.Restaurant || 0).toLocaleString(),
            Pub: (d.byVenue?.Pub || 0).toLocaleString(),
          },
        };
    }

    const controllerMethods = {
      handleDotMouseEnter(d) {
        const interaction = getCellInteraction(d);
        dispatch(setHoveredInteraction(interaction));
        dispatch(setHoverInfo(getCellInfo(d)));
      },
      handleDotMouseLeave() {
        dispatch(setHoveredInteraction(null));
        dispatch(clearHoverInfo());
      },
      handleDotClick(d) {
        const interaction = getCellInteraction(d);
        const isSameSelection = selectedInteraction
          && selectedInteraction.kind === interaction.kind
          && selectedInteraction.key === interaction.key;

        dispatch(toggleSelectedInteraction(interaction));
        dispatch(setSelectedInfo(isSameSelection ? null : getCellInfo(d)));
      },
    };

    chart.renderVis(visibleData, controllerMethods);
  }, [chartSize, dispatch, participantId, selectedInteraction, status, visibleData]);

  useEffect(() => {
    chartRef.current?.highlightInteraction(activeInteraction);
  }, [activeInteraction]);

  function clearChartHover() {
    dispatch(setHoveredInteraction(null));
    dispatch(clearHoverInfo());
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="activityTimelineWrapper">

      {showStatus && (
        <div className="activityTimelineStatus">
          {status === "loading"   && <span className="status-loading">Loading…</span>}
          {status === "failed"    && <span className="status-error">Error loading check-in CSV.</span>}
          {status === "succeeded" && (
            <span>
              <strong>P{participantId ?? selectedIds[0]}</strong>
              {participantId == null ? <> vs <strong>P{selectedIds[1]}</strong></> : null}
              &nbsp;·&nbsp;{visibleData.length.toLocaleString()} events
              {selectedMonth ? <>&nbsp;·&nbsp;{fmtMonth(selectedMonth)}</> : null}
            </span>
          )}
        </div>
      )}

      <div ref={divRef} className="activityTimelineChart" onMouseLeave={clearChartHover}>
        {(status !== "succeeded" || visibleData.length === 0) && (
          <div className="q3ChartState">
            {status === "failed"
              ? "Monthly routine failed to load"
              : status === "succeeded"
                ? "No monthly routine data for this participant"
                : "Loading monthly routine"}
          </div>
        )}
      </div>

    </div>
  );
}

export default ActivityTimelineContainer;
