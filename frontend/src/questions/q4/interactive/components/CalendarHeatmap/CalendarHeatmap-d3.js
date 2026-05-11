import * as d3 from 'd3'

const MARGIN = { top: 30, right: 20, bottom: 40, left: 70 }

export default class CalendarHeatmapD3 {
  constructor(el) {
    this.el = el
    this.svg = null
    this.width = 0
    this.height = 0
    this.xScale = null
    this.yScale = null
    this.colorScale = null
    this.months = []
    this.days = []
    this.onMonthClick = null
    this.onMonthHover = null
  }

  create({ width, height }) {
    this.width  = width  - MARGIN.left - MARGIN.right
    this.height = height - MARGIN.top  - MARGIN.bottom

    const svg = d3.select(this.el)
      .append('svg')
      .attr('width',  width)
      .attr('height', height)

    this.g = svg.append('g')
      .attr('transform', `translate(${MARGIN.left},${MARGIN.top})`)

    this.gCells   = this.g.append('g').attr('class', 'cells')
    this.gXAxis   = this.g.append('g').attr('class', 'x-axis').attr('transform', `translate(0,${this.height})`)
    this.gYAxis   = this.g.append('g').attr('class', 'y-axis')
    this.gHighlight = this.g.append('g').attr('class', 'highlight')
  }

  render(data, { title, colorScheme = 'YlOrRd', diverging = false, vmax = null, onMonthClick, onMonthHover, onHoverDetail }) {
    const { months, days, matrix } = data
    this.months = months
    this.days   = days
    this.onMonthClick = onMonthClick
    this.onMonthHover = onMonthHover

    const W = this.width, H = this.height

    this.xScale = d3.scaleBand().domain(days).range([0, W]).padding(0.05)
    this.yScale = d3.scaleBand().domain(months).range([0, H]).padding(0.05)

    const flat = matrix.flat()
    if (diverging) {
      const absMax = vmax ?? d3.max(flat, Math.abs)
      this.colorScale = d3.scaleDiverging(d3.interpolateRdYlBu)
        .domain([-absMax, 0, absMax])
    } else {
      const maxVal = vmax ?? d3.max(flat)
      this.colorScale = d3.scaleSequential(d3.interpolateYlOrRd)
        .domain([0, maxVal])
    }

    // ── cells ────────────────────────────────────────────────────
    const rows = this.gCells.selectAll('g.row').data(matrix, (_, i) => months[i])
    rows.enter().append('g').attr('class', 'row')
      .merge(rows)
      .attr('transform', (_, i) => `translate(0,${this.yScale(months[i])})`)
      .each((row, ri, nodes) => {
        const month = months[ri]
        const cells = d3.select(nodes[ri]).selectAll('rect').data(row.map((value, di) => ({ value, day: days[di] })))
        cells.enter().append('rect')
          .merge(cells)
          .attr('x',      d => this.xScale(d.day))
          .attr('y',      0)
          .attr('width',  this.xScale.bandwidth())
          .attr('height', this.yScale.bandwidth())
          .attr('fill',   d => this.colorScale(d.value))
          .attr('stroke', 'none')
          .style('cursor', 'pointer')
          .on('click', () => onMonthClick?.(month))
          .on('mouseover', (_, d) => {
            onMonthHover?.(month)
            onHoverDetail?.({
              title: `${month} · day ${d.day}`,
              rows: [{ label: 'Value', value: d3.format(',.0f')(d.value) }],
            })
          })
          .on('mouseout', () => {
            onMonthHover?.(null)
          })
        cells.exit().remove()
      })
    rows.exit().remove()

    // ── axes ─────────────────────────────────────────────────────
    this.gXAxis.call(
      d3.axisBottom(this.xScale).tickValues(days.filter((_, i) => i % 5 === 0 || i === 0))
    ).selectAll('text').style('font-size', '10px')

    this.gYAxis.call(d3.axisLeft(this.yScale))
      .selectAll('text').style('font-size', '10px')

  }

  highlightMonth(month) {
    this.gHighlight.selectAll('*').remove()
    if (!month || !this.yScale) return
    const y = this.yScale(month)
    if (y == null) return
    this.gHighlight.append('rect')
      .attr('x', -4)
      .attr('y', y)
      .attr('width', this.width + 4)
      .attr('height', this.yScale.bandwidth())
      .attr('fill', 'none')
      .attr('stroke', '#0f172a')
      .attr('stroke-width', 2.5)
      .attr('pointer-events', 'none')
  }

  clear() {
    d3.select(this.el).selectAll('*').remove()
  }
}
