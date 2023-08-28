import TranslateTool from './Viewing.Tool.Translate'
import RotateTool from './Viewing.Tool.Rotate'

import ExtensionBase from '../components/Viewer.ExtensionBase'
import ViewerToolkit from '../components/Viewer.Toolkit'

class TransformExtension extends ExtensionBase {
    constructor(viewer, options = {}) {
        super(viewer,
            Object.assign({
                parentControl: null,
                collapsed: false
            }, options))
        this.keys = {}
        this.translateTool = new TranslateTool(viewer)
        this._viewer.toolController.registerTool(this.translateTool)

        this.rotateTool = new RotateTool(viewer)
        this._viewer.toolController.registerTool(this.rotateTool)

        this.ToolState = Object.freeze({
            NONE: null,
            TRANSLATE: 'toolbar-translate',
            ROTATE: 'toolbar-rotate',
        })
        this._toolState = this.ToolState.TRANSLATE
    }

    static get ExtensionId() { return 'Viewing.Extension.Transform' }

    load() {
        this.translateTool.handleKeyUp = (event, keyCode) => {
            if (this.translateTool.keys[event.key] == true) {
                switch (event.key) {
                    case 'r':
                        this.onClickRx()
                        break
                }
            }
            this.translateTool.keys[event.key] = false
            return false
        }
        this.rotateTool.handleKeyUp = (event, keyCode) => {
            if (this.rotateTool.keys[event.key] == true) {
                switch (event.key) {
                    case 'g':
                        this.onClickTx()
                        break
                }
            }
            this.rotateTool.keys[event.key] = false
            return false
        }
        return this.viewer && true
    }

    unload() {
        this.parentControl.removeControl(this._comboCtrl)
        this._viewer.toolController.deactivateTool(this.translateTool.getName())
        this._viewer.toolController.deactivateTool(this.rotateTool.getName())
        this._viewer.toolController.deregisterTool(this.translateTool)
        this._viewer.toolController.deregisterTool(this.rotateTool)
    }

    onToolbarCreated(_toolbar) {
        this._txControl = ViewerToolkit.createButton(
            this.ToolState.TRANSLATE,
            'fa fa-arrows-alt',
            'Translate Tool (G)',
            this.onClickTx.bind(this))

        this._rxControl = ViewerToolkit.createButton(
            this.ToolState.ROTATE,
            'fa fa-refresh',
            'Rotate Tool (R)',
            this.onClickRx.bind(this))

        this.parentControl = this._options.parentControl

        if (!this.parentControl) {
            var viewerToolbar = this._viewer.getToolbar(true)
            this.parentControl = new Autodesk.Viewing.UI.ControlGroup('transform')
            viewerToolbar.addControl(this.parentControl)
        }

        this._comboCtrl = new Autodesk.Viewing.UI.ComboButton('transform-combo')
        this._comboCtrl.icon.style.fontSize = '24px'

        this.onToolStateChange()

        this._comboCtrl.addControl(this._txControl)
        this._comboCtrl.addControl(this._rxControl)

        this._comboCtrl.onClick = (e) => {
            //console.log('_comboCtrl onClick', this._comboCtrl.getState())
            if (this._comboCtrl.getState() == Autodesk.Viewing.UI.Button.State.ACTIVE) {
                this._comboCtrl.setState(Autodesk.Viewing.UI.Button.State.INACTIVE)
            } else {
                this._comboCtrl.setState(Autodesk.Viewing.UI.Button.State.ACTIVE)
            }
        }

        this._comboCtrl.addEventListener(
            Autodesk.Viewing.UI.Button.Event.STATE_CHANGED,
            this.onStateChange.bind(this)
        )

        this._txControl.addEventListener(
            Autodesk.Viewing.UI.Button.Event.STATE_CHANGED,
            (event) => {
                switch (event.state) {
                    case Autodesk.Viewing.UI.Button.State.ACTIVE:
                        this._viewer.toolController.activateTool(this.translateTool.getName())
                        this._viewer.toolController.deactivateTool(this.rotateTool.getName())
                        break;
                    case Autodesk.Viewing.UI.Button.State.INACTIVE:
                    case Autodesk.Viewing.UI.Button.State.DISABLED:
                        this._viewer.toolController.deactivateTool(this.translateTool.getName())
                        break;
                }
            }
        )

        this._rxControl.addEventListener(
            Autodesk.Viewing.UI.Button.Event.STATE_CHANGED,
            (event) => {
                switch (event.state) {
                    case Autodesk.Viewing.UI.Button.State.ACTIVE:
                        this._viewer.toolController.activateTool(this.rotateTool.getName())
                        this._viewer.toolController.deactivateTool(this.translateTool.getName())
                        break;
                    case Autodesk.Viewing.UI.Button.State.INACTIVE:
                    case Autodesk.Viewing.UI.Button.State.DISABLED:
                        this._viewer.toolController.deactivateTool(this.rotateTool.getName())
                        break;
                }
            }
        )

        this.parentControl.addControl(this._comboCtrl)

        if (this._options.collapsed == true) {
            this.parentControl.setCollapsed(true)
        }
    }

    onStateChange(event) {
        switch (event.state) {
            case Autodesk.Viewing.UI.Button.State.ACTIVE:
                //console.log('ACTIVE', this._comboCtrl.getId())
                this._comboCtrl.subMenu.getControl(this._toolState).setState(event.state)
                break;
            case Autodesk.Viewing.UI.Button.State.INACTIVE:
            case Autodesk.Viewing.UI.Button.State.DISABLED:
                //console.log('INACTIVE', this._comboCtrl.getId())
                this._txControl.setState(Autodesk.Viewing.UI.Button.State.INACTIVE)
                this._rxControl.setState(Autodesk.Viewing.UI.Button.State.INACTIVE)
                break;
        }
    }

