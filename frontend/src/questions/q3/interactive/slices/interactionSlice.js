import {createSlice} from "@reduxjs/toolkit";

const interactionSlice = createSlice({
  name: "q3Interaction",
  initialState: {
    hoverInfo: null,
    hoveredInteraction: null,
    selectedInfo: null,
    selectedInteraction: null,
  },
  reducers: {
    setHoverInfo(state, action) {
      state.hoverInfo = action.payload;
    },
    setSelectedInfo(state, action) {
      state.selectedInfo = action.payload;
    },
    setHoveredInteraction(state, action) {
      state.hoveredInteraction = action.payload;
    },
    toggleSelectedInteraction(state, action) {
      const nextInteraction = action.payload;
      const currentInteraction = state.selectedInteraction;

      state.selectedInteraction = currentInteraction
        && currentInteraction.kind === nextInteraction.kind
        && currentInteraction.key === nextInteraction.key
          ? null
          : nextInteraction;
    },
    clearHoverInfo(state) {
      state.hoverInfo = null;
    },
    resetInteraction(state) {
      state.hoverInfo = null;
      state.hoveredInteraction = null;
      state.selectedInfo = null;
      state.selectedInteraction = null;
    },
  },
});

export const {
  clearHoverInfo,
  resetInteraction,
  setHoveredInteraction,
  setHoverInfo,
  setSelectedInfo,
  toggleSelectedInteraction,
} = interactionSlice.actions;
export default interactionSlice.reducer;
