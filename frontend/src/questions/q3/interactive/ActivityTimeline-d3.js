/**
 * ActivityTimeline-d3.js  — Monthly small-multiples heatmap
 * ----------------------------------------------------------
 * One selected calendar month, x = hour (0-23), y = day of week (Mon-Sun).
 * Cell colour = dominant venue type, opacity ∝ check-in count.
 *
 * Public API  (same contract as DailyRoutine-d3.js):
 *   chart.create({ size })
 *   chart.renderVis(data, controllerMethods)
 *   chart.clear()
 *
 * controllerMethods used:
 *   handleDotMouseEnter(d, event)   — re-uses the container's existing tooltip handler
 *   handleDotMouseLeave()
 */

import * as d3 from "d3";
import {venueColor} from "./venueColors";

const DAYS  = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = d3.range(0, 24);

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun",
                     "Jul","Aug","Sep","Oct","Nov","Dec"];
const fmtMonth = str => {
  const [y, m] = str.split("-");
  return `${MONTH_NAMES[+m - 1]} ${y}`;
};

// 1 check-in → 0.45 opacity, 4+ check-ins → 1.0
const opacityScale = d3.scaleLinear().domain([1, 4]).range([0.45, 1.0]).clamp(true);

class ActivityTimelineD3 {

  margin  = { top: 12, right: 28, bottom: 38, left: 44 };

  // Layout constants
  COLS    = 5;
  colGap  = 12;   // px between mini-heatmap columns
  rowGap  = 12;   // px between mini-heatmap rows (not counting label)
  labelH  = 0;    // the selected month is controlled by React, not labeled in SVG
  pGap    = 40;   // px between P0 grid bottom and P1 label

  svg = null; width = 0;

  constructor(el) { this.el = el; }

  // ── create ─────────────────────────────────────────────────────────────────
  create({ size }) {
    this.width = size.width - this.margin.left - this.margin.right;
    this.availableHeight = size.height - this.margin.top - this.margin.bottom;

    this.svg = d3.select(this.el)
      .append("svg")
        .attr("width",  size.width)
        .attr("height", size.height)
      .append("g")
        .attr("class", "svgG")
        .attr("transform",
              `translate(${this.margin.left},${this.margin.top})`);

    this.svg.append("g").attr("class", "gridsG");
  }

