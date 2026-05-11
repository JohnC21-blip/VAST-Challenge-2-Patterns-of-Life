import {getChartLabelLines} from "./Utils";

export default function RowLabel({label, x, y}) {
    const lines = getChartLabelLines(label);

    if (lines.length === 1) {
        return (<text x={x} y={y + 4} textAnchor="end" className="labelText">{lines[0]}</text>);
    }

    return (<text x={x} y={y - 4} textAnchor="end" className="labelText">
        <tspan x={x} dy={0}>{lines[0]}</tspan>
        <tspan x={x} dy={13}>{lines[1]}</tspan>
    </text>);
}