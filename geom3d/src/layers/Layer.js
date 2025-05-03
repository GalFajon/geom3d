import { EventDispatcher } from '../misc/EventDispatcher.js'

export class Layer extends EventDispatcher {
    attached = false;
    name = '';

    constructor(config) {
        super();
        this.name = config.name;
    }

    attach() { throw "Attach function must be overridden." }
    detach() { throw "Detach function must be overridden." }

    show() { throw "Show function must be overridden." }
    hide() { throw "Hide function must be overridden." }
    updateVisibility() { throw "Visibility update function must be overridden." }
}