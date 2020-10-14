import { Nullable } from "../../../shared/types";

import * as React from "react";
import { Button, NonIdealState, Divider, Callout, Intent, Tree, ITreeNode, Classes, IconName, ContextMenu, Menu, MenuItem, Tag } from "@blueprintjs/core";

import { Animation, IAnimatable } from "babylonjs";

import { Icon } from "../../editor/gui/icon";

import { undoRedo } from "../../editor/tools/undo-redo";

import { AddAnimation } from "./add-animation";

export interface IAnimationPanelProps {
    /**
     * Defines the reference to the selected animatable.
     */
    selectedAnimatable: Nullable<IAnimatable>;
    /**
     * Defines the callback called on the user selects an animation.
     */
    onSelectedAnimation: (animation: Nullable<Animation>, doubleClick: boolean) => void;
}

export interface IanimationPanelState {
    /**
     * Defines the list of all available animations.
     */
    animations: ITreeNode<Animation>[];
}

export class AnimationsPanel extends React.Component<IAnimationPanelProps, IanimationPanelState> {
    private _addAnimation: Nullable<AddAnimation> = null;
    private _refHandler = {
        getAddAnimation: (ref: AddAnimation) => this._addAnimation = ref,
    };

    /**
     * Constructor.
     * @param props defines the props of the component.
     */
    public constructor(props: IAnimationPanelProps) {
        super(props);

        this.state = {
            animations: [],
        };
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        if (!this.props.selectedAnimatable) {
            return null;
        }

        let noAnimation: React.ReactNode;
        let animationsList: React.ReactNode;

        if (!this.props.selectedAnimatable?.animations?.length) {
            noAnimation = (
                <NonIdealState
                    icon="search"
                    title="No animation."
                    description={`No animation available. To select and edit animations, please add at least one animation by clikcing on the button "Add..."`}
                />
            );
        } else {
            animationsList = (
                <>
                    <Tag fill={true}>Available animations:</Tag>
                    {/* <Divider style={{ backgroundColor: "#333333", borderRadius: "5px", paddingLeft: "3px" }}>Available Animations</Divider> */}
                    <Tree
                        className={Classes.ELEVATION_0}
                        contents={this._refreshAnimationsList()}
                        onNodeClick={(n) => this._handleNodeClick(n, false)}
                        onNodeDoubleClick={(n) => this._handleNodeClick(n, true)}
                        onNodeContextMenu={(n, _, e) => this._handleNodeContextMenu(n, e)}
                    />
                </>
            );
        }

        return (
            <>
                <Callout title="Actions" intent={Intent.PRIMARY}>
                    <Button text="Add..." small={true} fill={true} onClick={() => this._handleAddAnimation()} />
                </Callout>
                <Divider />
                <Callout title="Animations" icon="list">
                    {noAnimation}
                    {animationsList}
                </Callout>
                <AddAnimation ref={this._refHandler.getAddAnimation} onAnimationAdded={(a) => this._handleAnimationAdded(a)} />
            </>
        );
    }

    /**
     * Called on the user wants to add a new animation.
     */
    private async _handleAddAnimation(): Promise<void> {
        if (!this._addAnimation || !this.props.selectedAnimatable) { return; }

        this._addAnimation.showWithAnimatable(this.props.selectedAnimatable);
    }

    /**
     * Called on an animation has been added.
     */
    private _handleAnimationAdded(animation: Animation): void {
        this.props.onSelectedAnimation(animation, false);
        this.setState({ animations: this._refreshAnimationsList() });
    }

    /**
     * Refreshes the list of available animations.
     */
    private _refreshAnimationsList(): ITreeNode<Animation>[] {
        if (!this.props.selectedAnimatable) { return []; }

        const getIcon = (a: Animation): (React.ReactNode | IconName) => {
            switch (a.dataType) {
                case Animation.ANIMATIONTYPE_FLOAT: return "id-number" as IconName;
                case Animation.ANIMATIONTYPE_VECTOR2:
                case Animation.ANIMATIONTYPE_VECTOR3:
                    return <Icon src="arrows-alt.svg" />;
                default: return undefined;
            }
        };

        return this.props.selectedAnimatable.animations?.map((a, index) => ({
            id: index,
            label: a.name,
            secondaryLabel: <p style={{ marginBottom: "0px", opacity: 0.7 }}>({a.targetProperty})</p>,
            icon: getIcon(a),
            nodeData: a,
        } as ITreeNode<Animation>)) ?? [];
    }

    /**
     * Called on the user clicks on a node.
     */
    private _handleNodeClick(node: ITreeNode<Animation>, doubleClick: boolean): void {
        this.state.animations.forEach((n) => n.isSelected = false);
        node.isSelected = true;

        this.props.onSelectedAnimation(node.nodeData!, doubleClick);
        this.setState({ animations: this.state.animations });
    }

    /**
     * Called ont he user right-clicks on a node.
     */
    private _handleNodeContextMenu(node: ITreeNode<Animation>, ev: React.MouseEvent<HTMLElement, MouseEvent>): void {
        ContextMenu.show(
            <Menu>
                <MenuItem text="Remove" icon={<Icon src="times.svg" />} onClick={() => {
                    if (!this.props.selectedAnimatable?.animations) { return; }

                    const animation = node.nodeData;
                    const animatable = this.props.selectedAnimatable;

                    if (!animation || !animatable?.animations) { return; }

                    undoRedo.push({
                        common: () => this.setState({ animations: this._refreshAnimationsList() }),
                        undo: () => {
                            animatable.animations!.push(animation);
                            this.props.onSelectedAnimation(animation, true);
                        },
                        redo: () => {
                            const index = animatable.animations!.indexOf(animation);
                            if (index !== -1) {
                                animatable.animations!.splice(index, 1);
                                this.props.onSelectedAnimation(animatable.animations![0] ?? null, true);
                            }
                        },
                    });
                }} />
            </Menu>,
            { left: ev.nativeEvent.clientX, top: ev.nativeEvent.clientY },
        );
    }
}
