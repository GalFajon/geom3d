export class Layer {
    attached = false;

    attach() { throw "Attach function must be overridden." }
    detach() { throw "Detach function must be overridden." }

    show() { throw "Show function must be overridden." }
    hide() { throw "Hide function must be overridden." }
    updateVisibility() { throw "Visibility update function must be overridden." }
}