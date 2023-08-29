import EventsEmitter from '../components/EventsEmitter'
import TranslateTool from './Viewing.Tool.Translate'
import RotateTool from './Viewing.Tool.Rotate'

import ExtensionBase from '../components/Viewer.ExtensionBase'
import ViewerToolkit from '../components/Viewer.Toolkit'

const ToolState = Object.freeze({
    NONE: null,
    TRANSLATE: 'toolbar-translate',
    ROTATE: 'toolbar-rotate',
})

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

        this._panel = new TransformPanel(viewer, this)

        this.ToolState = ToolState
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
                this._panel.toggleState(this._toolState)
                break;
            case this.ToolState.ROTATE:
                this._comboCtrl.setToolTip(this._rxControl.getToolTip())
                this._comboCtrl.icon.className = this._rxControl.icon.className
                this._panel.toggleState(this._toolState)
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
     * get transform tool name by ToolState
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
     * @param {boolean} absolute if true that set absolute position, default is false
     * @returns {Promise<boolean>}
     * @example
     * let ext = viewer.getExtension('Viewing.Extension.Transform')
     * ext.translate([1],new THREE.Vector3(20,2,2))
     */
    async translate(dbIds, pos, absolute = false) {
        if (!pos || !(pos instanceof THREE.Vector3)) return false
        let _dbIds = dbIds
        if (!Array.isArray(_dbIds) || _dbIds.length == 0) return false
        else if (typeof dbIds === 'string') { _dbIds = [parseInt(dbIds)] }
        else if (typeof dbIds === 'number') { _dbIds = [dbIds] }
        if (absolute) {
            return await this.translateTool.changeWorld(viewer.model, _dbIds, pos)
        }
        else {
            return await this.translateTool.change(viewer.model, _dbIds, pos)
        }
    }
    /**
     * translate AggregateSelection programmatically
     * @param {Object[]} selections 
     * @param {THREE.Vector3} pos 
     * @param {boolean} absolute if true that set absolute position, default is false
     * @returns {Promise<boolean>}
     * @example
     * let ext = viewer.getExtension('Viewing.Extension.Transform')
     * ext.aggregateTranslate(viewer.getAggregateSelection(),new THREE.Vector3(20,2,2))
     */
    async aggregateTranslate(selections, pos, absolute = false) {
        if (!pos || !(pos instanceof THREE.Vector3)) return false
        if (!Array.isArray(selections) || selections.length == 0) return false
        var b = selections.map(({ model, selection }) => {
            if (!model) return false
            if (!Array.isArray(selection) || selection.length == 0) return false
            if (absolute) {
                return this.translateTool.changeWorld(model, selection, pos)
            }
            else {
                return this.translateTool.change(model, selection, pos)
            }
        });
        var p = await Promise.all(b)
        return p.every(e => e)
    }
    /**
     * rotate dbIds programmatically
     * @param {number[]} dbIds 
     * @param {THREE.Vector3} axis 
     * @param {number} angle radians
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
    /**
     * rotate AggregateSelection programmatically
     * @param {Object[]} selections 
     * @param {THREE.Vector3} axis 
     * @param {number} angle radians
     * @param {boolean | THREE.Vector3} center if true that apply individual center, else if false apply median center, else give a point to apply custom center
     * @returns {Promise<boolean>}
     */
    async aggregateRotate(selections, axis, angle = 0, center = false) {
        if (!axis || !(axis instanceof THREE.Vector3)) return false
        if (!Array.isArray(selections) || selections.length == 0) return false
        var b = selections.map(async ({ model, selection }) => {
            if (!model) return false
            if (!Array.isArray(selection) || selection.length == 0) return false

            var _center = center
            if (_center === true) {
                var b = selection.map((dbId) => {
                    var cen = ViewerToolkit.getBoundingBox(dbId, model).getCenter()
                    return this.rotateTool.change(model, [dbId], axis, angle, cen)
                })
                var p = await Promise.all(b)
                return p.every(e => e)
            }
            else if (_center === false) {
                _center = selection.reduce((bbox, dbId) => {
                    bbox.union(ViewerToolkit.getBoundingBox(dbId, model))
                    return bbox
                }, new THREE.Box3()).getCenter()
                return this.rotateTool.change(model, selection, axis, angle, _center)
            }
            else {
                return this.rotateTool.change(model, selection, axis, angle, _center)
            }
        });
        var p = await Promise.all(b)
        return p.every(e => e)
    }
}

