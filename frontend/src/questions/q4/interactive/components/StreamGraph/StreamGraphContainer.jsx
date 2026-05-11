import React, { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { setSelectedMonth, setHoveredMonth } from '../../redux/InteractionSlice'
import DetailPanel from '../DetailPanel'
import StreamGraphD3 from './StreamGraph-d3'

const DATASETS = {
  activity: { label: 'Activity Mode Distribution' },
  venue:    { label: 'Venue Check-in Proportions' },
  travel:   { label: 'Travel Purpose Proportions' },
}

function getStreamDefaultDetail(streamData, selected) {
  if (!streamData?.data?.length) {
    return {
      title: DATASETS[selected].label,
      rows: [{ label: 'Status', value: 'No data' }],
    }
  }

  const latest = streamData.data[streamData.data.length - 1]
  const ranked = streamData.categories
    .map(category => ({ category, value: latest[category] }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 3)

  return {
    title: `${DATASETS[selected].label} · ${latest.month}`,
    rows: ranked.map(entry => ({ label: entry.category, value: `${entry.value.toFixed(1)}%` })),
  }
}

export default function StreamGraphContainer({ activityStream, venueStream, travelStream, mode = 'activity', showSelector = true, layoutKey, isExpanded = false }) {
  const dispatch = useDispatch()
  const selectedMonth = useSelector(s => s.interaction.selectedMonth)
  const hoveredMonth  = useSelector(s => s.interaction.hoveredMonth)

  const [selected, setSelected] = useState(mode)

  const containerRef = useRef(null)
  const d3ref        = useRef(null)
  const [detail, setDetail] = useState(null)

  const dataMap = { activity: activityStream, venue: venueStream, travel: travelStream }
  const currentData = dataMap[selected]

  // Effect 1 — mount
  useEffect(() => {
    const el = containerRef.current
    const { width, height } = el.getBoundingClientRect()
    d3ref.current?.clear()
    d3ref.current = null
    if (width <= 0 || height <= 0) return undefined
    d3ref.current = new StreamGraphD3(el)
    d3ref.current.create({ width, height })
    return () => d3ref.current?.clear()
  }, [layoutKey])

  // Effect 2 — data / dropdown
  useEffect(() => {
    if (!d3ref.current || !currentData) return
    setDetail(null)
    d3ref.current.render(currentData, {
      title: DATASETS[selected].label,
      onMonthClick: (m) => dispatch(setSelectedMonth(m)),
      onMonthHover: (m) => dispatch(setHoveredMonth(m)),
      onHoverDetail: setDetail,
    })
  }, [currentData, selected, layoutKey])

  // Effect 3 — interaction
  useEffect(() => {
    if (!d3ref.current) return
    const active = selectedMonth ?? hoveredMonth
    d3ref.current.highlightMonth(active)
  }, [selectedMonth, hoveredMonth])

  return (
    <div className="q4VizFrame q4StreamViz">
      {showSelector && (
        <select
          className="q4ModeSelect"
          value={selected}
          onChange={e => setSelected(e.target.value)}
        >
          {Object.entries(DATASETS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      )}
      <div ref={containerRef} className="q4VizStage" />
      {isExpanded ? <DetailPanel className="q4StreamDetail" detail={detail ?? getStreamDefaultDetail(currentData, selected)} /> : null}
    </div>
  )
}
