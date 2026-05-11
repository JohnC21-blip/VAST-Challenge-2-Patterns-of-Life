import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

const CHECKIN_BASE_URL = "/json/q3-checkins";
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const participantCheckinPromises = new Map();

function expandCheckinTuple(participantId, row) {
  const [timestamp, venueId, venueType] = row;
  const date = new Date(timestamp);

  return {
    participantId,
    timestamp,
    venueId,
    venueType,
    hour: date.getUTCHours(),
    weekday: WEEKDAYS[date.getUTCDay()],
    date: timestamp.slice(0, 10),
  };
}

function loadParticipantCheckins(participantId) {
  const normalizedId = Number(participantId);

  if (!participantCheckinPromises.has(normalizedId)) {
    const checkinPromise = fetch(`${CHECKIN_BASE_URL}/${normalizedId}.json`).then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to load Q3 check-ins for participant ${normalizedId}`);
      }

      return response.json().then((rows) => (
        rows.map((row) => expandCheckinTuple(normalizedId, row))
      ));
    });

    participantCheckinPromises.set(
      normalizedId,
      checkinPromise.catch((error) => {
        participantCheckinPromises.delete(normalizedId);
        throw error;
      })
    );
  }

  return participantCheckinPromises.get(normalizedId);
}

export const fetchCheckin = createAsyncThunk(
  "checkin/fetch",
  async ({ p1, p2 }, thunkAPI) => {
    try {
      const selectedIds = [...new Set([Number(p1), Number(p2)])];
      const checkins = await Promise.all(selectedIds.map(loadParticipantCheckins));

      return checkins.flat();
    } catch (err) {
      return thunkAPI.rejectWithValue(err.message);
    }
  }
);

const checkinSlice = createSlice({
  name: "checkin",
  initialState: {
    selectedIds : [0, 1],   // shown on first render before the user picks anything
    data        : [],
    status      : "idle",
    error       : null,
    currentRequestId: null,
  },
  reducers: {
    // Call this when the user changes a picker dropdown.
    // App.jsx watches selectedIds and triggers fetchCheckin automatically.
    setSelectedParticipants(state, action) {
      // action.payload: [p1Id, p2Id]
      state.selectedIds = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCheckin.pending, (state, action) => {
        state.status = "loading";
        state.error = null;
        state.data = [];
        state.currentRequestId = action.meta.requestId;
      })
      .addCase(fetchCheckin.fulfilled, (state, action) => {
        if (state.currentRequestId !== action.meta.requestId) {
          return;
        }

        state.status = "succeeded";
        state.data = action.payload;
        state.currentRequestId = null;
      })
      .addCase(fetchCheckin.rejected, (state, action) => {
        if (state.currentRequestId !== action.meta.requestId) {
          return;
        }

        state.status = "failed";
        state.error = action.payload;
        state.data = [];
        state.currentRequestId = null;
      });
  },
});

export const { setSelectedParticipants } = checkinSlice.actions;
export default checkinSlice.reducer;
