/**
 * DailyRoutine-d3.js  — Heatmap: hour-of-day × day-of-week
 * ----------------------------------------------------------
 * One heatmap grid per participant (stacked vertically).
 * Cell colour intensity = number of check-ins at that (hour, weekday).
 * Cells are also split by venueType using a small coloured bar at the bottom.
 *
 * Public API:
 *   chart.create({ size })
 *   chart.renderVis(data, controllerMethods)
 *   chart.clear()
 */

import * as d3 from "d3";
import {venueColor} from "./venueColors";

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const HOURS = d3.range(0, 24);   // [0, 1, ..., 23]

class DailyRoutineD3 {

  margin       = { top: 18, right: 34, bottom: 30, left: 44 };
  gridGap      = 40;    // vertical gap between the two participant grids
  transitionMs = 500;

  svg = null; width = 0; height = 0;
  cellW = 0; cellH = 0;

  constructor(el) { this.el = el; }

  // ── create ─────────────────────────────────────────────────────────────────
  create({ size }) {
    this.width  = size.width  - this.margin.left - this.margin.right;
    this.availableHeight = size.height;
    // height will expand to fit two grids — we'll set SVG height in renderVis
    this.containerWidth = size.width;

    this.cellW = this.width / 24;
    this.cellH = Math.max(
      16,
      Math.min(this.cellW, (size.height - this.margin.top - this.margin.bottom - this.gridGap - 20) / 14)
    );

    this.svg = d3.select(this.el)
      .append("svg")
        .attr("width", size.width)
        .attr("height", size.height)   // temporary — updated in renderVis
      .append("g")
        .attr("class", "svgG")
        .attr("transform",
              `translate(${this.margin.left},${this.margin.top})`);

    // X axis label
    this.svg.append("text")
      .attr("class", "xLabel")
      .attr("x", this.width / 2)
      .attr("text-anchor", "middle")
      .style("font-size", "12px").style("fill", "#64748b")
      .text("Hour of day");

    // Groups populated by renderVis
    this.svg.append("g").attr("class", "gridsG");
  }

