import { Nullable, Undefinable } from "../../../shared/types";

import * as React from "react";
import { Classes, ContextMenu, Intent, Menu, MenuDivider, MenuItem, Pre, Tag } from "@blueprintjs/core";

import { Chart, ChartDataSets } from "chart.js";
import "chartjs-plugin-dragdata";
import "chartjs-plugin-zoom";
import "chartjs-plugin-annotation";

import { Animatable, Animation, Color3, Color4, IAnimatable, KeyboardEventTypes, KeyboardInfo, Observer, Scalar, Vector2, Vector3 } from "babylonjs";

import Editor from "../../editor";

import { Icon } from "../../editor/gui/icon";

import { undoRedo } from "../../editor/tools/undo-redo";

import "./tools/augmentations";
import { SyncType } from "./tools/types";
import { IVector2Like } from "./tools/augmentations";
import { AnimationTools } from "./tools/animation-to-dataset";
import { AnimationKeyObject } from "./tools/animation-key-object";

export interface IChartEditorProps {
    /**
     * Defines the reference to the editor.
     */
    editor: Editor;
    /**
     * Defines the synchronization type for animation when playing/moving time tracker.
     */
    synchronizationType: SyncType;
}

export interface IChartEditorState {
    /**
     * Defines wether or not the mouse is over the canvas or not.
     */
    isMouseHover: boolean;
    /**
     * Defines the mouse position on the chart (X and Y axis).
     */
    mousePositionOnChart: IVector2Like;
}

export class ChartEditor extends React.Component<IChartEditorProps, IChartEditorState> {
    /**
     * Defines the reference to the chart.
     */
    public chart: Nullable<Chart> = null;

    private _editor: Editor;

    private _datasets: ChartDataSets[] = [];

    private _selectedAnimatable: Nullable<IAnimatable> = null;
    private _selectedAnimation: Nullable<Animation> = null;

    private _panDisabled: boolean = false;
    private _isOverTimeTracker: boolean = false;
    private _draggingTimeTracker: boolean = false;

    private _mousePositonOnChart: Vector2 = new Vector2(0, 0);
    private _undoRedoKeyData: Nullable<IVector2Like> = null;

    private _playAnimatable: Nullable<Animatable> = null;
    private _playAnimationInverval: Nullable<NodeJS.Timeout> = null;

    private _keyboardObserver: Nullable<Observer<KeyboardInfo>>;

    private _canvas: Nullable<HTMLCanvasElement> = null;
    private _refHandler = {
        getCanvas: (ref: HTMLCanvasElement) => this._canvas = ref,
    };

    /**
     * Constructor.
     * @param props defines the component's props.
     */
    public constructor(props: IChartEditorProps) {
        super(props);

        this._editor = props.editor;
        this.state = {
            isMouseHover: false,
            mousePositionOnChart: { x: 0, y: 0 },
        };
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        return (
            <>
                <canvas
                    ref={this._refHandler.getCanvas}
                    onMouseEnter={() => this.setState({ isMouseHover: true })}
                    onMouseLeave={() => this.setState({ isMouseHover: false })}
                    onMouseMove={(ev) => this._handleMouseMove(ev)}
                    onMouseDown={(ev) => this._handleMouseDown(ev)}
                    onMouseUp={(ev) => this._handleMouseUp(ev)}
                    onDoubleClick={(ev) => this._handleDoubleClick(ev)}
                ></canvas>
                <Tag intent={Intent.PRIMARY} style={{ position: "absolute", right: "0px", top: "-25px", visibility: (this.state.isMouseHover ? "visible" : "hidden") }}>Frame: {this.state.mousePositionOnChart.x}</Tag>
                <Tag intent={Intent.PRIMARY} style={{ position: "absolute", right: "0px", top: "0px", visibility: (this.state.isMouseHover ? "visible" : "hidden") }}>Value: {this.state.mousePositionOnChart.y}</Tag>
            </>
        );
    }