  // ── renderVis ──────────────────────────────────────────────────────────────
  renderVis(visData, controllerMethods) {
    if (!visData || visData.length === 0) {
      this.svg?.select(".gridsG").selectAll("*").remove();
      return;
    }

    const allMonths = [...new Set(visData.map(d => d.date.slice(0, 7)))].sort();
    const activeCols = allMonths.length <= 1 ? 1 : this.COLS;
    const { colGap, rowGap, labelH, pGap } = this;
    const COLS = activeCols;
    const ROWS      = Math.ceil(allMonths.length / COLS);
    const participantCount = Math.max(1, new Set(visData.map(d => d.participantId)).size);

    // Fill the available width evenly across columns, then cap height to the card.
    const miniW = Math.floor((this.width - (COLS - 1) * colGap) / COLS);
    const participantGap = participantCount > 1 ? pGap : 0;
    const maxMiniH = Math.max(
      11,
      Math.floor((this.availableHeight - participantGap - (participantCount * (ROWS * labelH + (ROWS - 1) * rowGap))) / (participantCount * ROWS))
    );
    const miniH = Math.max(11, Math.min(Math.round(miniW * 7 / 24), maxMiniH));
    const cellW = miniW / 24;
    const cellH = miniH / 7;

    // Height of one participant's grid
    const gridH = ROWS * (labelH + miniH) + (ROWS - 1) * rowGap;
    // Total SVG content height
    const totalH = participantCount * (gridH + labelH) + participantGap;

    d3.select(this.el).select("svg")
      .attr("height", this.availableHeight + this.margin.top + this.margin.bottom);

    const contentHeight = totalH + this.margin.top + this.margin.bottom;
    const centeredOffset = Math.max(0, (this.availableHeight + this.margin.top + this.margin.bottom - contentHeight) / 2);

    this.svg
      .attr("transform", `translate(${this.margin.left},${this.margin.top + centeredOffset})`);

    const ids = [...new Set(visData.map(d => d.participantId))].sort((a, b) => a - b);

    this.svg.select(".gridsG")
      .selectAll(".participantGrid")
      .filter(function () {
        return !ids.includes(Number(this.id.replace("pg-", "")));
      })
      .remove();

    ids.forEach((participantId, pIdx) => {
      const pData = visData.filter(d => d.participantId === participantId);

      // Each participant grid starts below the previous one + pGap
      const gridY = pIdx * (gridH + labelH + pGap);

      const gridId = `pg-${participantId}`;
      let gridG = this.svg.select(".gridsG").select(`#${gridId}`);
      if (gridG.empty()) {
        gridG = this.svg.select(".gridsG").append("g")
          .attr("id", gridId).attr("class", "participantGrid");
      }
      gridG.attr("transform", `translate(0,${gridY})`);

      gridG.select(".pLabel").remove();

      const activeMonthIds = new Set(allMonths.map(month => `mc-${participantId}-${month.replace("-", "")}`));
      gridG.selectAll(".monthCell")
        .filter(function () {
          return !activeMonthIds.has(this.id);
        })
        .remove();

      // ── One mini-heatmap per month ────────────────────────────────────────
      allMonths.forEach((month, mIdx) => {
        const col = mIdx % COLS;
        const row = Math.floor(mIdx / COLS);

        // Top-left corner of this mini-heatmap's content (cells), label sits above
        const mx = col * (miniW + colGap);
        const my = row * (labelH + miniH + rowGap) + labelH;

        // Aggregate (hour, weekday) for this participant + month
        const counts = {};
        pData
          .filter(d => d.date.slice(0, 7) === month)
          .forEach(d => {
            const key = `${d.hour}-${d.weekday}`;
            if (!counts[key]) counts[key] = { total: 0, byVenue: {} };
            counts[key].total++;
            counts[key].byVenue[d.venueType] =
              (counts[key].byVenue[d.venueType] || 0) + 1;
          });

        const safeId = `mc-${participantId}-${month.replace("-", "")}`;
        let cellG = gridG.select(`#${safeId}`);
        if (cellG.empty()) {
          cellG = gridG.append("g").attr("id", safeId).attr("class", "monthCell");
        }
        cellG
          .attr("transform", `translate(${mx},${my})`)
          .style("cursor", "default")
          .on("click", null);

        cellG.select(".monthLabel").remove();

        cellG.select(".expandIcon").remove();

        // Border — fill:transparent (not none) so gaps between cells still catch clicks
        let border = cellG.select(".miniBorder");
        if (border.empty()) border = cellG.append("rect").attr("class", "miniBorder");
        border
          .attr("width", miniW).attr("height", miniH)
          .attr("fill", "none")
          .attr("stroke", "none").attr("stroke-width", 0)
          .attr("pointer-events", "none");

        cellG.selectAll(".dayLabel")
          .data(DAY_SHORT, d => d)
          .join("text")
          .attr("class", "dayLabel")
          .attr("x", -6)
          .attr("y", (_, i) => i * cellH + cellH / 2)
          .attr("text-anchor", "end")
          .attr("dominant-baseline", "middle")
          .style("font-size", "10px")
          .style("fill", "#64748b")
          .text(d => d);

        cellG.selectAll(".hourLabel")
          .data([0, 3, 6, 9, 12, 15, 18, 21, 23], h => h)
          .join("text")
          .attr("class", "hourLabel")
          .attr("x", h => h * cellW + cellW / 2)
          .attr("y", miniH + 18)
          .attr("text-anchor", "middle")
          .style("font-size", "10px")
          .style("fill", "#64748b")
          .text(h => `${h}h`);

        // Cells (hour × weekday)
        const cellData = [];
        HOURS.forEach(hour => {
          DAYS.forEach(weekday => {
            const key  = `${hour}-${weekday}`;
            const info = counts[key] || { total: 0, byVenue: {} };
            cellData.push({ hour, weekday, month, participantId, ...info });
          });
        });

        cellG.selectAll(".cell")
          .data(cellData, d => `${d.hour}-${d.weekday}`)
          .join(
            enter => enter.append("rect")
              .attr("class", "cell")
              .attr("x",       d => d.hour * cellW)
              .attr("y",       d => DAYS.indexOf(d.weekday) * cellH)
              .attr("width",   cellW - 0.5)
              .attr("height",  cellH - 0.5)
              .attr("pointer-events", "none")
              .attr("fill", d => {
                if (d.total === 0) return "#f8fafc";
                const dom = Object.entries(d.byVenue)
                  .sort((a, b) => b[1] - a[1])[0][0];
                return venueColor(dom);
              })
              .attr("opacity", d =>
                d.total === 0 ? 1 : opacityScale(d.total)),

            update => update
              .attr("fill", d => {
                if (d.total === 0) return "#f8fafc";
                const dom = Object.entries(d.byVenue)
                  .sort((a, b) => b[1] - a[1])[0][0];
                return venueColor(dom);
              })
              .attr("opacity", d =>
                d.total === 0 ? 1 : opacityScale(d.total)),

            exit => exit.remove()
          );

        const hitCells = cellG.selectAll(".cellHitbox")
          .data(cellData, d => `${d.hour}-${d.weekday}`);

        hitCells.enter().append("rect")
          .attr("class", "cellHitbox")
          .merge(hitCells)
          .attr("x", d => d.hour * cellW)
          .attr("y", d => DAYS.indexOf(d.weekday) * cellH)
          .attr("width", cellW)
          .attr("height", cellH)
          .attr("fill", "transparent")
          .attr("pointer-events", "all")
          .style("cursor", d => d.total === 0 ? "default" : "pointer")
          .on("click", (event, d) => {
            if (d.total === 0) {
              return;
            }

            const dom = Object.entries(d.byVenue)
              .sort((a, b) => b[1] - a[1])[0][0];
            controllerMethods.handleDotClick?.({
              timestamp : null,
              date      : `${fmtMonth(month)} · ${d.weekday.slice(0, 3)}`,
              month,
              participantId,
              hour      : d.hour,
              weekday   : d.weekday,
              venueType : dom,
              venueId   : `${d.total} check-in${d.total !== 1 ? "s" : ""}`,
              total     : d.total,
              byVenue   : d.byVenue,
            }, event);
          })
          .on("mouseenter", (event, d) => {
            if (d.total === 0) {
              controllerMethods.handleDotMouseLeave?.();
              return;
            }

            const dom = Object.entries(d.byVenue)
              .sort((a, b) => b[1] - a[1])[0][0];
            controllerMethods.handleDotMouseEnter({
              timestamp : null,
              date      : `${fmtMonth(month)} · ${d.weekday.slice(0, 3)}`,
              month,
              participantId,
              hour      : d.hour,
              weekday   : d.weekday,
              venueType : dom,
              venueId   : `${d.total} check-in${d.total !== 1 ? "s" : ""}`,
              total     : d.total,
              byVenue   : d.byVenue,
            }, event);
          });
        hitCells.exit().remove();
      });
    });
  }

