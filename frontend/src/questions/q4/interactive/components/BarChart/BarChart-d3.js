import * as d3 from 'd3'

const MARGIN = { top: 30, right: 20, bottom: 50, left: 55 }
const MOTION_DURATION = 300

export default class BarChartD3 {
  constructor(el) {
    this.el = el
    this.xScale = null
    this.months = []
  }

  create({ width, height }) {
    this.W = width  - MARGIN.left - MARGIN.right
    this.H = height - MARGIN.top  - MARGIN.bottom

    this.svg = d3.select(this.el).append('svg').attr('width', width).attr('height', height)
    this.g = this.svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`)
    this.gBars    = this.g.append('g').attr('class', 'bars')
    this.gXAxis   = this.g.append('g').attr('class', 'x-axis').attr('transform', `translate(0,${this.H})`)
    this.gYAxis   = this.g.append('g').attr('class', 'y-axis')
    this.gHL      = this.g.append('g').attr('class', 'highlight')
    this.gOverlay = this.g.append('g').attr('class', 'overlay')

  }

  /**
   * @param {Array} data  — [{month, value}]
   * @param {object} opts — { title, yLabel, color, formatY, onMonthClick, onMonthHover }
   */
  render(data, opts = {}) {
    const {
      title = '', yLabel = '', color = '#7e22ce',
      formatY = d3.format(',.0f'),
      onMonthClick, onMonthHover, onHoverDetail,
    } = opts

    this.months = data.map(d => d.month)
    this._data  = data
    this.onMonthClick = onMonthClick
    this.onMonthHover = onMonthHover

    const W = this.W, H = this.H
    this.xScale = d3.scaleBand().domain(this.months).range([0, W]).padding(0.15)
    const yScale = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.value) * 1.1 || 10])
      .range([H, 0])
    this._yScale = yScale

    const bars = this.gBars.selectAll('rect').data(data, d => d.month)
    bars.enter().append('rect').merge(bars)
      .attr('x',      d => this.xScale(d.month))
      .attr('y',      d => yScale(d.value))
      .attr('width',  this.xScale.bandwidth())
      .attr('height', d => H - yScale(d.value))
      .attr('fill',   color).attr('opacity', 0.85)
      .style('cursor', 'pointer')
    bars.exit().remove()

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
        .attr('transform', 'rotate(-90)').attr('x', -H / 2).attr('y', -42)
        .attr('text-anchor', 'middle').style('font-size', '10px').text(yLabel)
    }

    const overlays = this.gOverlay.selectAll('rect').data(data, d => d.month)
    overlays.enter().append('rect').merge(overlays)
      .attr('x', d => this.xScale(d.month))
      .attr('y', 0)
      .attr('width', this.xScale.bandwidth())
      .attr('height', H)
      .attr('fill', 'transparent')
      .style('cursor', 'pointer')
      .on('click', (_, d) => onMonthClick?.(d.month))
      .on('mouseover', (_, d) => {
        onMonthHover?.(d.month)
        onHoverDetail?.({
          title: d.month,
          rows: [{ label: yLabel || 'Value', value: formatY(d.value) }],
        })
      })
      .on('mouseout', () => {
        onMonthHover?.(null)
      })
    overlays.exit().remove()
  }

  highlightMonth(month) {
    this.gBars.selectAll('rect')
      .attr('opacity', d => {
        if (!month) return 0.85
        return d.month === month ? 1 : 0.35
      })
      .attr('stroke',       d => d.month === month ? '#0f172a' : 'none')
      .attr('stroke-width', d => d.month === month ? 2 : 0)

    const row = this._data?.find(d => d.month === month)
    if (!month || !this.xScale || !row || !this._yScale) {
      this.gHL.selectAll('.bar-guide-line')
        .transition()
        .duration(MOTION_DURATION)
        .attr('opacity', 0)
        .remove()
      return
    }

    const x = this.xScale(month) + this.xScale.bandwidth() / 2
    this.gHL.selectAll('.bar-guide-line')
      .data([month])
      .join(
        enter => enter.append('line')
          .attr('class', 'bar-guide-line')
          .attr('x1', x)
          .attr('x2', x)
          .attr('y1', 0)
          .attr('y2', this.H)
          .attr('opacity', 0),
        update => update,
      )
      .transition()
      .duration(MOTION_DURATION)
      .ease(d3.easeCubicOut)
      .attr('x1', x)
      .attr('x2', x)
      .attr('y1', 0)
      .attr('y2', this.H)
      .attr('opacity', 1)
      .attr('stroke', '#0f172a')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '5 3')
      .attr('pointer-events', 'none')
  }

  clear() {
    d3.select(this.el).selectAll('*').remove()
  }
}
