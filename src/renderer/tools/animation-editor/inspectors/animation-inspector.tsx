import { Inspector } from "../../../editor/components/inspector";
import { AbstractInspector } from "../../../editor/inspectors/abstract-inspector";

import { AnimationObject } from "../tools/animation-object";

export class AnimationObjectInspector extends AbstractInspector<AnimationObject> {
    /**
     * Called on a controller finished changes.
     * @override
     */
    public onControllerChange(): void {
        this.selectedObject.onChange(this.selectedObject.animation);
    }

    /**
     * Called on the component did moubnt.
     * @override
     */
    public onUpdate(): void {
        this._addCommon();
        this._addBlending();
    }

    /**
     * Adds the common editable properties.
     */
    private _addCommon(): void {
        const common = this.tool!.addFolder("Common");
        common.open();

        common.add(this.selectedObject.animation, "name").name("Name");
        common.add(this.selectedObject.animation, "framePerSecond").min(0).step(0.01).name("Frames Per Second");
    }

    /**
     * Adds the blending editable properties.
     */
    private _addBlending(): void {
        const blending = this.tool!.addFolder("Blending");
        blending.open();

        this.selectedObject.animation.enableBlending = this.selectedObject.animation.enableBlending ?? false;

        blending.add(this.selectedObject.animation, "enableBlending").name("Enable Blending");
        blending.add(this.selectedObject.animation, "blendingSpeed").step(0.01).name("Blending Speed");
    }
}

Inspector.RegisterObjectInspector({
    ctor: AnimationObjectInspector,
    ctorNames: ["AnimationObject"],
    title: "Animation",
});