  highlightInteraction(interaction) {
    const hasInteraction = Boolean(interaction);

    this.svg?.selectAll(".cell")
      .attr("opacity", (d) => {
        if (!hasInteraction) return d.total === 0 ? 1 : opacityScale(d.total);
        if (ActivityTimelineD3.matchesCell(d, interaction)) return 1;
        if (ActivityTimelineD3.matchesTimeContext(d, interaction)) return Math.max(0.68, d.total === 0 ? 0.68 : opacityScale(d.total));
        return d.total === 0 ? 0.46 : Math.max(0.46, opacityScale(d.total) * 0.72);
      })
      .attr("stroke", (d) => (
        hasInteraction && ActivityTimelineD3.matchesCell(d, interaction) ? "#2563eb" : "none"
      ))
      .attr("stroke-width", (d) => (
        hasInteraction && ActivityTimelineD3.matchesCell(d, interaction) ? 1.4 : 0
      ));
  }

  static matchesCell(d, interaction) {
    if (!interaction) return false;

    if (interaction.kind === "venue") {
      return Boolean(d.byVenue?.[interaction.venueType]);
    }

    const sameTime = d.hour === interaction.hour && (!interaction.weekday || d.weekday === interaction.weekday);
    const sameVenue = !interaction.venueType || Boolean(d.byVenue?.[interaction.venueType]);

    return sameTime && sameVenue;
  }

  static matchesTimeContext(d, interaction) {
    if (!interaction || interaction.kind === "venue") return false;

    return d.hour === interaction.hour && (!interaction.weekday || d.weekday === interaction.weekday);
  }

  // ── clear ──────────────────────────────────────────────────────────────────
  clear() {
    d3.select(this.el).selectAll("*").remove();
  }
}

export default ActivityTimelineD3;
