import { Provider } from 'react-redux'
import store from './interactive/store'
import Q4Interactive from './interactive/App'
import './Question4.css'

export default function Question4() {
    return (
        <Provider store={store}>
            <Q4Interactive />
        </Provider>
    )
}
