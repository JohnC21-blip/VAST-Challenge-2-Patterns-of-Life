import * as d3 from 'd3'

const MARGIN = { top: 30, right: 20, bottom: 50, left: 65 }

/**
 * Two-panel line chart sharing the same x-axis (months).
 * Top panel: interactions count. Bottom panel: % active participants.
 */
export default class DualLineChartD3 {
  constructor(el) {
    this.el = el
    this.xScale = null
    this.months = []
  }

  create({ width, height }) {
    this.W  = width  - MARGIN.left - MARGIN.right
    this.H1 = Math.floor((height - MARGIN.top - MARGIN.bottom) * 0.55)
    this.H2 = Math.floor((height - MARGIN.top - MARGIN.bottom) * 0.45)
    this.H  = this.H1 + this.H2

    this.svg = d3.select(this.el).append('svg').attr('width', width).attr('height', height)

    this.g = this.svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`)
    this.g1 = this.g.append('g').attr('class', 'panel1')
    this.g2 = this.g.append('g').attr('class', 'panel2').attr('transform', `translate(0,${this.H1 + 8})`)

    this.gXAxis = this.g.append('g').attr('class', 'x-axis')
      .attr('transform', `translate(0,${this.H1 + this.H2 + 8})`)
    this.gOverlay = this.g.append('g').attr('class', 'overlay')
    this.gHL      = this.g.append('g').attr('class', 'highlight')

  }

  render(data, { title = '', onMonthClick, onMonthHover, onHoverDetail }) {
    this.months = data.map(d => d.month)
    this._data  = data
    this.onMonthClick = onMonthClick
    this.onMonthHover = onMonthHover

    const W = this.W, H1 = this.H1, H2 = this.H2

    this.xScale = d3.scalePoint().domain(this.months).range([0, W])
    const y1Scale = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.interactions) * 1.08])
      .range([H1, 0])
    const y2Scale = d3.scaleLinear().domain([0, 105]).range([H2, 0])
    this._y1Scale = y1Scale
    this._y2Scale = y2Scale

    const lineGen = (yScale, accessor) => d3.line()
      .x(d => this.xScale(d.month)).y(d => yScale(accessor(d))).curve(d3.curveCatmullRom)

    const areaGen = (yScale, accessor) => d3.area()
      .x(d => this.xScale(d.month))
      .y0(yScale(0)).y1(d => yScale(accessor(d)))
      .curve(d3.curveCatmullRom)

    // ── panel 1 ───────────────────────────────────────────────────
    this.g1.selectAll('*').remove()
    this.g1.append('path').datum(data)
      .attr('d', areaGen(y1Scale, d => d.interactions))
      .attr('fill', '#4e79a7').attr('opacity', 0.15)
    this.g1.append('path').datum(data)
      .attr('d', lineGen(y1Scale, d => d.interactions))
      .attr('fill', 'none').attr('stroke', '#4e79a7').attr('stroke-width', 2.5)
    this.g1.selectAll('circle').data(data).join('circle')
      .attr('cx', d => this.xScale(d.month)).attr('cy', d => y1Scale(d.interactions))
      .attr('r', 3.5).attr('fill', '#4e79a7').attr('stroke', '#fff').attr('stroke-width', 1.5)
    this.g1.append('g').call(
      d3.axisLeft(y1Scale).ticks(4).tickFormat(d3.format('~s'))
    ).selectAll('text').style('font-size', '10px')
    this.g1.append('text').attr('transform', 'rotate(-90)')
      .attr('x', -H1 / 2).attr('y', -52).attr('text-anchor', 'middle')
      .style('font-size', '10px').text('Interactions / month')

    // divider
    this.g1.append('line')
      .attr('x1', 0).attr('x2', W).attr('y1', H1 + 4).attr('y2', H1 + 4)
      .attr('stroke', '#ddd').attr('stroke-width', 1)

    // ── panel 2 ───────────────────────────────────────────────────
    this.g2.selectAll('*').remove()
    this.g2.append('line')
      .attr('x1', 0).attr('x2', W).attr('y1', y2Scale(100)).attr('y2', y2Scale(100))
      .attr('stroke', '#bbb').attr('stroke-width', 1).attr('stroke-dasharray', '4 3')
    this.g2.append('path').datum(data)
      .attr('d', lineGen(y2Scale, d => d.pctActive))
      .attr('fill', 'none').attr('stroke', '#e15759').attr('stroke-width', 2.5)
    this.g2.selectAll('circle').data(data).join('circle')
      .attr('cx', d => this.xScale(d.month)).attr('cy', d => y2Scale(d.pctActive))
      .attr('r', 3.5).attr('fill', '#e15759').attr('stroke', '#fff').attr('stroke-width', 1.5)
    this.g2.append('g').call(
      d3.axisLeft(y2Scale).ticks(4).tickFormat(d => `${d}%`)
    ).selectAll('text').style('font-size', '10px')
    this.g2.append('text').attr('transform', 'rotate(-90)')
      .attr('x', -H2 / 2).attr('y', -52).attr('text-anchor', 'middle')
      .style('font-size', '10px').text('% socially active')

    // ── x-axis ────────────────────────────────────────────────────
    const tickMonths = this.months.filter((_, i) => i % 3 === 0)
    this.gXAxis.call(
      d3.axisBottom(this.xScale).tickValues(tickMonths)
    ).selectAll('text').attr('transform', 'rotate(-35)').style('text-anchor', 'end').style('font-size', '10px')

    // ── overlay ───────────────────────────────────────────────────
    const bandW = W / (this.months.length - 1 || 1)
    const totalH = H1 + H2 + 8
    this.gOverlay.selectAll('rect').data(this.months)
      .join('rect')
      .attr('x', m => this.xScale(m) - bandW / 2)
      .attr('y', 0).attr('width', bandW).attr('height', totalH)
      .attr('fill', 'transparent').style('cursor', 'pointer')
      .on('click', (_, m) => onMonthClick?.(m))
      .on('mouseover', (_, m) => {
        onMonthHover?.(m)
        const row = data.find(d => d.month === m)
        if (row) {
          onHoverDetail?.({
            title: m,
            rows: [
              { label: 'Interactions', value: d3.format(',.0f')(row.interactions) },
              { label: 'Active residents', value: `${row.pctActive.toFixed(1)}%` },
            ],
          })
        }
      })
      .on('mouseout', () => {
        onMonthHover?.(null)
      })
  }

  highlightMonth(month) {
    this.gHL.selectAll('*').remove()
    if (!month || !this.xScale) return
    const x = this.xScale(month)
    if (x == null) return
    const totalH = this.H1 + this.H2 + 8
    this.gHL.append('line')
      .attr('x1', x).attr('x2', x).attr('y1', 0).attr('y2', totalH)
      .attr('stroke', '#0f172a').attr('stroke-width', 2)
      .attr('stroke-dasharray', '5 3').attr('pointer-events', 'none')
  }

  clear() {
    d3.select(this.el).selectAll('*').remove()
  }
}
