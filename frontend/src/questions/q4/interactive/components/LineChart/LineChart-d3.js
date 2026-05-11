import * as d3 from 'd3'

const MARGIN = { top: 30, right: 20, bottom: 50, left: 65 }

export default class LineChartD3 {
  constructor(el) {
    this.el = el
    this.xScale = null
    this.months = []
    this.onMonthClick = null
    this.onMonthHover = null
  }

  create({ width, height }) {
    this.W = width  - MARGIN.left - MARGIN.right
    this.H = height - MARGIN.top  - MARGIN.bottom

    this.svg = d3.select(this.el)
      .append('svg')
      .attr('width',  width)
      .attr('height', height)

    this.g = this.svg.append('g')
      .attr('transform', `translate(${MARGIN.left},${MARGIN.top})`)

    this.gLine    = this.g.append('g').attr('class', 'line-area')
    this.gXAxis   = this.g.append('g').attr('class', 'x-axis').attr('transform', `translate(0,${this.H})`)
    this.gYAxis   = this.g.append('g').attr('class', 'y-axis')
    this.gOverlay = this.g.append('g').attr('class', 'overlay')
    this.gHL      = this.g.append('g').attr('class', 'highlight')

  }

  /**
   * @param {Array} data   — [{month, value, std?}]
   * @param {object} opts  — { title, yLabel, color, showBand, yMin, yMax, formatY, onMonthClick, onMonthHover }
   */
  render(data, opts = {}) {
    const {
      title = '', yLabel = '', color = '#4e79a7',
      showBand = false, yMin = null, yMax = null,
      formatY = d3.format(',.0f'),
      onMonthClick, onMonthHover, onHoverDetail,
    } = opts

    this.months = data.map(d => d.month)
    this.onMonthClick = onMonthClick
    this.onMonthHover = onMonthHover
    this._data = data
    this._formatY = formatY

    const W = this.W, H = this.H
    this.xScale = d3.scalePoint().domain(this.months).range([0, W])

    const allVals = data.map(d => d.value)
    const lo = yMin ?? 0
    const hi = yMax ?? d3.max(allVals) * 1.08
    const yScale = d3.scaleLinear().domain([lo, hi]).range([H, 0])
    this._yScale = yScale

    // ── band ─────────────────────────────────────────────────────
    if (showBand) {
      const areaGen = d3.area()
        .x(d => this.xScale(d.month))
        .y0(d => yScale(d.value - (d.std ?? 0)))
        .y1(d => yScale(d.value + (d.std ?? 0)))
        .curve(d3.curveCatmullRom)
      this.gLine.selectAll('.band').data([data])
        .join('path').attr('class', 'band')
        .attr('d', areaGen).attr('fill', color).attr('opacity', 0.15)
    }

    // ── line ─────────────────────────────────────────────────────
    const lineGen = d3.line()
      .x(d => this.xScale(d.month))
      .y(d => yScale(d.value))
      .curve(d3.curveCatmullRom)

    this.gLine.selectAll('.main-line').data([data])
      .join('path').attr('class', 'main-line')
      .attr('d', lineGen).attr('fill', 'none')
      .attr('stroke', color).attr('stroke-width', 2.5)

    // ── dots ─────────────────────────────────────────────────────
    this.gLine.selectAll('circle').data(data, d => d.month)
      .join('circle')
      .attr('cx', d => this.xScale(d.month))
      .attr('cy', d => yScale(d.value))
      .attr('r', 4).attr('fill', color).attr('stroke', '#fff').attr('stroke-width', 1.5)

    // ── axes ─────────────────────────────────────────────────────
    const tickMonths = this.months.filter((_, i) => i % 3 === 0)
    this.gXAxis.call(
      d3.axisBottom(this.xScale).tickValues(tickMonths)
    ).selectAll('text').attr('transform', 'rotate(-35)').style('text-anchor', 'end').style('font-size', '10px')

    this.gYAxis.call(d3.axisLeft(yScale).ticks(5).tickFormat(formatY))
      .selectAll('text').style('font-size', '10px')

    if (yLabel) {
      this.g.selectAll('.y-label').remove()
      this.g.append('text').attr('class', 'y-label')
        .attr('transform', 'rotate(-90)')
        .attr('x', -H / 2).attr('y', -52)
        .attr('text-anchor', 'middle')
        .style('font-size', '10px').text(yLabel)
    }

    // ── overlay for click/hover ───────────────────────────────────
    const bandW = W / (this.months.length - 1 || 1)
    const overlays = this.gOverlay.selectAll('rect').data(this.months)
    overlays.enter().append('rect').merge(overlays)
      .attr('x', m => this.xScale(m) - bandW / 2)
      .attr('y', 0).attr('width', bandW).attr('height', H)
      .attr('fill', 'transparent').style('cursor', 'pointer')
      .on('click',     (_, m) => onMonthClick?.(m))
      .on('mouseover', (_, m) => {
        onMonthHover?.(m)
        const row = data.find(d => d.month === m)
        if (row) {
          onHoverDetail?.({
            title: m,
            rows: [
              { label: yLabel || 'Value', value: formatY(row.value) },
              ...(showBand && row.std != null ? [{ label: 'Std. deviation', value: formatY(row.std) }] : []),
            ],
          })
        }
      })
      .on('mouseout', () => {
        onMonthHover?.(null)
      })
    overlays.exit().remove()
  }

  highlightMonth(month) {
    this.gHL.selectAll('*').remove()
    if (!month || !this.xScale) return
    const x = this.xScale(month)
    if (x == null) return
    this.gHL.append('line')
      .attr('x1', x).attr('x2', x)
      .attr('y1', 0).attr('y2', this.H)
      .attr('stroke', '#0f172a').attr('stroke-width', 2)
      .attr('stroke-dasharray', '5 3').attr('pointer-events', 'none')

    const row = this._data?.find(d => d.month === month)
    if (row && this._yScale) {
      this.gHL.append('circle')
        .attr('cx', x).attr('cy', this._yScale(row.value))
        .attr('r', 6).attr('fill', '#0f172a').attr('stroke', '#fff').attr('stroke-width', 2)
    }
  }

  clear() {
    d3.select(this.el).selectAll('*').remove()
  }
}
