import { Nullable } from "../../../shared/types";

import * as React from "react";
import { Classes, ButtonGroup, Button, NonIdealState, Tabs, TabId, Tab, Divider, Collapse } from "@blueprintjs/core";

import { Animatable, Animation, IAnimatable, Node, Observer } from "babylonjs";

import { AbstractEditorPlugin, IEditorPluginProps } from "../../editor/tools/plugin";

import { Icon } from "../../editor/gui/icon";
import { Select } from "../../editor/gui/select";

import { Tools } from "../../editor/tools/tools";

import { ChartEditor } from "./chart-editor";
import { TimelineEditor } from "./timeline/timeline";
import { AnimationsPanel } from "./animations-panel";

import { SelectedTab, SyncType } from "./tools/types";
import { AnimationObject } from "./tools/animation-object";
import { AnimationTools } from "./tools/animation-to-dataset";

import "./inspectors/key-inspector";
import "./inspectors/animation-inspector";

export const title = "Animation Editor";

export interface IAnimationEditorPluginState {
    /**
     * Defines the reference to the selected animatable.
     */
    selectedAnimatable: Nullable<IAnimatable & { name?: string; }>;
    /**
     * Defines the reference to the selected animation.
     */
    selectedAnimation: Nullable<Animation>;
    /**
     * Defines the reference to the animatable.
     */
    animatable: Nullable<Animatable>;
    /**
     * Defines wether or not the animations list is opened.
     */
    animatonsListOpened: boolean;
    /**
     * Defines the synchronization type for animation when playing/moving time tracker.
     */
    synchronizationType: SyncType;
    /**
     * Defines the Id of the selected tab.
     */
    selectedTab: TabId;
}

export default class AnimationEditorPlugin extends AbstractEditorPlugin<IAnimationEditorPluginState> {
    private _timelineEditor: Nullable<TimelineEditor> = null;
    private _chartEditor: Nullable<ChartEditor> = null;
    private _refHandler = {
        getTimelineEditor: (ref: TimelineEditor) => this._timelineEditor = ref,
        getChartEdior: (ref: ChartEditor) => this._chartEditor = ref,
    };

    private _selectedObjectObserver: Nullable<Observer<any>> = null;

