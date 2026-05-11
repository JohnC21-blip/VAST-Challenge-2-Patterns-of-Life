/**
 * store.js — Redux store
 *
 * One line per exercise:
 *   import xxxReducer from "./slices/xxxSlice";
 *   xxx: xxxReducer,
 *
 * That's all you need to add when you build the next visualisation.
 */
import { configureStore }    from "@reduxjs/toolkit";
import participantsReducer   from "./slices/participantsSlice";
import checkinReducer        from "./slices/checkinSlice";
import interactionReducer    from "./slices/interactionSlice";

export default configureStore({
  reducer: {
    participants : participantsReducer,   // Participants.csv
    checkin      : checkinReducer,        // CheckinJournal filtered by 2 participants
    interaction  : interactionReducer,
  },
});
