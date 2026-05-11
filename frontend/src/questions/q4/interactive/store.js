import { configureStore } from '@reduxjs/toolkit'
import dataReducer from './redux/DataSlice'
import interactionReducer from './redux/InteractionSlice'

export default configureStore({
  reducer: {
    data: dataReducer,
    interaction: interactionReducer,
  },
})
