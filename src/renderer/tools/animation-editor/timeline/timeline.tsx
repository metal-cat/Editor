import { Nullable } from "../../../../shared/types";

import * as React from "react";

import { Chart } from "chart.js";
import "chartjs-plugin-dragdata";
import "chartjs-plugin-zoom";
import "chartjs-plugin-annotation";

import Editor from "../../../editor";

export interface ITimelineEditorProps {
    /**
     * Defines the reference to the editor.
     */
    editor: Editor;
}

export interface ITimelineEditorState {

}

export class TimelineEditor extends React.Component<ITimelineEditorProps, ITimelineEditorState> {
    /**
     * Defines the reference to the chart.
     */
    public chart: Nullable<Chart> = null;

    private _editor: Editor;

    private _canvas: Nullable<HTMLCanvasElement> = null;
    private _refHandler = {
        getCanvas: (ref: HTMLCanvasElement) => this._canvas = ref,
    };

    /**
     * Construcor.
     * @param props defines the compoenent's props.
     */
    public constructor(props: ITimelineEditorProps) {
        super(props);

        this._editor = props.editor;
        this.state = {

        };
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        return (
            <canvas
                ref={this._refHandler.getCanvas}
            ></canvas>
        );
    }

    /**
     * Called on the component did mount.
     */
    public componentDidMount(): void {
        if (!this._canvas) { return; }

        this.chart = new Chart(this._canvas.getContext("2d")!, {
            type: "bubble",
            data: {
                datasets: [{
                    label: "x",
                    borderWidth: 1,
                    backgroundColor: "rgb(189, 80, 105, 1)",
                    pointHitRadius: 25,
                    data: [{
                        x: 10,
                        y: 15,
                        r: 30
                    }],
                }],
            },
            options: {
                dragData: true,
                dragX: true,
                showLines: false,
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 0,
                },
                tooltips: {
                    caretPadding: 15,
                    mode: "point",
                },
                plugins: {
                    zoom: {
                        pan: {
                            enabled: true,
                            mode: () => "x",
                        },
                        zoom: {
                            enabled: true,
                            mode: () => "x",
                        },
                    },
                },
                scales: {
                    xAxes: [{
                        type: "linear",
                        position: "top",
                        ticks: { min: 0, max: 60 },
                    }],
                    yAxes: [{
                        ticks: { min: 0, max: 20 },
                    }],
                }
            },
        });
    }

    /**
     * Called on the component will unmount.
     */
    public componentWillUnmount(): void {
        // Destroy chart
        try {
            this.chart?.destroy();
        } catch (e) {
            this._editor.console.logError("[Animation Editor]: failed to destroy chart.");
        }
    }

    /**
     * Called on the panel has been resized.
     * @param width the new with of the plugin's panel.
     * @param height the new height of the plugin's panel.
     */
    // @ts-ignore
    public resize(width: number, height: number): void {
        
    }
}
