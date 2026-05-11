import React, { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { setSelectedMonth, setHoveredMonth } from '../../redux/InteractionSlice'
import DetailPanel from '../DetailPanel'
import BarChartD3 from './BarChart-d3'

export default function BarChartContainer({ data, title, yLabel, color, formatY, defaultDetail, layoutKey, isExpanded = false }) {
  const dispatch = useDispatch()
  const selectedMonth = useSelector(s => s.interaction.selectedMonth)
  const hoveredMonth  = useSelector(s => s.interaction.hoveredMonth)

  const containerRef = useRef(null)
  const d3ref        = useRef(null)
  const [detail, setDetail] = useState(null)

  useEffect(() => {
    const el = containerRef.current
    const { width, height } = el.getBoundingClientRect()
    d3ref.current?.clear()
    d3ref.current = null
    if (width <= 0 || height <= 0) return undefined
    d3ref.current = new BarChartD3(el)
    d3ref.current.create({ width, height })
    return () => d3ref.current?.clear()
  }, [layoutKey])

  useEffect(() => {
    if (!d3ref.current || !data) return
    d3ref.current.render(data, {
      title, yLabel, color, formatY,
      onMonthClick: (m) => dispatch(setSelectedMonth(m)),
      onMonthHover: (m) => dispatch(setHoveredMonth(m)),
      onHoverDetail: setDetail,
    })
  }, [data, title, yLabel, color, formatY, layoutKey])

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