    onToolStateChange() {
        switch (this._toolState) {
            case this.ToolState.TRANSLATE:
                this._comboCtrl.setToolTip(this._txControl.getToolTip())
                this._comboCtrl.icon.className = this._txControl.icon.className
                break;
            case this.ToolState.ROTATE:
                this._comboCtrl.setToolTip(this._rxControl.getToolTip())
                this._comboCtrl.icon.className = this._rxControl.icon.className
                break;
        }
    }

    onClickTx() {
        if (this.translateTool.active) {
            this._txControl.setState(Autodesk.Viewing.UI.Button.State.INACTIVE)

        } else {
            this._toolState = this.ToolState.TRANSLATE
            const _selection = viewer.getAggregateSelection()

            this.onToolStateChange()
            this._txControl.setState(Autodesk.Viewing.UI.Button.State.ACTIVE)

            if (_selection.length !== 0) {
                this.viewer.setAggregateSelection(
                    _selection.map(({ model, selection }) => ({ model, ids: selection }))
                )
            }
        }
    }

    onClickRx() {
        if (this.rotateTool.active) {
            this._rxControl.setState(Autodesk.Viewing.UI.Button.State.INACTIVE)

        } else {
            this._toolState = this.ToolState.ROTATE
            const _selection = viewer.getAggregateSelection()

            this.onToolStateChange()
            this._rxControl.setState(Autodesk.Viewing.UI.Button.State.ACTIVE)

            if (_selection.length !== 0) {
                this.viewer.setAggregateSelection(
                    _selection.map(({ model, selection }) => ({ model, ids: selection }))
                )
            }
        }
    }
    /**
     * 
     * @param {TransformExtension.ToolState} state 
     * @returns {string} tool name
     */
    getToolName(state) {
        switch (state) {
            case this.ToolState.TRANSLATE: return this.translateTool.getName()
            case this.ToolState.ROTATE: return this.rotateTool.getName()
        }
        return null
    }
    /**
     * get transform tool by ToolState
     * @param {TransformExtension.ToolState} state 
     * @returns {TransformTool | RotateTool}
     * @example
     * let ext = viewer.getExtension('Viewing.Extension.Transform')
     * ext.getTool(ext.ToolState.TRANSLATE)
     */
    getTool(state) {
        switch (state) {
            case this.ToolState.TRANSLATE: return this.translateTool
            case this.ToolState.ROTATE: return this.rotateTool
        }
        return null
    }
    /**
     * translate dbIds programmatically
     * @param {number[]} dbIds 
     * @param {THREE.Vector3} pos 
     * @returns {Promise<boolean>}
     * @example
     * let ext = viewer.getExtension('Viewing.Extension.Transform')
     * ext.translate([1],new THREE.Vector3(20,2,2))
     */
    async translate(dbIds, pos) {
        if (!pos || !(pos instanceof THREE.Vector3)) return false
        let _dbIds = dbIds
        if (!Array.isArray(_dbIds) || _dbIds.length == 0) return false
        else if (typeof dbIds === 'string') { _dbIds = [parseInt(dbIds)] }
        else if (typeof dbIds === 'number') { _dbIds = [dbIds] }
        return await this.translateTool.change(viewer.model, _dbIds, pos)
    }
    /**
     * translate AggregateSelection programmatically
     * @param {Object[]} selections 
     * @param {THREE.Vector3} pos 
     * @returns {Promise<boolean>}
     * @example
     * let ext = viewer.getExtension('Viewing.Extension.Transform')
     * ext.aggregateTranslate(viewer.getAggregateSelection(),new THREE.Vector3(20,2,2))
     */
    async aggregateTranslate(selections, pos) {
        if (!pos || !(pos instanceof THREE.Vector3)) return false
        if (!Array.isArray(selections) || selections.length == 0) return false
        var b = selections.map(({ model, selection }) => {
            if (!model) return false
            if (!Array.isArray(selection) || selection.length == 0) return false
            return this.translateTool.change(model, selection, pos)
        });
        var p = await Promise.all(b)
        return p.every(e => e)
    }
    /**
     * rotate dbIds programmatically
     * @param {number[]} dbIds 
     * @param {THREE.Vector3} axis 
     * @param {number} angle 
     * @param {boolean | THREE.Vector3} center if true that apply individual center, else if false apply median center, else give a point to apply custom center
     * @returns {Promise<boolean>}
     */
    async rotate(dbIds, axis, angle = 0, center = false) {
        if (!axis || !(axis instanceof THREE.Vector3)) return false
        let _dbIds = dbIds
        if (!Array.isArray(_dbIds) || _dbIds.length == 0) return false
        else if (typeof dbIds === 'string') { _dbIds = [parseInt(dbIds)] }
        else if (typeof dbIds === 'number') { _dbIds = [dbIds] }
        var _center = center
        if (_center === true) {
            var b = _dbIds.map((dbId) => {
                var cen = ViewerToolkit.getBoundingBox(dbId, viewer.model).getCenter()
                return this.rotateTool.change(viewer.model, [dbId], axis, angle, cen)
            })
            var p = await Promise.all(b)
            return p.every(e => e)
        }
        else if (_center === false) {
            _center = _dbIds.reduce((bbox, dbId) => {
                bbox.union(ViewerToolkit.getBoundingBox(dbId, viewer.model))
                return bbox
            }, new THREE.Box3()).getCenter()
            return await this.rotateTool.change(viewer.model, _dbIds, axis, angle, _center)
        }
        else {
            return await this.rotateTool.change(viewer.model, _dbIds, axis, angle, _center)
        }
    }
}

Autodesk.Viewing.theExtensionManager.registerExtension(TransformExtension.ExtensionId, TransformExtension)
