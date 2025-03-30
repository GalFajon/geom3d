import * as THREE from '../../public/dependencies/potree/build/libs/three.js/build/three.module.js';

export const Potree = window.Potree;
export const viewer = new Potree.Viewer(document.getElementById("potree_render_area"));
window.viewer = viewer;
export { THREE };