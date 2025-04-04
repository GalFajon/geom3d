import { EventDispatcher } from '../misc/EventDispatcher.js'
import { viewer } from '../misc/DependencyManager.js';

export class Interaction extends EventDispatcher {

    constructor() {
        super();

        this.parent = undefined;
        this.domElement = viewer.renderer.domElement;
    }

    initialize() {
        throw 'Must be overriden by child class';
    }
}