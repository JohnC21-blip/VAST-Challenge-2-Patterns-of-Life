/**
 * ParticipantPicker.jsx
 * ---------------------
 * Two dropdown selects that let the user choose which two participants to compare.
 *
 * On change:
 *   1. Dispatches setSelectedParticipants([p1, p2]) to update Redux state
 *   2. Dispatches fetchCheckin({ p1, p2 }) to re-fetch data from the backend
 *
 * No props — reads from and writes to Redux directly.
 */

import "./ParticipantPicker.css";
import { useSelector, useDispatch }        from "react-redux";
import { setSelectedParticipants }         from "./slices/checkinSlice";

function ParticipantPicker() {
  const dispatch     = useDispatch();
  const participants = useSelector(state => state.participants.data);
  const selectedIds  = useSelector(state => state.checkin.selectedIds);

  // Not loaded yet — render nothing (App will show a loading message)
  if (participants.length === 0) return null;

  const handleChange = (slot, rawValue) => {
    const newId  = parseInt(rawValue, 10);
    const otherSlot = slot === 0 ? 1 : 0;
    const newIds = slot === 0
      ? [newId, selectedIds[1]]
      : [selectedIds[0], newId];

    if (newId === selectedIds[otherSlot]) {
      newIds[otherSlot] = selectedIds[slot];
    }

    dispatch(setSelectedParticipants(newIds));
  };

  return (
    <div className="participantPicker">
      <span className="pickerLabel">Compare participants:</span>

      {[0, 1].map(slot => (
        <label key={slot} className="pickerSlot">
          <select
            value={selectedIds[slot]}
            onChange={e => handleChange(slot, e.target.value)}
          >
            {participants.map(p => (
              <option key={p.participantId} value={p.participantId}>
                #{p.participantId} — age {p.age}, {p.educationLevel},
                joviality {p.joviality.toFixed(2)}
              </option>
            ))}
          </select>
        </label>
      ))}
    </div>
  );
}

export default ParticipantPicker;
