import EventsEmitter from '../EventsEmitter'

export default class ExtensionBase extends
    EventsEmitter.Composer(Autodesk.Viewing.Extension) {
    constructor(viewer, options = {}) {
        super(viewer, options)
        this._viewer = viewer
        this._options = options
        this._events = {}
    }
    /**
     * Extension Id
     * @returns {string}
     */
    static get ExtensionId() { return 'Viewing.Extension.Base' }

    static guid(format = 'xxxxxxxxxx') {
        var d = new Date().getTime()
        var guid = format.replace(
            /[xy]/g,
            function (c) {
                var r = (d + Math.random() * 16) % 16 | 0
                d = Math.floor(d / 16)
                return (c == 'x' ? r : (r & 0x7 | 0x8)).toString(16)
            })

        return guid
    }
    /**
     * Load callback
     * @returns {boolean}
     */
    load() { return true }
    /**
    * Unload callback
    * @returns {boolean}
    */
    unload() { return true }
}

