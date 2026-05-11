import {useEffect, useMemo, useState} from "react";
import {useDispatch, useSelector} from "react-redux";
import {runViewTransition} from "../../../utils/viewTransition";
import {fetchParticipants} from "./slices/participantsSlice";
import {fetchCheckin} from "./slices/checkinSlice";
import {resetInteraction} from "./slices/interactionSlice";
import ActivityTimelineContainer from "./ActivityTimelineContainer";
import DailyRoutineContainer from "./DailyRoutineContainer";
import ParticipantPicker from "./ParticipantPicker";
import Tooltip from "../../q1/charts/Tooltip";
import {VENUE_COLORS, VENUE_MARKER_SHAPES} from "./venueColors";
import {markerPath} from "./similarityMarkers";
import "./Q3Interactive.css";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatMonth(month) {
  if (!month) {
    return "Month";
  }

  const [year, monthNumber] = month.split("-");

  return `${MONTH_NAMES[Number(monthNumber) - 1]} ${year}`;
}

function ParticipantCardLabel({participantId}) {
  return (
    <div className="q3ParticipantLabel">
      <strong>Participant #{participantId}</strong>
    </div>
  );
}

function getHoverRows(fields = {}) {
  return [
    {label: "Source", value: fields.source || "None"},
    {label: "Participant", value: fields.participant || "None"},
    {label: "Date", value: fields.date || "None"},
    {label: "Weekday", value: fields.weekday || "None"},
    {label: "Hour", value: fields.hour || "None"},
    {label: "Venue", value: fields.venue || "None", color: fields.venueColor},
    {label: "Check-ins", value: fields.checkins || "None"},
    {label: "Apartment", value: fields.Apartment || "0", color: VENUE_COLORS.Apartment},
    {label: "Workplace", value: fields.Workplace || "0", color: VENUE_COLORS.Workplace},
    {label: "Restaurant", value: fields.Restaurant || "0", color: VENUE_COLORS.Restaurant},
    {label: "Pub", value: fields.Pub || "0", color: VENUE_COLORS.Pub},
  ];
}

function Q3HoverDetail({routineLabel}) {
  const hoverInfo = useSelector((state) => state.interaction.hoverInfo);
  const selectedInfo = useSelector((state) => state.interaction.selectedInfo);
  const hoveredInteraction = useSelector((state) => state.interaction.hoveredInteraction);
  const selectedInteraction = useSelector((state) => state.interaction.selectedInteraction);
  const activeInteraction = hoveredInteraction || selectedInteraction;
  const detailInfo = hoveredInteraction ? hoverInfo : selectedInfo;
  const matchesRoutine = !routineLabel
    || detailInfo?.fields?.source == null
    || detailInfo.fields.source === routineLabel;
  const visibleDetailInfo = activeInteraction && matchesRoutine ? detailInfo : null;
  const title = visibleDetailInfo?.title || `Hover or click a ${routineLabel || "routine"} cell`;
  const fields = visibleDetailInfo?.fields || {
    source: routineLabel || "Routine comparison",
    weekday: "None",
    hour: "None",
    venue: "None",
    checkins: "None",
  };

  return (
    <div className="detail q3ExpandedDetail q3RoutineHoverBox" aria-live="polite">
      <Tooltip
        title={title}
        rows={getHoverRows(fields)}
        className="q3RoutineExpandedTooltip"
      />
    </div>
  );
}

function Q3RoutineLegend() {
  return (
    <div className="q3RoutineLegend" aria-label="Routine graph legend">
      {Object.entries(VENUE_COLORS).map(([venueType, color]) => (
        <span className="q3RoutineLegendItem" key={venueType}>
          <svg viewBox="-8 -8 16 16" aria-hidden="true">
            {VENUE_MARKER_SHAPES[venueType] === "circle" ? (
              <circle r="5.8" fill={color} stroke="#ffffff" strokeWidth="1.8"/>
            ) : (
              <path
                d={markerPath(VENUE_MARKER_SHAPES[venueType], 11.6)}
                fill={color}
                stroke="#ffffff"
                strokeWidth="1.8"
              />
            )}
          </svg>
          {venueType}
        </span>
      ))}
      <span className="q3RoutineLegendItem">
        <svg viewBox="0 0 30 12" aria-hidden="true">
          <rect x="1" y="2" width="7" height="8" rx="2" fill="#3b82f6" opacity="0.35"/>
          <rect x="11.5" y="2" width="7" height="8" rx="2" fill="#3b82f6" opacity="0.65"/>
          <rect x="22" y="2" width="7" height="8" rx="2" fill="#3b82f6" opacity="1"/>
        </svg>
        More check-ins
      </span>
      <span className="q3RoutineLegendItem">
        <svg viewBox="0 0 12 12" aria-hidden="true">
          <rect x="1.5" y="1.5" width="9" height="9" rx="2" fill="#ffffff" stroke="#2563eb" strokeWidth="1.6"/>
        </svg>
        Hover or pinned context
      </span>
    </div>
  );
}

function Q3Controls() {
  return (
    <section className="card q3ControlsCard">
      <div className="cardBody q3ControlsBody">
        <ParticipantPicker/>
        <Q3RoutineLegend/>
      </div>
    </section>
  );
}

function RoutineParticipantPane({
  children,
  participantId,
  routineLabel,
  showHoverDetail,
}) {
  return (
    <section className={[
      "q3RoutineParticipantPane",
      showHoverDetail ? "hasHoverDetail" : "",
    ].filter(Boolean).join(" ")}>
      <div className="q3ParticipantToolbar">
        <ParticipantCardLabel participantId={participantId}/>
      </div>
      <div className="q3RoutineChartSlot">
        {children}
      </div>
      {showHoverDetail ? (
        <Q3HoverDetail routineLabel={routineLabel}/>
      ) : null}
    </section>
  );
}

