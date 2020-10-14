import { Nullable } from "../../../../shared/types";

import { ChartDataSets } from "chart.js";

import { Animation } from "babylonjs";

export interface IAnimationRange {
    /**
     * Defines the minimum frame value.
     */
    minFrame: number;
    /**
     * Defines the maximum frame value.
     */
    maxFrame: number;
}

export class AnimationTools {
    /**
     * Converts the given animation to datasets to be drawn in the chart.
     * @param animation defines the animation to convert to dataset.
     */
    public static ConvertToDatasets(animation: Nullable<Animation>): ChartDataSets[] {
        const commonOptions: Partial<ChartDataSets> = {
            fill: false,
            showLine: true,
            pointRadius: 10,
            pointHitRadius: 10,
            borderWidth: 1,
            pointBorderColor: "#000000",
            lineTension: 0,
        };

        if (!animation) {
            return [{
                ...commonOptions,
            }];
        }

        switch (animation.dataType) {
            // Float
            case Animation.ANIMATIONTYPE_FLOAT:
                return [{
                    ...commonOptions,
                    label: animation.targetProperty,
                    borderColor: "#000000",
                    data: animation.getKeys().map((k) => ({
                        x: k.frame,
                        y: k.value,
                    })),
                }];

            // Vectors
            case Animation.ANIMATIONTYPE_VECTOR2:
            case Animation.ANIMATIONTYPE_VECTOR3:
                const vectorValues = animation.dataType === Animation.ANIMATIONTYPE_VECTOR2 ? ["x", "y"] : ["x", "y", "z"];
                const vectorColors = ["#ff0000", "#00ff00", "#0000ff"];
                return vectorValues.map((v, index) => ({
                    ...commonOptions,
                    label: v,
                    backgroundColor: vectorColors[index],
                    borderColor: vectorColors[index],
                    data: animation.getKeys().map((k) => ({
                        x: k.frame,
                        y: k.value[v],
                    })),
                }));

            // Colors
            case Animation.ANIMATIONTYPE_COLOR3:
            case Animation.ANIMATIONTYPE_COLOR4:
                const colorValues = animation.dataType === Animation.ANIMATIONTYPE_COLOR3 ? ["r", "g", "b"] : ["r", "g", "b", "a"];
                const colorColors = ["#ff0000", "#00ff00", "#0000ff", "#000000"];
                return colorValues.map((v, index) => ({
                    ...commonOptions,
                    label: v,
                    backgroundColor: colorColors[index],
                    borderColor: colorColors[index],
                    data: animation.getKeys().map((k) => ({
                        x: k.frame,
                        y: k.value[v],
                    })),
                }));

            default: return [];
        }
    }

    /**
     * Returns the range of animation (min frame and max frame).
     * @param animation defines the reference to the animation to get its range.
     */
    public static GetKeysRange(animation: Animation): IAnimationRange {
        const range: IAnimationRange = { minFrame: Number.MAX_VALUE, maxFrame: Number.MIN_VALUE };
        const keys = animation.getKeys();

        keys.forEach((k) => {
            if (k.frame > range.maxFrame) {
                range.maxFrame = k.frame;
            }

            if (k.frame < range.minFrame) {
                range.minFrame = k.frame;
            }
        });

        return range;
    }
}