class TransformPanel extends EventsEmitter.Composer(Autodesk.Viewing.UI.DockingPanel) {
    constructor(viewer, ext, options) {
        super(viewer.container, 'Transform-Panel', 'TranslatePanel', options)
        this.viewer = viewer
        this.ext = ext
        this.container.style.left = 24 + 'px'
        this.container.style.bottom = 24 + 'px'
        this.container.style.width = 260 + 'px'
        this.container.style.height = 240 + 'px'

        //tool
        this.txTool = this.ext.translateTool
        this.rxTool = this.ext.rotateTool

        //transform save
        this.selection = null
        this.translation = new THREE.Vector3()
        this.rotation = new THREE.Vector3()
        this.center = new THREE.Vector3()

        //control inputs
        this.controls = {
            translation: {
                x: this.scrollContainer.querySelector('#translate-x'),
                y: this.scrollContainer.querySelector('#translate-y'),
                z: this.scrollContainer.querySelector('#translate-z'),
                a: this.scrollContainer.querySelector('#translate-absolute'),
            },
            rotation: {
                x: this.scrollContainer.querySelector('#rotate-x'),
                y: this.scrollContainer.querySelector('#rotate-y'),
                z: this.scrollContainer.querySelector('#rotate-z'),
            }
        }
        this._tbodys = {
            translation: this.scrollContainer.querySelector('#translate-table'),
            rotation: this.scrollContainer.querySelector('#rotate-table')
        }

        this.addEvent()
    }
    initialize() {
        this.title = this.createTitleBar('Translate');
        this.title.style = 'height: 1.25em;position: absolute;width: 100%;'
        this.container.appendChild(this.title);
        this.initializeMoveHandlers(this.title);

        this.closer = this.createCloseButton();
        this.container.appendChild(this.closer);

        this.scrollContainer = this.createScrollContainer()
        this.scrollContainer.style = 'padding-top: 3.46em;padding-bottom: 20px;box-sizing: border-box;'
        this.container.appendChild(this.scrollContainer);

        this.scrollContainer.innerHTML = `
            <div class="settings-tabs-tables-container">
                <table class="adsk-lmv-tftable settings-selected-table settings-table" style="padding: 0.75rem;width:auto;">
                    <tbody style="display: table; width: 100%;" id="translate-table">
                        <tr>
                            <td><label for="translate-x">x</label></td>
                            <td><input type="number" step="1" id="translate-x" value="0"></td>
                            <td></td>
                        </tr>
                        <tr>
                            <td><label for="translate-y">y</label></td>
                            <td><input type="number" step="1" id="translate-y" value="0"></td>
                            <td></td>
                        </tr>
                        <tr>
                            <td><label for="translate-z">z</label></td>
                            <td><input type="number" step="1" id="translate-z" value="0"></td>
                            <td></td>
                        </tr>
                        <tr>
                            <td colspan="3">
                                <label for="translate-absolute" style="display:inline-block; margin-right:12px;">Absolute</label>
                                <label class="switch" style="height:auto; pointer-events: auto;"><input type="checkbox" id="translate-absolute"><div class="slider"></div></label>
                            </td>
                        </tr>
                    </tbody>
                    <tbody style="display: table; width: 100%;" id="rotate-table">
                        <tr>
                            <td><label for="rotate-x">x</label></td>
                            <td><input type="number" step="1" id="rotate-x" value="0"></td>
                            <td></td>
                        </tr>
                        <tr>
                            <td><label for="rotate-y">y</label></td>
                            <td><input type="number" step="1" id="rotate-y" value="0"></td>
                            <td></td>
                        </tr>
                        <tr>
                            <td><label for="rotate-z">z</label></td>
                            <td><input type="number" step="1" id="rotate-z" value="0"></td>
                            <td></td>
                        </tr>
                    </tbody>
                </table>
            </div>`


        if (this.options.addFooter) {
            this.footer = this.createFooter();
            this.footer.lastElementChild.style.display = 'none'
            this.container.appendChild(this.footer);
        }
    }
    addEvent() {
        var isTranslationAbsolute = false

        //txTool
        this.txTool.on('transform.translate.modelSelected', (selection) => {
            this.translation = new THREE.Vector3()
            this.center = this.txTool._transformControlTx.position
            this.setTranslation()
            this.selection = selection
            this.toggleState(ToolState.TRANSLATE)
            this.setVisible(true)
        })
        const updateTranslation = () => {
            if (isTranslationAbsolute) {
                this.setTranslation(this.center)
            }
            else {
                this.setTranslation(this.translation)
            }
        }
        this.txTool.on('transform.translate.change', (data) => {
            this.center = this.txTool._transformControlTx.position
            this.translation = data.translation
            updateTranslation()
        })
        this.txTool.on('transform.translate.clearSelection', () => {
            this.translation = new THREE.Vector3()
            this.setTranslation()
            this.selection = null
            this.setVisible(false)
        })

        const txInputChange = () => {
            let t = this.getTranslation()

            if (isTranslationAbsolute) {
                this.txTool.changeWorld(this.selection.model, this.selection.dbIdArray, t)
                this.txTool._transformControlTx.setPosition(t)
                this.translation = this.txTool._transformMesh.position.clone().sub(this.selection.model.offset)
            }
            else {
                let pos = t.clone().sub(this.translation)
                this.txTool.change(this.selection.model, this.selection.dbIdArray, pos)
                this.txTool._transformControlTx.setPosition(
                    t.clone().add(this.selection.model.offset))
                this.translation = this.getTranslation()
            }
        }
        this._tbodys.translation.querySelectorAll('input[type=number]').forEach((txi) => {
            txi.addEventListener('change', txInputChange)
            txi.addEventListener('keyup', txInputChange)
            txi.addEventListener('input', txInputChange)
            txi.addEventListener('paste', txInputChange)
        })
        this.controls.translation.a.addEventListener('change', (event) => {
            isTranslationAbsolute = event.target.checked
            updateTranslation()
        })

        //rxTool
        this.rxTool.on('transform.rotate.modelSelected', (selection) => {
            console.log('transform.rotate.modelSelected')
            this.rotation = new THREE.Vector3()
            this.setRotation()
            this.selection = selection
            this.toggleState(ToolState.ROTATE)
            this.setVisible(true)
        })
        this.rxTool.on('transform.rotate.change', (data) => {
            console.log(data)
            //data.model.transform.rotation = data.rotation
            this.setRotation({
                x: (data.rotation.x * 180 / Math.PI) % 360,
                y: (data.rotation.y * 180 / Math.PI) % 360,
                z: (data.rotation.z * 180 / Math.PI) % 360
            })
        })
        this.rxTool.on('transform.rotate.clearSelection', () => {
            this.rotation = new THREE.Vector3()
            this.setRotation()
            this.selection = null
            this.setVisible(false)
        })
        const rxInputChange = () => {
            let r = this.getRotation()
        }
        this._tbodys.rotation.querySelectorAll('input[type=number]').forEach((rxi) => {
            rxi.addEventListener('change', rxInputChange)
            rxi.addEventListener('keyup', rxInputChange)
            rxi.addEventListener('input', rxInputChange)
            rxi.addEventListener('paste', rxInputChange)
        })

        //close panel
        this.on('close', () => {
            this.selection = null
            this.translation = new THREE.Vector3()
            this.rotation = new THREE.Vector3()
            this.center = new THREE.Vector3()
            this.setTranslation()
            this.setRotation()
            this.ext._txControl.setState(Autodesk.Viewing.UI.Button.State.INACTIVE)
            this.ext._rxControl.setState(Autodesk.Viewing.UI.Button.State.INACTIVE)
            this.setVisible(false)
        })
    }
    toggleState(state) {
        Object.values(this._tbodys).forEach((tbody) => {
            tbody.style.display = 'none'
        })
        switch (state) {
            case ToolState.TRANSLATE:
                this._tbodys.translation.style.display = null
                break;
            case ToolState.ROTATE:
                this._tbodys.rotation.style.display = null
                break;
        }
    }
    getTranslation() {
        var x = parseFloat(this.controls.translation.x.value)
        var y = parseFloat(this.controls.translation.y.value)
        var z = parseFloat(this.controls.translation.z.value)

        x = isNaN(x) ? 0.0 : x
        y = isNaN(y) ? 0.0 : y
        z = isNaN(z) ? 0.0 : z

        //when input is NaN or empty, show value 0
        this.controls.translation.x.value = x
        this.controls.translation.y.value = y
        this.controls.translation.z.value = z

        return new THREE.Vector3(x, y, z)
    }
    setTranslation(pos = new THREE.Vector3(0, 0, 0)) {
        this.controls.translation.x.value = pos.x
        this.controls.translation.y.value = pos.y
        this.controls.translation.z.value = pos.z
    }
    getRotation() {
        var x = parseFloat(this.controls.rotation.x.value)
        var y = parseFloat(this.controls.rotation.y.value)
        var z = parseFloat(this.controls.rotation.z.value)

        x = isNaN(x) ? 0.0 : x
        y = isNaN(y) ? 0.0 : y
        z = isNaN(z) ? 0.0 : z

        //when input is NaN or empty, show value 0
        this.controls.rotation.x.value = x
        this.controls.rotation.y.value = y
        this.controls.rotation.z.value = z

        return new THREE.Vector3(x, y, z)
    }
    setRotation(r = new THREE.Vector3(0, 0, 0)) {
        this.controls.rotation.x.value = r.x
        this.controls.rotation.y.value = r.y
        this.controls.rotation.z.value = r.z
    }
}

Autodesk.Viewing.theExtensionManager.registerExtension(TransformExtension.ExtensionId, TransformExtension)
