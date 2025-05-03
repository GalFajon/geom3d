import * as THREE from '../../public/dependencies/potree/build/libs/three.js/build/three.module.js';

export let Potree = null;
export let viewer = null;

export function initialize() {
    Potree = window.Potree;
    viewer = new Potree.Viewer(document.getElementById("potree_render_area"));
    window.viewer = viewer;
}

export { THREE };