function RoutineComparisonSection({
  childrenByParticipant,
  isExpanded,
  onToggleExpanded,
  sectionId,
  title,
}) {
  const selectedIds = useSelector((state) => state.checkin.selectedIds);

  return (
    <section className={[
      "card q3RoutineComparisonCard",
      isExpanded ? "isExpanded" : "",
    ].filter(Boolean).join(" ")}>
      <div className="cardTitle q3RoutineComparisonTitle">
        <span>{title}</span>
        <button
          type="button"
          className="cardTitleButton q3CardExpandButton"
          aria-label={`${isExpanded ? "Collapse" : "Expand"} ${title}`}
          aria-expanded={isExpanded}
          onClick={() => onToggleExpanded(sectionId)}
        >
          <span className="q3VisuallyHidden">{isExpanded ? "Collapse card" : "Expand card"}</span>
        </button>
      </div>
      <div className="cardBody q3RoutineComparisonBody">
        {[0, 1].map((slot) => (
          <RoutineParticipantPane
            key={`${title}-${selectedIds[slot]}`}
            participantId={selectedIds[slot]}
            routineLabel={title}
            showHoverDetail={isExpanded}
            slot={slot}
          >
            {childrenByParticipant(selectedIds[slot])}
          </RoutineParticipantPane>
        ))}
      </div>
    </section>
  );
}

function MonthlyRoutineComparisonSection({isExpanded, onToggleExpanded, sectionId}) {
  const dispatch = useDispatch();
  const checkinData = useSelector((state) => state.checkin.data);
  const selectedIds = useSelector((state) => state.checkin.selectedIds);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const months = useMemo(() => (
    [...new Set(checkinData.map((event) => event.date.slice(0, 7)))].sort()
  ), [checkinData]);
  const activeMonth = selectedMonth && months.includes(selectedMonth)
    ? selectedMonth
    : months[0] || "";

  function handleMonthChange(event) {
    setSelectedMonth(event.target.value);
    dispatch(resetInteraction());
  }

  return (
    <section className={[
      "card q3RoutineComparisonCard",
      isExpanded ? "isExpanded" : "",
    ].filter(Boolean).join(" ")}>
      <div className="cardTitle q3RoutineComparisonTitle">
        <span>Monthly Routine</span>
        <div className="q3RoutineTitleActions">
          <label className="q3MonthSelect">
            <span>Month</span>
            <select
              value={activeMonth}
              onChange={handleMonthChange}
              disabled={months.length === 0}
            >
              {months.length === 0 ? (
                <option value="">Loading</option>
              ) : months.map((month) => (
                <option key={month} value={month}>{formatMonth(month)}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="cardTitleButton q3CardExpandButton"
            aria-label={`${isExpanded ? "Collapse" : "Expand"} Monthly Routine`}
            aria-expanded={isExpanded}
            onClick={() => onToggleExpanded(sectionId)}
          >
            <span className="q3VisuallyHidden">{isExpanded ? "Collapse card" : "Expand card"}</span>
          </button>
        </div>
      </div>
      <div className="cardBody q3RoutineComparisonBody">
        {[0, 1].map((slot) => (
          <RoutineParticipantPane
            key={`Monthly Routine-${selectedIds[slot]}-${activeMonth || "loading"}`}
            participantId={selectedIds[slot]}
            routineLabel="Monthly Routine"
            showHoverDetail={isExpanded}
            slot={slot}
          >
            <ActivityTimelineContainer
              participantId={selectedIds[slot]}
              selectedMonth={activeMonth || null}
              showStatus={false}
            />
          </RoutineParticipantPane>
        ))}
      </div>
    </section>
  );
}

export default function Q3Interactive() {
  const dispatch = useDispatch();
  const selectedIds = useSelector((state) => state.checkin.selectedIds);
  const [expandedRoutine, setExpandedRoutine] = useState(null);

  function toggleExpandedRoutine(sectionId) {
    runViewTransition(() => {
      setExpandedRoutine((currentSectionId) => (
        currentSectionId === sectionId ? null : sectionId
      ));
      dispatch(resetInteraction());
    });
  }

  useEffect(() => {
    dispatch(fetchParticipants());
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchCheckin({p1: selectedIds[0], p2: selectedIds[1]}));
    dispatch(resetInteraction());
  }, [dispatch, selectedIds]);

  return (
    <main className="content contentQ3">
      <section className="module moduleQ3">
        <div className="gridQ3">
          <Q3Controls/>
          <div className={[
            "q3RoutineComparisonStack",
            expandedRoutine ? "hasExpanded" : "",
            expandedRoutine === "daily" ? "dailyExpanded" : "",
            expandedRoutine === "monthly" ? "monthlyExpanded" : "",
          ].filter(Boolean).join(" ")}>
            <RoutineComparisonSection
              sectionId="daily"
              title="Daily Routine"
              isExpanded={expandedRoutine === "daily"}
              onToggleExpanded={toggleExpandedRoutine}
              childrenByParticipant={(participantId) => (
                <DailyRoutineContainer participantId={participantId} showStatus={false}/>
              )}
            />
            <MonthlyRoutineComparisonSection
              sectionId="monthly"
              isExpanded={expandedRoutine === "monthly"}
              onToggleExpanded={toggleExpandedRoutine}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