    /**
     * Constructor.
     * @param props the component's props.
     */
    public constructor(props: IEditorPluginProps) {
        super(props);

        this.state = {
            selectedAnimatable: null,
            selectedAnimation: null,
            animatable: null,
            animatonsListOpened: false,
            synchronizationType: SyncType.Animation,
            selectedTab: SelectedTab.Graph,
        };
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        let noAnimatable: React.ReactNode;
        if (!this.state.selectedAnimatable) {
            noAnimatable = (
                <NonIdealState
                    icon="citation"
                    title="No Animatable Selected."
                    description={`Please first select a node in the scene to add/edit its animations.`}
                />
            );
        }

        return (
            <div style={{ width: "100%", height: "100%" }}>
                {noAnimatable}
                <div className={Classes.FILL} key="documentation-toolbar" style={{ width: "100%", height: "25px", backgroundColor: "#333333", borderRadius: "10px", marginTop: "5px", visibility: (this.state.selectedAnimatable ? "visible" : "hidden") }}>
                    <ButtonGroup className={Classes.DARK}>
                        <Button small={true} disabled={!this.state.selectedAnimation || this.state.animatable !== null} text="Play" icon="play" onClick={() => this._handlePlayAnimation()} />
                        <Button small={true} disabled={this.state.animatable === null} text="Stop" icon="stop" onClick={() => this._handleStopAnimation()} />
                        <Divider />
                        <Button small={true} text="Edit..." icon={<Icon src="edit.svg" />} onClick={() => this._handleEditAnimation()} />
                        <Divider />
                        <Button small={true} text="Add Key" icon="key" onClick={() => this._handleAddKey()}  />
                        <Divider />
                    </ButtonGroup>
                    <ButtonGroup style={{ float: "right" }}>
                        <Select
                            items={[SyncType.Animation, SyncType.Object, SyncType.Scene]}
                            text={`Sync type: ${this.state.synchronizationType}`}
                            onChange={(v) => this._handleSyncTypeChanged(SyncType[v])}
                        />
                    </ButtonGroup>
                </div>
                <Collapse isOpen={this.state.animatonsListOpened} transitionDuration={200}>
                    <div style={{ width: "300px", height: "100%", float: "left", background: "#333333" }}>
                        <AnimationsPanel
                            selectedAnimatable={this.state.selectedAnimatable}
                            onSelectedAnimation={(a, dblClick) => this._handleSelectedAnimation(a, dblClick)}
                        />
                    </div>
                </Collapse>
                <div style={{ width: (this.state.animatonsListOpened ? "calc(100% - 300px)" : "100%"), height: "calc(100% - 30px)", visibility: (this.state.selectedAnimatable ? "visible" : "hidden"), float: "left" }}>
                    <div style={{ position: "absolute", width: "30px", height: "100%", float: "left" }}>
                        <ButtonGroup vertical={true} fill={true} style={{ maxWidth: "50px" }}>
                            <Button fill={true} icon="list" onClick={() => this.setState({ animatonsListOpened: !this.state.animatonsListOpened })} />
                        </ButtonGroup>
                    </div>
                    <div style={{ position: "relative", width: "calc(100% - 50px)", height: "100%", marginLeft: "55px" }}>
                        <Tabs
                            selectedTabId={this.state.selectedTab}
                            renderActiveTabPanelOnly={false}
                            onChange={(selectedTab) => this.setState({ selectedTab })}
                        >
                            <Tab
                                id={SelectedTab.Timeline}
                                title="Timeline"
                                panel={
                                    <div style={{ position: "absolute", width: "calc(100% - 10px)", height: "calc(100% - 50px)" }}>
                                        <TimelineEditor ref={this._refHandler.getTimelineEditor} editor={this.editor} />
                                    </div>
                                }
                            />
                            <Tab
                                id={SelectedTab.Graph}
                                title="Graph"
                                panel={
                                    <div style={{ position: "absolute", width: "calc(100% - 10px)", height: "calc(100% - 50px)" }}>
                                        <ChartEditor ref={this._refHandler.getChartEdior} editor={this.editor} synchronizationType={this.state.synchronizationType} />
                                    </div>
                                }
                            />
                        </Tabs>
                    </div>
                </div>
            </div>
        );
    }

    /**
     * Called on the plugin is ready.
     */
    public onReady(): void {
        // Register events
        this._selectedObjectObserver = this.editor.selectedNodeObservable.add((n) => this._handleNodeSelected(n));
    }

    /**
     * Called on the plugin is closed.
     */
    public onClose(): void {
        // Reset all
        this._chartEditor?.resetObjectToFirstFrame();

        // Remove event listeners
        this.editor.selectedNodeObservable.remove(this._selectedObjectObserver);
    }

    /**
     * Called on the panel has been resized.
     * @param width the new with of the plugin's panel.
     * @param height the new height of the plugin's panel.
     */
    public resize(width: number, height: number): void {
        this._timelineEditor?.resize(width, height);
    }

    /**
     * Called on the user changes the synchronzation type.
     */
    private _handleSyncTypeChanged(synchronizationType: SyncType): void {
        this.setState({ synchronizationType });
    }

    /**
     * Called on the user selected a node.
     */
    private _handleNodeSelected(node: Node): void {
        if (this.state.selectedAnimatable === node) {
            return;
        }

        this._chartEditor?.resetObjectToFirstFrame();

        this.setState({ selectedAnimatable: node });

        this._chartEditor?.setAnimatable(node);
        this._handleSelectedAnimation(node.animations[0] ?? null, true);
    }

