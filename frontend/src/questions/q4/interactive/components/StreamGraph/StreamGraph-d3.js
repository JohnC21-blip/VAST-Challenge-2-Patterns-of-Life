import * as d3 from 'd3'

const MARGIN = { top: 30, right: 160, bottom: 50, left: 55 }

const COLORS = {
  // activity modes
  AtHome:        '#4e79a7',
  AtWork:        '#f28e2b',
  AtRecreation:  '#59a14f',
  AtRestaurant:  '#e15759',
  Transport:     '#76b7b2',
  // venue types
  Apartment:     '#4e79a7',
  Workplace:     '#f28e2b',
  Restaurant:    '#59a14f',
  Pub:           '#e15759',
  // travel purposes
  'Work/Home Commute':             '#f28e2b',
  'Going Back to Home':            '#4e79a7',
  'Eating':                        '#59a14f',
  'Coming Back From Restaurant':   '#e15759',
  'Recreation (Social Gathering)': '#76b7b2',
}

export default class StreamGraphD3 {
  constructor(el) {
    this.el = el
    this.svg = null
    this.g = null
    this.months = []
    this.categories = []
    this.xScale = null
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

    this.gAreas    = this.g.append('g').attr('class', 'areas')
    this.gXAxis    = this.g.append('g').attr('class', 'x-axis').attr('transform', `translate(0,${this.H})`)
    this.gYAxis    = this.g.append('g').attr('class', 'y-axis')
    this.gOverlay  = this.g.append('g').attr('class', 'overlay')
    this.gLegend   = this.svg.append('g').attr('class', 'legend')
      .attr('transform', `translate(${MARGIN.left + this.W + 10}, ${MARGIN.top})`)

  }

  render(streamData, { title, onMonthClick, onMonthHover, onHoverDetail }) {
    const { categories, data } = streamData
    this.categories = categories
    this.months = data.map(d => d.month)
    this.onMonthClick = onMonthClick
    this.onMonthHover = onMonthHover

    const W = this.W, H = this.H

    this.xScale = d3.scalePoint().domain(this.months).range([0, W])
    const yScale = d3.scaleLinear().domain([0, 100]).range([H, 0])

    // ── stack ────────────────────────────────────────────────────
    const stack = d3.stack().keys(categories).offset(d3.stackOffsetNone)
    const series = stack(data)

    const area = d3.area()
      .x(d => this.xScale(d.data.month))
      .y0(d => yScale(d[0]))
      .y1(d => yScale(d[1]))
      .curve(d3.curveCatmullRom)

    const paths = this.gAreas.selectAll('path').data(series, d => d.key)
    paths.enter().append('path')
      .merge(paths)
      .attr('d', area)
      .attr('fill', d => COLORS[d.key] ?? '#aaa')
      .attr('opacity', 0.85)
      .attr('stroke', '#fff')
      .attr('stroke-width', 0.5)
    paths.exit().remove()

    // ── axes ─────────────────────────────────────────────────────
    const tickMonths = this.months.filter((_, i) => i % 3 === 0)
    this.gXAxis.call(
      d3.axisBottom(this.xScale).tickValues(tickMonths)
    ).selectAll('text').attr('transform', 'rotate(-35)').style('text-anchor', 'end').style('font-size', '10px')

    this.gYAxis.call(d3.axisLeft(yScale).ticks(5).tickFormat(d => `${d}%`))
      .selectAll('text').style('font-size', '10px')

    // ── legend ───────────────────────────────────────────────────
    this.gLegend.selectAll('*').remove()
    categories.forEach((cat, i) => {
      const g = this.gLegend.append('g').attr('transform', `translate(0,${i * 18})`)
      g.append('rect').attr('width', 12).attr('height', 12).attr('fill', COLORS[cat] ?? '#aaa').attr('rx', 2)
      g.append('text').attr('x', 16).attr('y', 10)
        .style('font-size', '10px').text(cat.length > 22 ? cat.slice(0, 22) + '…' : cat)
    })

    // ── invisible overlay for hover/click per month ───────────────
    this._data = data
    const bandW = W / (this.months.length - 1 || 1)

    const overlays = this.gOverlay.selectAll('rect').data(this.months)
    overlays.enter().append('rect')
      .merge(overlays)
      .attr('x',     (m, i) => this.xScale(m) - bandW / 2)
      .attr('y',     0)
      .attr('width', bandW)
      .attr('height', H)
      .attr('fill',  'transparent')
      .style('cursor', 'pointer')
      .on('click',     (_, m) => onMonthClick?.(m))
      .on('mouseover', (_, m) => {
        onMonthHover?.(m)
        const row = data.find(d => d.month === m)
        if (row) {
          onHoverDetail?.({
            title: m,
            rows: categories.map(c => ({ label: c, value: `${row[c].toFixed(1)}%` })),
          })
        }
      })
      .on('mouseout', () => {
        onMonthHover?.(null)
      })
    overlays.exit().remove()
  }

  highlightMonth(month) {
    this.gOverlay.selectAll('.v-line').remove()
    if (!month || !this.xScale) return
    const x = this.xScale(month)
    if (x == null) return
    this.gOverlay.append('line')
      .attr('class', 'v-line')
      .attr('x1', x).attr('x2', x)
      .attr('y1', 0).attr('y2', this.H)
      .attr('stroke', '#0f172a')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '5 3')
      .attr('pointer-events', 'none')
  }

  clear() {
    d3.select(this.el).selectAll('*').remove()
  }
}
