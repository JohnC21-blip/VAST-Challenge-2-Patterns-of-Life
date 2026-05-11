import Tooltip from "../../../q1/charts/Tooltip";
import "./Q2ChartFrame.css";

function ChartDetail({rows, title}) {
    return (
        <div className="detailCompact">
            <Tooltip title={title} rows={rows}/>
        </div>
    );
}

export default function Q2ChartFrame({children, detailRows, detailTitle, showDetail}) {
    return (
        <div className={showDetail ? "frameCompact hasDetail" : "frameCompact"}>
            <div className="visual">
                {children}
            </div>
            {showDetail ? (
                <ChartDetail title={detailTitle} rows={detailRows}/>
            ) : null}
        </div>
    );
}