    /**
     * Called on the component did mount.
     */
    public componentDidMount(): void {
        if (!this._canvas) {
            return;
        }

        // Register events
        this._keyboardObserver = this._editor.onKeyboardEventObservable.add((infos) => this._handleKeyboardEvent(infos));

        // Create chart
        this.chart = new Chart(this._canvas.getContext("2d")!, {
            type: "line",
            data: {
                datasets: [{
                    label: "x",
                    pointRadius: 10,
                    showLine: true,
                    fill: false,
                    data: [
                        // { x: 0, y: 5 },
                        // { x: 10, y: 10 },
                        // { x: 20, y: 5 }
                    ],
                }],
            },
            options: {
                dragData: true,
                dragX: true,
                onDragStart: () => this._handleDragPointStart(),
                onDrag: (e, di, i, v) => this._handleDragPoint(e, di, i, v),
                onDragEnd: (e, di, i, v) => this._handleDragPointEnd(e, di, i, v),
                onClick: (e, elements) => this._handleChartClick(e, elements),
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
                annotation: {
                    events: ["mouseenter", "mouseleave"],
                    annotations: [{
                        drawTime: "afterDatasetsDraw",
                        id: "frame-tracker",
                        type: "line",
                        mode: "vertical",
                        scaleID: "x-axis-0",
                        value: 0,
                        borderColor: "#000000",
                    }, {
                        drawTime: "afterDatasetsDraw",
                        id: "value-tracker",
                        type: "line",
                        mode: "horizontal",
                        scaleID: "y-axis-0",
                        value: 0,
                        borderColor: "#000000",
                    }, {
                        drawTime: "afterDatasetsDraw",
                        id: "time-tracker",
                        type: "line",
                        mode: "vertical",
                        scaleID: "x-axis-0",
                        value: 0,
                        borderColor: "#111111",
                        boderWidth: 5,
                        label: {
                            enabled: true,
                            content: "Time",
                            position: "top",
                            backgroundColor: "#333333"
                        },
                        onMouseenter: () => {
                            this._isOverTimeTracker = true;
                            this._panDisabled = true;

                            this._getTimeTracker().borderColor = "#000000";
                            this._getTimeTracker().label.backgroundColor = "#000000";
                            this.chart!.update();
                        },
                        onMouseleave: () => {
                            this._isOverTimeTracker = false;
                            this._panDisabled = false;

                            this._getTimeTracker().borderColor = "#111111";
                            this._getTimeTracker().label.backgroundColor = "#333333";
                            this.chart!.update();
                        },
                    }],
                },
                plugins: {
                    zoom: {
                        pan: {
                            enabled: true,
                            mode: () => this._panDisabled ? "" : "xy",
                        },
                        zoom: {
                            enabled: true,
                            mode: () => {
                                if (this._mousePositonOnChart.x <= this.chart!["scales"]["x-axis-0"].left) { return "y"; }
                                if (this._mousePositonOnChart.y >= this.chart!["scales"]["y-axis-0"].bottom) { return "x"; }
                                return "xy";
                            },
                        },
                    },
                },
                scales: {
                    xAxes: [{
                        type: "linear",
                        position: "bottom",
                        ticks: {
                            min: 0,
                            max: 60,
                            fontSize: 12,
                            fontStyle: "bold",
                            fontColor: "#222222",
                        },
                    }/*, {
                        type: "time",
                        position: "bottom",
                        ticks: {
                            min: 0,
                            max: 1000,
                            // fontSize: 12,
                            // fontStyle: "bold",
                            // fontColor: "#222222",
                        },
                        time: {
                            stepSize: 60,
                            displayFormats: {
                                millisecond: "mm:ss",
                                second: "mm:ss",
                                minute: "mm:ss",
                                hour: "mm:ss",
                                day: "mm:ss",
                                week: "mm:ss",
                                month: "mm:ss",
                                quarter: "mm:ss",
                                year: "mm:ss",
                            },
                        },
                    }*/],
                    yAxes: [{
                        ticks: {
                            min: -10,
                            max: 10,
                            fontSize: 12,
                            fontStyle: "bold",
                            fontColor: "#222222",
                        },
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

        // Remove events
        this._editor.onKeyboardEventObservable.remove(this._keyboardObserver);
    }

    /**
     * Sets the new animatable to edit.
     * @param animatable defines the reference to the animatable.
     */
    public setAnimatable(animatable: IAnimatable): void {
        this._selectedAnimatable = animatable;
    }

    /**
     * Sets the new animation to edit.
     * @param animation defines the reference of the selected animation to edit.
     * @param animate defines wether or not the chart should be animated.
     */
    public setAnimation(animation: Nullable<Animation>, animate: boolean = false): void {
        if (!this.chart) { return; }

        const datasets = AnimationTools.ConvertToDatasets(animation);
        if (!datasets) { return; }

        this.chart.data.datasets = datasets;
        this.chart.config.options!.animation!.duration = animate ? 1000 : 0;

        this.chart.update();

        this._datasets = datasets;
        this._selectedAnimation = animation;
    }

    /**
     * Returns the current frame value according to the time tracker's position.
     */
    public getCurrentFrameValue(): Nullable<number> {
        if (!this.chart) { return null; }
        return this._getTimeTracker().value;
    }

    /**
     * Plays the animation (moves the time tracker).
     */
    public playAnimation(from: number, to?: number): void {
        if (!this.chart || !this._selectedAnimation) { return; }

        const annotation = this._getTimeTracker();
        if (!annotation) { return; }

        const range = AnimationTools.GetKeysRange(this._selectedAnimation);
        const existingKeys = this._selectedAnimation.getKeys();

        const animation = new Animation(
            "TimeTrackerAnimation",
            "value",
            this._selectedAnimation.framePerSecond,
            Animation.ANIMATIONTYPE_FLOAT,
            Animation.ANIMATIONLOOPMODE_CONSTANT,
            this._selectedAnimation.enableBlending,
        );
        animation.blendingSpeed = this._selectedAnimation.blendingSpeed;
        animation.setKeys(existingKeys.map((k) => ({
            frame: k.frame,
            value: k.frame,
        })));

        this._playAnimationInverval = setInterval(() => {
            this.chart?.update(0);
        }, 16);

        this._playAnimatable = this._editor.scene!.beginDirectAnimation(annotation, [animation], from, to ?? range.maxFrame, false, 1.0, () => {
            this._playAnimatable = null;
            this.stopAnimation();
        });
    }

    /**
     * Stops the animation (moves the time tracker).
     */
    public stopAnimation(): void {
        if (this._playAnimationInverval !== null) {
            clearInterval(this._playAnimationInverval);
        }

        if (this._playAnimatable) {
            this._playAnimatable.stop();
        }

        this._playAnimationInverval = null;
        this._playAnimatable = null;
    }

    /**
     * Resets the current object to the first frame.
     */
    public resetObjectToFirstFrame(): void {
        if (!this.chart || !this._selectedAnimation) { return; }

        const range = AnimationTools.GetKeysRange(this._selectedAnimation);
        this._getTimeTracker().value = range.minFrame;

        this.updateObjectToCurrentFrame(SyncType.Object);
    }

    /**
     * Updates the current object to the current frame on animation.
     */
    public updateObjectToCurrentFrame(syncType?: SyncType): void {
        if (!this._selectedAnimatable || !this._selectedAnimation) { return; }

        const currentFrame = this.getCurrentFrameValue();
        if (currentFrame === null) { return; }

        const range = AnimationTools.GetKeysRange(this._selectedAnimation);
        const enableBlending = this._selectedAnimation.enableBlending;

        this._selectedAnimation.enableBlending = false;

        let animatable: Nullable<Animatable> = null;
        switch (syncType ?? this.props.synchronizationType) {
            case SyncType.Animation:
                animatable = this._editor.scene!.beginDirectAnimation(this._selectedAnimatable, [this._selectedAnimation], range.minFrame, range.maxFrame, false, 1.0);
                break;
            case SyncType.Object:
                animatable = this._editor.scene!.beginAnimation(this._selectedAnimatable, range.minFrame, range.maxFrame, false, 1.0);
                break;
        }

        if (animatable) {
            animatable.goToFrame(currentFrame);
            this._editor.scene!.stopAnimation(this._selectedAnimatable);
        }

        this._selectedAnimation.enableBlending = enableBlending;
    }

    /**
     * Called on the user fires a keyboard event.
     */
    private _handleKeyboardEvent(infos: KeyboardInfo): void {
        if (!this.chart) { return; }

        if (infos.event.keyCode === 32) {
            if (this.chart.config.options) {
                this.chart!.config!.options!.dragX = infos.type === KeyboardEventTypes.KEYUP;
            }
        }
    }

    /**
     * Called on the mouse moves on the canvas.
     */
    private _handleMouseMove(ev: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
        this.setState({ mousePositionOnChart: this._getPositionOnChart(ev.nativeEvent) ?? this.state.mousePositionOnChart });

        this._mousePositonOnChart.set(ev.nativeEvent.offsetX, ev.nativeEvent.offsetY);

        if (this._draggingTimeTracker) {
            const positionOnChart = this._getPositionOnChart(ev.nativeEvent);

            if (positionOnChart && this.chart) {
                this._getTimeTracker().value = Math.max(0, positionOnChart.x);
                this.chart.update(0);

                this.updateObjectToCurrentFrame();
            }
        }
    }

    /**
     * Called on the mouse is down on the canvas.
     */
    private _handleMouseDown(_: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
        this._draggingTimeTracker = this._isOverTimeTracker;

        if (this._draggingTimeTracker) {
            this._panDisabled = true;
        }
    }

    /**
     * Called on the mouse is up on the canvas.
     */
    private _handleMouseUp(ev: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
        if (this._draggingTimeTracker) {
            this._draggingTimeTracker = false;
        } else if (ev.button === 2) {
            this._handleContextMenu(ev);
        }

        if (!this._isOverTimeTracker) {
            this._panDisabled = false;
        }
    }

    /**
     * Called on the user double clicks on the chart.
     */
    private _handleDoubleClick(ev: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
        if (!this.chart || !this._selectedAnimation) { return; }

        const elements = this.chart.getElementsAtEvent(ev);
        if (elements && elements.length > 0) {
            const keys = this._selectedAnimation.getKeys();
            const key = keys[elements[0]["_index"]];
            if (!key) { return; }

            this._getTimeTracker().value = key.frame;
        } else {
            const positionOnChart = this._getPositionOnChart(ev.nativeEvent);
            if (positionOnChart) {
                this._getTimeTracker().value = Math.max(positionOnChart.x, 0);
            }
        }

        this.chart.update(0);

        this.updateObjectToCurrentFrame();
    }

    /**
     * Called on an element of the chart is starting being dragged.
     */
    private _handleDragPointStart(): void {
        this._panDisabled = true;
    }

    /**
     * Called on an element of the chart is being dragged.
     */
    private _handleDragPoint(ev: MouseEvent, datasetIndex: number, index: number, value: IVector2Like): void {
        const mousePositionOnChart = this._getPositionOnChart(ev) ?? this.state.mousePositionOnChart;

        if (!this._undoRedoKeyData && this._selectedAnimation) {
            this._undoRedoKeyData = { x: value.x, y: value.y };
        }

        this._updateKey(datasetIndex, index, value);
        this.setState({ mousePositionOnChart });
    }

    /**
     * Callback called on an element stops being dragged.
     */
    private _handleDragPointEnd(_: MouseEvent, datasetIndex: number, index: number, value: IVector2Like): void {
        if (this._undoRedoKeyData && this._selectedAnimation) {
            const undoData = { x: this._undoRedoKeyData.x, y: this._undoRedoKeyData.y };
            const redoData = { x: value.x, y: value.y };

            undoRedo.push({
                common: () => this.chart?.update(0),
                undo: () => this._updateKey(datasetIndex, index, undoData),
                redo: () => this._updateKey(datasetIndex, index, redoData),
            });
        } else {
            this._updateKey(datasetIndex, index, value);
        }

        this._panDisabled = false;
        this._undoRedoKeyData = null;
    }

    /**
     * Updates the key (according to the given informations to retrieve it) with the given value.
     */
    private _updateKey(datasetIndex: number, index: number, value: IVector2Like): void {
        if (!this._selectedAnimation || !this._datasets) { return; }

        // Limit frames to 0
        if (value.x < 0) {
            value.x = 0;
        }

        const key = this._selectedAnimation.getKeys()[index];
        if (!key) { return; }

        key.frame = value.x;

        (this._datasets[datasetIndex].data![index] as IVector2Like).y = value.y;
        
        switch (this._selectedAnimation.dataType) {
            // Float
            case Animation.ANIMATIONTYPE_FLOAT:
                (this._datasets[0].data![index] as IVector2Like).x = value.x;

                key.value = value.y;
                break;

            // Vectors
            case Animation.ANIMATIONTYPE_VECTOR2:
            case Animation.ANIMATIONTYPE_VECTOR3:
                (this._datasets[0].data![index] as IVector2Like).x = value.x;
                (this._datasets[1].data![index] as IVector2Like).x = value.x;
                
                if (this._selectedAnimation.dataType === Animation.ANIMATIONTYPE_VECTOR3) {
                    (this._datasets[2].data![index] as IVector2Like).x = value.x;
                }

                const vectorProperty = ["x", "y", "z"][datasetIndex];
                if (vectorProperty) {
                    key.value[vectorProperty] = value.y;
                }
                break;

            // Colors
            case Animation.ANIMATIONTYPE_COLOR3:
            case Animation.ANIMATIONTYPE_COLOR4:
                (this._datasets[0].data![index] as IVector2Like).x = value.x;
                (this._datasets[1].data![index] as IVector2Like).x = value.x;
                (this._datasets[2].data![index] as IVector2Like).x = value.x;

                if (this._selectedAnimation.dataType === Animation.ANIMATIONTYPE_COLOR4) {
                    (this._datasets[3].data![index] as IVector2Like).x = value.x;
                }

                const colorProperty = ["r", "g", "b", "a"][datasetIndex];
                if (colorProperty) {
                    key.value[colorProperty] = value.y;
                }
                break;
        }

        this.updateObjectToCurrentFrame();
    }

    /**
     * Called on the user clicks on a point.
     */
    private _handleChartClick(_: Undefinable<MouseEvent>, elements: Undefinable<{ }[]>): void {
        if (!this.chart || !this._selectedAnimation || !elements?.length) { return; }

        const element = elements[0]!;
        const key = this._selectedAnimation.getKeys()[element["_index"]];

        if (key) {
            this._editor.inspector.setSelectedObject(new AnimationKeyObject(this._selectedAnimation, key, element["_index"], () => {
                if (this._selectedAnimation) {
                    this.setAnimation(this._selectedAnimation);
                    this.updateObjectToCurrentFrame();
                }
            }));
        }
    }

    /**
     * Called on the user right-clicks on the canvas.
     */
    private _handleContextMenu(ev: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
        if (!this.chart || !this._selectedAnimation) { return; }

        const chartPosition = this._getPositionOnChart(ev.nativeEvent);
        if (!chartPosition) { return; }

        const elements = this.chart.getElementsAtEvent(ev);
        let removeElement: React.ReactNode;
        if (elements.length && this._selectedAnimation.getKeys().length > 2) {
            removeElement = (
                <>
                    <MenuDivider />
                    <MenuItem text="Remove Key" icon={<Icon src="times.svg" />} onClick={() => {
                        const element = elements[0];
                        const keys = this._selectedAnimation!.getKeys();

                        keys.splice(element["_index"], 1);

                        this.setAnimation(this._selectedAnimation!);
                    }} />
                </>
            );
        }

        ContextMenu.show(
            <Menu className={Classes.DARK}>
                <Pre>
                    Coordinates: <br />
                    x: <Tag intent={Intent.PRIMARY}>{chartPosition.x}</Tag><br />
                    y: <Tag intent={Intent.PRIMARY}>{chartPosition.y}</Tag>
                </Pre>
                <MenuItem text="Add Key (frame)" icon={<Icon src="plus.svg" />} onClick={() => this._addKeyAt(chartPosition.x, chartPosition.y, true)} />
                <MenuItem text="Add Key (frame & value)" icon={<Icon src="plus.svg" />} onClick={() => this._addKeyAt(chartPosition.x, chartPosition.y, false)} />
                <MenuDivider />
                <MenuItem text="Reset Zoom" onClick={() => this.chart!["resetZoom"]()} />
                {removeElement}
            </Menu>,
            { left: ev.nativeEvent.clientX, top: ev.nativeEvent.clientY },
        );
    }

    /**
     * Adds a new key at the given 
     */
    private _addKeyAt(frame: number, value: number, interpolate: boolean): void {
        if (!this._selectedAnimation || !this._datasets) { return; }

        // Find preview and next keys
        const keys = this._selectedAnimation.getKeys();
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];

            if (key.frame >= frame) {
                if (interpolate) {
                    const previousKey = keys[i - 1];
                    const distance = key.frame - previousKey.frame;
                    const amount = frame / distance;

                    if (previousKey) {
                        switch (this._selectedAnimation.dataType) {
                            case Animation.ANIMATIONTYPE_FLOAT: keys.splice(i, 0, { frame, value: Scalar.Lerp(previousKey.value, key.value, amount) }); break;

                            case Animation.ANIMATIONTYPE_VECTOR2: keys.splice(i, 0, { frame, value: Vector2.Lerp(previousKey.value, key.value, amount) }); break;
                            case Animation.ANIMATIONTYPE_VECTOR3: keys.splice(i, 0, { frame, value: Vector3.Lerp(previousKey.value, key.value, amount) }); break;

                            case Animation.ANIMATIONTYPE_COLOR3: keys.splice(i, 0, { frame, value: Color3.Lerp(previousKey.value, key.value, amount) }); break;
                            case Animation.ANIMATIONTYPE_COLOR4: keys.splice(i, 0, { frame, value: Color4.Lerp(previousKey.value, key.value, amount) }); break;
                        }
                    }
                } else {
                    switch (this._selectedAnimation.dataType) {
                        case Animation.ANIMATIONTYPE_FLOAT: keys.splice(i, 0, { frame, value }); break;

                        case Animation.ANIMATIONTYPE_VECTOR2: keys.splice(i, 0, { frame, value: new Vector2(value, value) }); break;
                        case Animation.ANIMATIONTYPE_VECTOR3: keys.splice(i, 0, { frame, value: new Vector3(value, value, value) }); break;

                        case Animation.ANIMATIONTYPE_COLOR3: keys.splice(i, 0, { frame, value: new Color3(value, value, value) }); break;
                        case Animation.ANIMATIONTYPE_COLOR4: keys.splice(i, 0, { frame, value: new Color4(value, value, value, value) }); break;
                    }
                }
                this.setAnimation(this._selectedAnimation);
                break;
            }
        }
    }

    /**
     * Returns the position on the chart according to the given mouse event.
     */
    private _getPositionOnChart(ev: MouseEvent): Nullable<IVector2Like> {
        if (!this.chart) { return null; }

        const x = this.chart["scales"]["x-axis-0"].getValueForPixel(ev.offsetX);
        const y = this.chart["scales"]["y-axis-0"].getValueForPixel(ev.offsetY);

        return { x, y };
    }

    /**
     * Returns the time tracker.
     */
    private _getTimeTracker(): any {
        return this.chart!["annotation"].elements["time-tracker"].options;
    }
}
