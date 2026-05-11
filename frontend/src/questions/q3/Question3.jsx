import {Provider} from "react-redux";
import store from "./interactive/store";
import Q3Interactive from "./interactive/Q3Interactive";

export default function Question3() {
    return (
        <Provider store={store}>
            <Q3Interactive/>
        </Provider>
    );
}
