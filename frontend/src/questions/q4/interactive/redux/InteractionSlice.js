import { createSlice } from '@reduxjs/toolkit'

const interactionSlice = createSlice({
  name: 'interaction',
  initialState: {
    selectedMonth: null,   // e.g. "2022-07" — clicked month (pinned)
    hoveredMonth: null,    // e.g. "2022-04" — hover highlight
  },
  reducers: {
    setSelectedMonth: (state, action) => {
      // Toggle: clicking same month again deselects it
      state.selectedMonth = state.selectedMonth === action.payload
        ? null
        : action.payload
    },
    setHoveredMonth: (state, action) => {
      state.hoveredMonth = action.payload
    },
  },
})

export const { setSelectedMonth, setHoveredMonth } = interactionSlice.actions
export default interactionSlice.reducer