    /**
     * Called on the user selects an animation.
     */
    private _handleSelectedAnimation(animation: Nullable<Animation>, doubleClick: boolean): void {
        this._chartEditor?.setAnimation(animation, true);

        this.setState({ selectedAnimation: animation, animatonsListOpened: !doubleClick });
    }

    /**
     * Called on the user wants to play the animation.
     */
    private _handlePlayAnimation(): void {
        if (!this.state.selectedAnimatable || !this.state.selectedAnimation || !this._chartEditor) { return; }

        const range = AnimationTools.GetKeysRange(this.state.selectedAnimation);

        let startFrame = this._chartEditor.getCurrentFrameValue();
        if (startFrame === null || startFrame === range.maxFrame) {
            startFrame = 0;
        }

        let animatable: Nullable<Animatable> = null;
        switch (this.state.synchronizationType) {
            case SyncType.Animation:
                animatable = this.editor.scene!.beginDirectAnimation(this.state.selectedAnimatable, [this.state.selectedAnimation], Math.max(range.minFrame, startFrame), range.maxFrame, false, 1.0, () => {
                    this.setState({ animatable: null });
                });
                break;
            case SyncType.Object:
                animatable = this.editor.scene!.beginAnimation(this.state.selectedAnimatable, Math.max(range.minFrame, startFrame), range.maxFrame, false, 1.0, () => {
                    this.setState({ animatable: null });
                });
                break;
        }

        if (!animatable) { return; }

        this._chartEditor.playAnimation(startFrame);
        this.setState({ animatable });
    }

    /**
     * Called on the user wants to stop the animation.
     */
    private _handleStopAnimation(): void {
        if (!this.state.animatable || !this.state.selectedAnimatable) { return; }

        this.state.animatable.stop();
        this.editor.scene!.stopAnimation(this.state.selectedAnimatable);

        if (this._chartEditor) {
            this._chartEditor.stopAnimation();
        }

        this.setState({ animatable: null });
    }

    /**
     * Called on the user wants to edit the animation.
     */
    private _handleEditAnimation(): void {
        if (!this.state.selectedAnimation) { return; }

        this.editor.inspector.setSelectedObject(new AnimationObject(this.state.selectedAnimation, () => {
            // Nothing to do at the moment
        }));
    }

    /**
     * Called on the user wants to add a new key.
     */
    private _handleAddKey(): void {
        if (!this._chartEditor || !this.state.selectedAnimatable?.animations || !this.state.selectedAnimation) { return; }

        const frame = this._chartEditor.getCurrentFrameValue();
        if (frame === null) { return; }

        let animations: Animation[] = [];
        switch (this.state.synchronizationType) {
            case SyncType.Animation:
                animations = [this.state.selectedAnimation];
                break;
            
            case SyncType.Object:
                animations = this.state.selectedAnimatable.animations;
                break;
        }

        for (const animation of animations) {
            const property = Tools.GetProperty<any>(this.state.selectedAnimatable, animation.targetProperty);
            if (property === null) { return; }
            
            const keys = animation.getKeys();
            const existingKey = keys.find((k) => k.frame === frame);

            let value: unknown = null;
            switch (animation.dataType) {
                case Animation.ANIMATIONTYPE_FLOAT:
                    value = property;
                    break;

                case Animation.ANIMATIONTYPE_VECTOR2:
                case Animation.ANIMATIONTYPE_VECTOR3:
                case Animation.ANIMATIONTYPE_COLOR3:
                case Animation.ANIMATIONTYPE_COLOR4:
                    value = property.clone();
                    break;
            }

            if (value === null) { return; }

            if (existingKey) {
                existingKey.value = value;
            } else {
                keys.push({ frame, value });
                keys.sort((a, b) => a.frame - b.frame);
            }
        }

        this._handleSelectedAnimation(this.state.selectedAnimation, true);
    }
}
