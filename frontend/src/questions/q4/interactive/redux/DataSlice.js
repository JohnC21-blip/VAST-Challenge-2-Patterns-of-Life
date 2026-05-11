import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'

const STATIC_DATA_URL = '/json/q4_agg_cache.json'

export const loadAllData = createAsyncThunk('data/loadAll', async () => {
  const res = await fetch(STATIC_DATA_URL)
  if (!res.ok) {
    throw new Error(`Failed to fetch ${STATIC_DATA_URL}`)
  }
  return res.json()
})

const dataSlice = createSlice({
  name: 'data',
  initialState: {
    status: 'idle',
    error: null,
    checkinHeatmap: null,
    moneyflowHeatmap: null,
    residentialMobility: [],
    wealth: [],
    socialNetwork: [],
    socialPairs: [],
    activityStream: null,
    venueStream: null,
    travelStream: null,
    rentHistogram: [],
    spendingBreakdown: [],
    recreationFoodRatio: [],
    physiological: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadAllData.pending,   (state) => { state.status = 'loading' })
      .addCase(loadAllData.fulfilled, (state, action) => {
        state.status = 'ready'
        Object.assign(state, action.payload)
      })
      .addCase(loadAllData.rejected,  (state, action) => {
        state.status = 'error'
        state.error = action.error.message
      })
  },
})

export default dataSlice.reducer
