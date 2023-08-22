/////////////////////////////////////////////////////////////////////
// Viewing.Extension.CSSTVExtension
// by Philippe Leefsma, April 2016
//
/////////////////////////////////////////////////////////////////////
import TranslateTool from './Viewing.Tool.Translate'
import RotateTool from './Viewing.Tool.Rotate'

import ExtensionBase from '../components/Viewer.ExtensionBase'
import ViewerToolkit from '../components/Viewer.Toolkit'

class TransformExtension extends ExtensionBase {
    constructor(viewer, options = {}) {
        super(viewer, options)
        this.keys = {}
        this.translateTool = new TranslateTool(viewer)
        this._viewer.toolController.registerTool(this.translateTool)

        this.rotateTool = new RotateTool(viewer)
        this._viewer.toolController.registerTool(this.rotateTool)

        this.State = Object.freeze({
            NONE: null,
            TRANSLATE: 'toolbar-translate',
            ROTATE: 'toolbar-rotate',
        })
        this._state = this.State.TRANSLATE
    }

    static get ExtensionId() { return 'Viewing.Extension.Transform' }

    load() {
        this.translateTool.handleKeyUp = (event, keyCode)=>{
            if (this.translateTool.keys[event.key] == true){
                switch(event.key){
                    case 'r':
                        this.onClickRx()
                    break
                }
            }
            this.translateTool.keys[event.key] = false
            return false
        }
        this.rotateTool.handleKeyUp = (event, keyCode)=>{
            if (this.rotateTool.keys[event.key] == true){
                switch(event.key){
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
    }

    onToolbarCreated(_toolbar) {
        this._txControl = ViewerToolkit.createButton(
            this.State.TRANSLATE,
            'fa fa-arrows-alt',
            'Translate Tool (G)',
            this.onClickTx.bind(this))

        this._rxControl = ViewerToolkit.createButton(
            this.State.ROTATE,
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
    }

    onStateChange(event) {
        switch (event.state) {
            case Autodesk.Viewing.UI.Button.State.ACTIVE:
                //console.log('ACTIVE', this._comboCtrl.getId())
                this._comboCtrl.subMenu.getControl(this._state).setState(event.state)
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
        switch (this._state) {
            case this.State.TRANSLATE:
                this._comboCtrl.setToolTip(this._txControl.getToolTip())
                this._comboCtrl.icon.className = this._txControl.icon.className
                break;
            case this.State.ROTATE:
                this._comboCtrl.setToolTip(this._rxControl.getToolTip())
                this._comboCtrl.icon.className = this._rxControl.icon.className
                break;
        }
    }

    onClickTx() {
        if (this.translateTool.active) {
            this._txControl.setState(Autodesk.Viewing.UI.Button.State.INACTIVE)

        } else {
            this._state = this.State.TRANSLATE
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
            this._state = this.State.ROTATE
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
}

Autodesk.Viewing.theExtensionManager.registerExtension(TransformExtension.ExtensionId, TransformExtension)
