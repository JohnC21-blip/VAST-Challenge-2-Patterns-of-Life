import React, { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { setSelectedMonth, setHoveredMonth } from '../../redux/InteractionSlice'
import DetailPanel from '../DetailPanel'
import CalendarHeatmapD3 from './CalendarHeatmap-d3'

export default function CalendarHeatmapContainer({ data, title, diverging = false, vmax = null, defaultDetail, layoutKey, isExpanded = false }) {
  const dispatch = useDispatch()
  const selectedMonth = useSelector(s => s.interaction.selectedMonth)
  const hoveredMonth  = useSelector(s => s.interaction.hoveredMonth)

  const containerRef = useRef(null)
  const d3ref        = useRef(null)
  const [detail, setDetail] = useState(null)

  // Effect 1 — mount: create the D3 instance
  useEffect(() => {
    const el = containerRef.current
    const { width, height } = el.getBoundingClientRect()
    d3ref.current?.clear()
    d3ref.current = null
    if (width <= 0 || height <= 0) return undefined
    d3ref.current = new CalendarHeatmapD3(el)
    d3ref.current.create({ width, height })
    return () => d3ref.current?.clear()
  }, [layoutKey])

  // Effect 2 — data: render whenever data / title arrives
  useEffect(() => {
    if (!d3ref.current || !data) return
    d3ref.current.render(data, {
      title,
      diverging,
      vmax,
      onMonthClick: (m) => dispatch(setSelectedMonth(m)),
      onMonthHover: (m) => dispatch(setHoveredMonth(m)),
      onHoverDetail: setDetail,
    })
  }, [data, title, diverging, vmax, layoutKey])

  // Effect 3 — interaction: sync selection highlight
  useEffect(() => {
    if (!d3ref.current) return
    const active = selectedMonth ?? hoveredMonth
    d3ref.current.highlightMonth(active)
  }, [selectedMonth, hoveredMonth])

  return (
    <div className="q4VizFrame">
      <div ref={containerRef} className="q4VizStage" />
      {isExpanded ? <DetailPanel detail={detail ?? defaultDetail} /> : null}
    </div>
  )
}
