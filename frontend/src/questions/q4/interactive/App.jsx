import { cloneElement, isValidElement, useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import * as d3 from 'd3'
import { loadAllData } from './redux/DataSlice'
import { runViewTransition } from '../../../utils/viewTransition'

import CalendarHeatmapContainer from './components/CalendarHeatmap/CalendarHeatmapContainer'
import StreamGraphContainer     from './components/StreamGraph/StreamGraphContainer'
import LineChartContainer       from './components/LineChart/LineChartContainer'
import DualLineChartContainer   from './components/DualLineChart/DualLineChartContainer'
import BarChartContainer        from './components/BarChart/BarChartContainer'
import { supportingColor } from '../../q1/charts/Utils'

const PANEL_SIDES = {
  checkin: 'left',
  money: 'left',
  social: 'left',
  activity: 'left',
  mobility: 'right',
  wealth: 'right',
  pairs: 'right',
  rent: 'right',
}

const styles = {
  loadingWrap: {
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingBox: {
    textAlign: 'center',
  },
  loadingText: {
    fontSize: '14px',
    color: '#5b6478',
    fontWeight: 500,
    margin: 0,
  },
  loadingNote: {
    marginTop: '6px',
    fontSize: '12px',
    color: '#9aa0b4',
    margin: 0,
  },
  errorCard: {
    margin: '0 auto',
    maxWidth: 800,
    background: '#fff4f4',
    border: '1px solid #f5c2c2',
    borderLeft: '4px solid #c0392b',
    borderRadius: 10,
    padding: '16px 20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  errorTitle: {
    margin: 0,
    fontSize: '14px',
    fontWeight: 700,
    color: '#c0392b',
  },
  errorText: {
    marginTop: '6px',
    marginBottom: 0,
    fontSize: '13px',
    color: '#7a2f2f',
  },
}

function ChartCard({ id, title, desc, area, children, isExpanded, isHidden, layoutScope, onToggle }) {
  const classes = [
    'q4ChartCard',
    area,
    isExpanded ? 'isExpanded' : '',
    isExpanded ? `isExpanded${PANEL_SIDES[id][0].toUpperCase()}${PANEL_SIDES[id].slice(1)}` : '',
    isHidden ? 'isHidden' : '',
  ].filter(Boolean).join(' ')
  const layoutKey = [
    id,
    isExpanded ? 'expanded' : 'compact',
    isHidden ? 'hidden' : 'visible',
    layoutScope,
  ].join('-')

  return (
    <div className={classes}>
      <div className="q4CardHeader">
        <h2 className="q4CardTitle">
          <button
            type="button"
            className="q4TitleButton cardTitleButton"
            aria-pressed={isExpanded}
            onClick={onToggle}
          >
            {title}
          </button>
        </h2>
        {isExpanded ? <p className="q4CardDesc">{desc}</p> : null}
      </div>
      <div className="q4ChartBody">
        {isValidElement(children) ? cloneElement(children, { layoutKey, isExpanded }) : children}
      </div>
    </div>
  )
}

function emptyDetail(title) {
  return { title, rows: [{ label: 'Status', value: 'No data' }] }
}

function heatmapDetail(data, title, formatValue = d3.format(',.0f')) {
  if (!data?.matrix?.length) return emptyDetail(title)

  let peak = { value: -Infinity, month: '', day: '' }
  data.matrix.forEach((row, monthIndex) => {
    row.forEach((value, dayIndex) => {
      if (value > peak.value) {
        peak = { value, month: data.months[monthIndex], day: data.days[dayIndex] }
      }
    })
  })

  return {
    title,
    rows: [
      { label: 'Peak day', value: `${peak.month} · ${peak.day}` },
      { label: 'Peak value', value: formatValue(peak.value) },
      { label: 'Months covered', value: d3.format('d')(data.months.length) },
    ],
  }
}

function divergingHeatmapDetail(data, title) {
  if (!data?.matrix?.length) return emptyDetail(title)

  let gain = { value: -Infinity, month: '', day: '' }
  let spend = { value: Infinity, month: '', day: '' }
  data.matrix.forEach((row, monthIndex) => {
    row.forEach((value, dayIndex) => {
      if (value > gain.value) gain = { value, month: data.months[monthIndex], day: data.days[dayIndex] }
      if (value < spend.value) spend = { value, month: data.months[monthIndex], day: data.days[dayIndex] }
    })
  })

  return {
    title,
    rows: [
      { label: 'Strongest inflow', value: `${gain.month} · ${d3.format(',.0f')(gain.value)}` },
      { label: 'Strongest outflow', value: `${spend.month} · ${d3.format(',.0f')(spend.value)}` },
      { label: 'Display note', value: 'Day 1 muted' },
    ],
  }
}

function lineDetail(data, title, valueLabel, formatValue = d3.format(',.0f')) {
  if (!data?.length) return emptyDetail(title)

  const peak = data.reduce((best, row) => (row.value > best.value ? row : best), data[0])
  const latest = data[data.length - 1]
  const first = data[0]

  return {
    title,
    rows: [
      { label: `Latest ${valueLabel}`, value: formatValue(latest.value) },
      { label: 'Peak month', value: `${peak.month} · ${formatValue(peak.value)}` },
      { label: 'Change', value: formatValue(latest.value - first.value) },
    ],
  }
}

function barDetail(data, title, valueLabel, formatValue = d3.format(',.0f')) {
  if (!data?.length) return emptyDetail(title)

  const total = d3.sum(data, d => d.value)
  const peak = data.reduce((best, row) => (row.value > best.value ? row : best), data[0])
  const activeMonths = data.filter(row => row.value > 0).length

  return {
    title,
    rows: [
      { label: `Total ${valueLabel}`, value: formatValue(total) },
      { label: 'Peak month', value: `${peak.month} · ${formatValue(peak.value)}` },
      { label: 'Active months', value: d3.format('d')(activeMonths) },
    ],
  }
}

function socialDetail(data) {
  if (!data?.length) return emptyDetail('Social network summary')

  const peak = data.reduce((best, row) => (row.interactions > best.interactions ? row : best), data[0])
  const latest = data[data.length - 1]
  const avgActive = d3.mean(data, row => row.pctActive)

  return {
    title: 'Social network summary',
    rows: [
      { label: 'Peak interactions', value: `${peak.month} · ${d3.format(',.0f')(peak.interactions)}` },
      { label: 'Latest active', value: `${latest.pctActive.toFixed(1)}%` },
      { label: 'Average active', value: `${avgActive.toFixed(1)}%` },
    ],
  }
}

export default function App() {
  const dispatch = useDispatch()
  const [expandedPanels, setExpandedPanels] = useState({ left: null, right: null })
  const status = useSelector(s => s.data.status)
  const error  = useSelector(s => s.data.error)

  const checkinHeatmap      = useSelector(s => s.data.checkinHeatmap)
  const moneyflowHeatmap    = useSelector(s => s.data.moneyflowHeatmap)
  const residentialMobility = useSelector(s => s.data.residentialMobility)
  const wealth              = useSelector(s => s.data.wealth)
  const socialNetwork       = useSelector(s => s.data.socialNetwork)
  const socialPairs         = useSelector(s => s.data.socialPairs)
  const activityStream      = useSelector(s => s.data.activityStream)
  const venueStream         = useSelector(s => s.data.venueStream)
  const travelStream        = useSelector(s => s.data.travelStream)
  const rentHistogram       = useSelector(s => s.data.rentHistogram)

  useEffect(() => {
    dispatch(loadAllData())
  }, [dispatch])

  if (status === 'loading' || status === 'idle') {
    return (
      <main className="content contentQ4">
        <div style={styles.loadingWrap}>
          <div style={styles.loadingBox}>
            <p style={styles.loadingText}>Loading Q4 data...</p>
            <p style={styles.loadingNote}>Preparing coordinated time-series views</p>
          </div>
        </div>
      </main>
    )
  }

  if (status === 'error') {
    return (
      <main className="content contentQ4">
        <div style={styles.errorCard}>
          <p style={styles.errorTitle}>Failed to load dataset</p>
          <p style={styles.errorText}>{error}</p>
          <p style={styles.errorText}>
            Make sure the JSON data files are available in <code>public/data/</code> and
            the aggregation server at <code>localhost:3000</code> is running.
          </p>
        </div>
      </main>
    )
  }

  const wealthData   = wealth.map(d => ({ month: d.month, value: d.mean, std: d.std }))
  const pairsData    = socialPairs.map(d => ({ month: d.month, value: d.pairs }))
  const mobilityData = residentialMobility.map(d => ({ month: d.month, value: d.movers }))
  const rentData     = rentHistogram.map(d => ({ month: d.month, value: d.events }))

  const moneyflowDisplay = moneyflowHeatmap
    ? {
        ...moneyflowHeatmap,
        matrix: moneyflowHeatmap.matrix.map(row => row.map((v, i) => (i === 0 ? 0 : v))),
      }
    : null

  const hasExpandedLeft = Boolean(expandedPanels.left)
  const hasExpandedRight = Boolean(expandedPanels.right)
  const layoutScope = [
    expandedPanels.left ?? 'left-compact',
    expandedPanels.right ?? 'right-compact',
  ].join('__')
  const panelClasses = [
    'gridQ4',
    hasExpandedLeft || hasExpandedRight ? 'hasExpanded' : '',
    hasExpandedLeft ? 'hasExpandedLeft' : '',
    hasExpandedRight ? 'hasExpandedRight' : '',
  ].filter(Boolean).join(' ')
  const cardState = panelId => {
    const side = PANEL_SIDES[panelId]
    const expandedPanel = expandedPanels[side]
    const setNextPanels = () => {
      setExpandedPanels(currentPanels => ({
        ...currentPanels,
        [side]: currentPanels[side] === panelId ? null : panelId,
      }))
    }

    return {
      isExpanded: expandedPanel === panelId,
      isHidden: Boolean(expandedPanel && expandedPanel !== panelId),
      onToggle: () => {
        runViewTransition(setNextPanels)
      },
    }
  }

  return (
    <main className="content contentQ4">
      <section className="module moduleQ4">
        <section className={panelClasses}>
          <ChartCard
            id="checkin"
            title="Daily Check-Ins"
            area="q4Checkin"
            desc="How often residents visited public places each day; darker red means more visits, pale yellow means fewer."
            layoutScope={layoutScope}
            {...cardState('checkin')}
          >
            <CalendarHeatmapContainer
              data={checkinHeatmap}
              title="Daily Venue Check-in Count"
              defaultDetail={heatmapDetail(checkinHeatmap, 'Check-in summary')}
            />
          </ChartCard>

          <ChartCard
            id="money"
            title="Net Money Flow"
            area="q4Money"
            desc="Whether the city gained or lost money each day; blue means inflow, red means spending."
            layoutScope={layoutScope}
            {...cardState('money')}
          >
            <CalendarHeatmapContainer
              data={moneyflowDisplay}
              title="Daily Net Money Flow"
              diverging
              vmax={moneyflowHeatmap?.vmax_no_day1}
              defaultDetail={divergingHeatmapDetail(moneyflowDisplay, 'Money-flow summary')}
            />
          </ChartCard>

          <ChartCard
            id="mobility"
            title="Residential Mobility"
            area="q4Mobility"
            desc="How many residents moved to a different home each month."
            layoutScope={layoutScope}
            {...cardState('mobility')}
          >
            <BarChartContainer
              data={mobilityData}
              title="Residential Mobility"
              yLabel="Participants who moved"
              color={supportingColor('apartments')}
              formatY={d3.format('d')}
              defaultDetail={barDetail(mobilityData, 'Residential mobility summary', 'movers', d3.format('d'))}
            />
          </ChartCard>

          <ChartCard
            id="wealth"
            title="Average Wealth"
            area="q4Wealth"
            desc="Mean resident balance by month, with spread shown as the shaded band."
            layoutScope={layoutScope}
            {...cardState('wealth')}
          >
            <LineChartContainer
              data={wealthData}
              title="Avg Wealth"
              yLabel="Balance"
              color={supportingColor('employers')}
              showBand
              formatY={d3.format(',.0f')}
              defaultDetail={lineDetail(wealthData, 'Average wealth summary', 'balance', d3.format(',.0f'))}
            />
          </ChartCard>

          <ChartCard
            id="social"
            title="Social Network"
            area="q4Social"
            desc="Recorded social interactions and the percentage of residents socially active each month."
            layoutScope={layoutScope}
            {...cardState('social')}
          >
            <DualLineChartContainer
              data={socialNetwork}
              title="Social Network Evolution"
              defaultDetail={socialDetail(socialNetwork)}
            />
          </ChartCard>

          <ChartCard
            id="pairs"
            title="Unique Social Pairs"
            area="q4Pairs"
            desc="How many different resident pairs talked to each other each month."
            layoutScope={layoutScope}
            {...cardState('pairs')}
          >
            <LineChartContainer
              data={pairsData}
              title="Unique Social Pairs"
              yLabel="Pairs"
              color={supportingColor('restaurants')}
              formatY={d3.format(',.0f')}
              defaultDetail={lineDetail(pairsData, 'Unique social-pair summary', 'pairs', d3.format(',.0f'))}
            />
          </ChartCard>

          <ChartCard
            id="activity"
            title="Activity, Venue, and Travel Composition"
            area="q4Activity"
            desc="Switch between what residents were doing, where they checked in, and why they travelled."
            layoutScope={layoutScope}
            {...cardState('activity')}
          >
            <StreamGraphContainer
              activityStream={activityStream}
              venueStream={venueStream}
              travelStream={travelStream}
            />
          </ChartCard>

          <ChartCard
            id="rent"
            title="Rent Payment Events"
            area="q4Rent"
            desc="How many official rent adjustment events happened each month."
            layoutScope={layoutScope}
            {...cardState('rent')}
          >
            <BarChartContainer
              data={rentData}
              title="Rent Adjustment Events"
              yLabel="Events"
              color={supportingColor('pubs')}
              formatY={d3.format('d')}
              defaultDetail={barDetail(rentData, 'Rent adjustment summary', 'events', d3.format('d'))}
            />
          </ChartCard>
        </section>
      </section>
    </main>
  )
}
