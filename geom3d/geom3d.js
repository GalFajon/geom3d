// dependencies
import { viewer } from "./src/misc/DependencyManager";

// layers
import { PointcloudLayer } from "./src/layers/PointcloudLayer";
import { GeometryLayer } from "./src/layers/GeometryLayer";
import { OverlayLayer } from "./src/layers/OverlayLayer";

// overlay
import { Overlay } from './src/overlay/Overlay';

// geometry
import { Line } from "./src/geometry/Line";
import { Polygon } from './src/geometry/Polygon';
import { Point } from './src/geometry/Point';

//interactions
import { Draw } from "./src/interactions/Draw";
import { Snap } from "./src/interactions/Snap";
import { Modify } from "./src/interactions/Modify";

// support classes
import { View } from "./src/View";
import { NoCloudControls } from "./src/misc/noCloudControls";

let currentView = null;

export async function initialize(config) {
    if (!config) config = {};
    if (!config.viewer) {
        config.viewer = {}
        if (!config.viewer.FOV) config.viewer.FOV = 60;
        if (!config.viewer.pointBudget) config.viewer.pointBudget = 1000000;
        if (!config.viewer.background) config.viewer.background = 'black';
        if (!config.viewer.EDL) config.viewer.EDL = false;
    }

    initializeViewer(config);

    if (config.view) {
        currentView = config.view;
        await config.view.initialize();
    }

}

async function initializeViewer(config) {
    return new Promise((resolve, reject) => {
        viewer.setEDLEnabled(config.viewer.EDL ?? false);
        viewer.setFOV(config.viewer.FOV ?? 60);
        viewer.setPointBudget(config.viewer.pointBudget ?? 1000000);
        viewer.setBackground(config.viewer.background ?? 'black');
        viewer.setControls(new NoCloudControls(viewer));
        viewer.loadSettingsFromURL();
        viewer.setDescription("");

        viewer.loadGUI(() => {
            viewer.setLanguage('en');
            $("#menu_tools").next();
            $("#menu_clipping").next();
            viewer.fitToScreen();
            resolve();
        });
    })

}

// add namespaces
export {
    PointcloudLayer, GeometryLayer, OverlayLayer,
    Overlay,
    Line, Polygon, Point,
    Draw, Snap, Modify,
    View
}