  // ── renderVis ──────────────────────────────────────────────────────────────
  renderVis(visData, controllerMethods) {
    if (!visData || visData.length === 0) {
      this.svg?.select(".gridsG").selectAll("*").remove();
      return;
    }

    const ids = [...new Set(visData.map(d => d.participantId))]
      .sort((a, b) => a - b);

    const participantCount = ids.length;
    const participantGap = participantCount > 1 ? this.gridGap : 0;
    const cellW = this.cellW;
    const cellH = Math.max(
      14,
      Math.min(
        cellW,
        (this.availableHeight - this.margin.top - this.margin.bottom - participantGap - 24) / (participantCount * DAYS.length)
      )
    );
    const gridH = DAYS.length * cellH;   // height of one participant's grid
    const totalH = participantCount * gridH + participantGap + 20;

    // Resize SVG to fit both grids
    d3.select(this.el).select("svg")
      .attr("height", this.availableHeight);

    this.svg.select(".gridsG")
      .selectAll(".participantGrid")
      .filter(function () {
        return !ids.includes(Number(this.id.replace("grid-", "")));
      })
      .remove();

    // Move X axis label below both grids
    const contentHeight = totalH + this.margin.top + this.margin.bottom;
    const centeredOffset = Math.max(0, (this.availableHeight - contentHeight) / 2);

    this.svg
      .attr("transform", `translate(${this.margin.left},${this.margin.top + centeredOffset})`);

    this.svg.select(".xLabel")
      .attr("y", totalH + 28);

    // ── Per-participant grids ────────────────────────────────────────────────
    ids.forEach((participantId, pIdx) => {

      const pData  = visData.filter(d => d.participantId === participantId);
      const gridY  = pIdx * (gridH + this.gridGap);

      // Aggregate: count check-ins per (hour, weekday, venueType)
      const counts = {};  // key: "hour-weekday" → { total, byVenue: {} }
      pData.forEach(d => {
        const key = `${d.hour}-${d.weekday}`;
        if (!counts[key]) counts[key] = { total: 0, byVenue: {} };
        counts[key].total++;
        counts[key].byVenue[d.venueType] = (counts[key].byVenue[d.venueType] || 0) + 1;
      });

      const localMax = d3.max(Object.values(counts), v => v.total) || 1;

      // Colour scale: white → dark blue, per participant
      const colorScale = d3.scaleSequential()
        .domain([0, localMax])
        .interpolator(t => d3.interpolateBlues(0.15 + 0.85 * t));

      // Get or create a <g> for this participant
      const gridId  = `grid-${participantId}`;
      let   gridG   = this.svg.select(".gridsG").select(`#${gridId}`);

      if (gridG.empty()) {
        gridG = this.svg.select(".gridsG").append("g")
          .attr("id", gridId)
          .attr("class", "participantGrid");
      }
      gridG.attr("transform", `translate(0,${gridY})`);

      gridG.select(".pLabel").remove();

      // Day-of-week labels (Y axis)
      gridG.selectAll(".dayLabel")
        .data(DAYS, d => d)
        .join("text")
          .attr("class", "dayLabel")
          .attr("x", -6)
          .attr("y", (d, i) => i * cellH + cellH / 2)
          .attr("text-anchor", "end")
          .attr("dominant-baseline", "middle")
          .style("font-size", "10px")
          .style("fill", "#64748b")
          .text(d => d.slice(0, 3));   // "Mon", "Tue" …

      // Hour labels (X axis, only for bottom grid)
      if (pIdx === ids.length - 1) {
        gridG.selectAll(".hourLabel")
          .data(HOURS, h => h)
          .join("text")
            .attr("class", "hourLabel")
            .attr("x", h => h * cellW + cellW / 2)
            .attr("y", gridH + 16)
            .attr("text-anchor", "middle")
            .style("font-size", "9px")
            .style("fill", "#64748b")
            .text(h => `${h}h`);
      }

      // Build flat cell data array
      const cellData = [];
      HOURS.forEach(hour => {
        DAYS.forEach(weekday => {
          const key  = `${hour}-${weekday}`;
          const info = counts[key] || { total: 0, byVenue: {} };
          cellData.push({ hour, weekday, participantId, ...info });
        });
      });

      // ── Heatmap cells ──────────────────────────────────────────────────────
      gridG.selectAll(".cell")
        .data(cellData, d => `${d.hour}-${d.weekday}`)
        .join(
          enter => {
            const g = enter.append("g")
              .attr("class", "cell")
              .attr("transform", d =>
                `translate(${d.hour * cellW}, ${DAYS.indexOf(d.weekday) * cellH})`
              )
              .style("cursor", d => d.total === 0 ? "default" : "pointer");

            // Background rectangle — fill = count intensity
            g.append("rect")
              .attr("class", "cellBg")
              .attr("width",  cellW - 1)
              .attr("height", cellH - 1)
              .attr("rx", 2)
              .attr("fill", d => d.total === 0 ? "#f8fafc" : colorScale(d.total))
              .attr("pointer-events", "none");

            // Small coloured strip at bottom showing dominant venue type
            g.append("rect")
              .attr("class", "cellStrip")
              .attr("y",      cellH - 5)
              .attr("width",  cellW - 1)
              .attr("height", 4)
              .attr("rx", 1)
              .attr("fill", d => {
                if (d.total === 0) return "none";
                const dominant = Object.entries(d.byVenue)
                  .sort((a, b) => b[1] - a[1])[0][0];
                return venueColor(dominant);
              })
              .attr("pointer-events", "none");

            g.append("rect")
              .attr("class", "cellHitbox")
              .attr("width", cellW)
              .attr("height", cellH)
              .attr("fill", "transparent")
              .attr("pointer-events", "all")
              .on("mouseenter", (event, d) => controllerMethods.handleCellMouseEnter(d, event))
              .on("click", (event, d) => controllerMethods.handleCellClick?.(d, event));

            return g;
          },
          update => {
            update.attr("transform", d =>
              `translate(${d.hour * cellW}, ${DAYS.indexOf(d.weekday) * cellH})`
            )
              .style("cursor", d => d.total === 0 ? "default" : "pointer");
            update.select(".cellBg")
              .transition().duration(this.transitionMs)
              .attr("fill", d => d.total === 0 ? "#f8fafc" : colorScale(d.total));
            update.select(".cellStrip")
              .transition().duration(this.transitionMs)
              .attr("fill", d => {
                if (d.total === 0) return "none";
                const dominant = Object.entries(d.byVenue)
                  .sort((a, b) => b[1] - a[1])[0][0];
                return venueColor(dominant);
              });
            update.select(".cellHitbox")
              .attr("width", cellW)
              .attr("height", cellH)
              .on("mouseenter", (event, d) => controllerMethods.handleCellMouseEnter(d, event))
              .on("click", (event, d) => controllerMethods.handleCellClick?.(d, event));
          },
          exit => exit.remove()
        );
    });

  }

  highlightInteraction(interaction) {
    const hasInteraction = Boolean(interaction);

    this.svg?.selectAll(".cell")
      .attr("opacity", (d) => {
        if (!hasInteraction) return 1;
        if (DailyRoutineD3.matchesCell(d, interaction)) return 1;
        if (DailyRoutineD3.matchesTimeContext(d, interaction)) return 0.72;
        return 0.48;
      });

    this.svg?.selectAll(".cellBg")
      .attr("stroke", (d) => (
        hasInteraction && DailyRoutineD3.matchesCell(d, interaction) ? "#2563eb" : "none"
      ))
      .attr("stroke-width", (d) => (
        hasInteraction && DailyRoutineD3.matchesCell(d, interaction) ? 1.4 : 0
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

export default DailyRoutineD3;
