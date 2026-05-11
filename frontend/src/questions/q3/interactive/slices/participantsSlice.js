import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import * as d3 from "d3";

const PARTICIPANTS_URL = "/VAST-Challenge-2022/Datasets/Attributes/Participants.csv";

let participantsPromise = null;

export const fetchParticipants = createAsyncThunk(
  "participants/fetch",
  async (_, thunkAPI) => {
    try {
      participantsPromise ??= d3.csv(PARTICIPANTS_URL, (row) => ({
        participantId: Number(row.participantId),
        householdSize: Number(row.householdSize),
        haveKids: row.haveKids === "TRUE",
        age: Number(row.age),
        educationLevel: row.educationLevel,
        interestGroup: row.interestGroup,
        joviality: Number(row.joviality),
      }));

      return await participantsPromise;
    } catch (err) {
      return thunkAPI.rejectWithValue(err.message);
    }
  }
);

const participantsSlice = createSlice({
  name: "participants",
  initialState: { data: [], status: "idle", error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchParticipants.pending,   (state)          => { state.status = "loading"; })
      .addCase(fetchParticipants.fulfilled, (state, action)  => { state.status = "succeeded"; state.data = action.payload; })
      .addCase(fetchParticipants.rejected,  (state, action)  => { state.status = "failed";    state.error = action.payload; });
  },
});

export default participantsSlice.reducer;
