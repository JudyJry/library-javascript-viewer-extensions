import EventsEmitter from '../components/EventsEmitter'
import ViewerToolkit from '../components/Viewer.Toolkit'
import './TransformGizmos'

export default class TranslateTool extends EventsEmitter {
    constructor(viewer) {
        super()
        this.keys = {}

        this.active = false

        this.viewer = viewer

        this._hitPoint = null

        this._isDragging = false

        this.fullTransform = false

        this._transformMesh = null

        this._transformControlTx = null

        this._selectedFragProxyMap = {}

        this.onTxChange = this.onTxChange.bind(this)

        this.onAggregateSelectionChanged = this.onAggregateSelectionChanged.bind(this)

        this.onCameraChanged = this.onCameraChanged.bind(this)
    }

    getNames() { return ["Viewing.Translate.Tool"] }

    getName() { return "Viewing.Translate.Tool" }

    /**
     * Creates a dummy mesh to attach control to
     * @returns {THREE.Mesh}
     */
    createTransformMesh() {
        var material = new THREE.MeshPhongMaterial({ color: 0xff0000 })

        this.viewer.impl.matman().addMaterial(
            'transform-tool-material',
            material,
            true)

        var sphere = new THREE.Mesh(
            new THREE.SphereGeometry(0.0001, 5),
            material)

        sphere.position.set(0, 0, 0)

        return sphere
    }

    /**
     * on translation change
     */
    onTxChange() {
        if (this._isDragging && this._transformControlTx.visible) {
            var translation = new THREE.Vector3(
                this._transformMesh.position.x - this._selection.model.offset.x,
                this._transformMesh.position.y - this._selection.model.offset.y,
                this._transformMesh.position.z - this._selection.model.offset.z)

            for (var fragId in this._selectedFragProxyMap) {
                var fragProxy = this._selectedFragProxyMap[fragId]

                var position = new THREE.Vector3(
                    this._transformMesh.position.x - fragProxy.offset.x,
                    this._transformMesh.position.y - fragProxy.offset.y,
                    this._transformMesh.position.z - fragProxy.offset.z)

                fragProxy.position.copy(position)

                fragProxy.updateAnimTransform()
            }

            this.emit('transform.translate.change', {
                model: this._selection.model,
                translation: translation
            })
        }

        this.viewer.impl.sceneUpdated(true)
    }
    /**
     * Translate dbIds fragment programmatically
     * @param {Autodesk.Viewing.Model} model 
     * @param {number[]} dbIds 
     * @param {THREE.Vector3} pos 
     */
    async change(model, dbIds, pos) {
        const it = model.getInstanceTree()
        const p = dbIds.map(async (root) => {
            let allchild = await ViewerToolkit.getAllDbIds(model, root)
            allchild.forEach((dbId) => {
                it.enumNodeFragments(dbId, (fragId) => {
                    var fragProxy = this.viewer.impl.getFragmentProxy(model, fragId)
                    fragProxy.getAnimTransform()

                    var position = new THREE.Vector3(
                        pos.x + fragProxy.position.x,
                        pos.y + fragProxy.position.y,
                        pos.z + fragProxy.position.z)

                    fragProxy.position.copy(position)

                    fragProxy.updateAnimTransform()
                })
            })
        })
        await Promise.all(p)
        this.viewer.impl.sceneUpdated(true)
        return true
    }


    async changeWorld(model, dbIds, pos) {
        const it = model.getInstanceTree()
        const p = dbIds.map(async (root) => {
            let allchild = await ViewerToolkit.getAllDbIds(model, root)
            allchild.forEach((dbId) => {
                var center = ViewerToolkit.getBoundingBox(dbId, model).getCenter()
                it.enumNodeFragments(dbId, (fragId) => {
                    var fragProxy = this.viewer.impl.getFragmentProxy(model, fragId)
                    fragProxy.getAnimTransform()

                    var position = new THREE.Vector3(
                        pos.x - center.x + fragProxy.position.x,
                        pos.y - center.y + fragProxy.position.y,
                        pos.z - center.z + fragProxy.position.z)

                    fragProxy.position.copy(position)

                    fragProxy.updateAnimTransform()
                })
            })
        })
        await Promise.all(p)
        this.viewer.impl.sceneUpdated(true)
        return true
    }

    /**
     * on camera changed
     */
    onCameraChanged() { if (this._transformControlTx) { this._transformControlTx.update() } }

    /**
     * item selected callback
     * @param {*} event 
     */
    onAggregateSelectionChanged(event) {
        if (event.selections && event.selections.length) {
            this._selection = event.selections[0]
            if (this.fullTransform) {
                this._selection.fragIdsArray = []

                var fragCount = this._selection.model.getFragmentList().fragments.fragId2dbId.length

                for (var fragId = 0; fragId < fragCount; ++fragId) {
                    this._selection.fragIdsArray.push(fragId)
                }

                this._selection.dbIdArray = []

                var instanceTree = this._selection.model.getData().instanceTree

                var rootId = instanceTree.getRootId()

                this._selection.dbIdArray.push(rootId)
            }

            const selectionBox = this._selection.dbIdArray.reduce((bbox, dbId) => {
                bbox.union(ViewerToolkit.getBoundingBox(dbId, this._selection.model))
                return bbox
            }, new THREE.Box3())
            this._hitPoint = selectionBox.getCenter()

            this.emit('transform.modelSelected', this._selection)
            this.emit('transform.translate.modelSelected', this._selection)

            this.initializeSelection(this._hitPoint)
        }
        else { this.clearSelection() }
    }

    /**
     * 
     * @param {THREE.Vector3} hitPoint 
     */
    initializeSelection(hitPoint) {
        if (!hitPoint) { return }
        this._selectedFragProxyMap = {}

        var modelTransform = this._selection.model.transform ||
            { translation: { x: 0, y: 0, z: 0 } }

        this._selection.model.offset = {
            x: hitPoint.x - modelTransform.translation.x,
            y: hitPoint.y - modelTransform.translation.y,
            z: hitPoint.z - modelTransform.translation.z
        }

        this._transformControlTx.visible = true

        this._transformControlTx.setPosition(hitPoint)

        this._transformControlTx.addEventListener('change', this.onTxChange)

        this.viewer.addEventListener(Autodesk.Viewing.CAMERA_CHANGE_EVENT, this.onCameraChanged)

        this._selection.fragIdsArray.forEach((fragId) => {
            var fragProxy = this.viewer.impl.getFragmentProxy(this._selection.model, fragId)

            fragProxy.getAnimTransform()

            fragProxy.offset = {
                x: hitPoint.x - fragProxy.position.x,
                y: hitPoint.y - fragProxy.position.y,
                z: hitPoint.z - fragProxy.position.z
            }

            this._selectedFragProxyMap[fragId] = fragProxy
        })
    }

    clearSelection() {
        if (this.active) {
            this._selection = null
            this._selectedFragProxyMap = {}
            this._transformControlTx.visible = false
            this._transformControlTx.removeEventListener('change', this.onTxChange)
            this.viewer.removeEventListener(Autodesk.Viewing.CAMERA_CHANGE_EVENT, this.onCameraChanged)

            this.viewer.impl.sceneUpdated(true)

            this.emit('transform.clearSelection')
            this.emit('transform.translate.clearSelection')
        }
    }

    /**
     * normalize screen coordinates
     * @param {{x:number,y:number}} screenPoint 
     * @returns {{x:number,y:number}}
     */
    /*normalize(screenPoint) {
        var viewport = this.viewer.navigation.getScreenViewport()
        return {
            x: (screenPoint.x - viewport.left) / viewport.width,
            y: (screenPoint.y - viewport.top) / viewport.height
        }
    }*/

    /**
     * 
     * @param {{x:number,y:number}} screenPoint 
     * @returns {{x:number,y:number}}
     */
    getClientPoint(screenPoint) {
        var viewport = viewer.navigation.getScreenViewport();
        return {
            x: (screenPoint.x - viewport.left),
            y: (screenPoint.y - viewport.top)
        }
    }

    /**
     * get 3d hit point on mesh
     * @param {*} event 
     * @returns 
     */
    /*_getHitPoint(event) {
        var screenPoint = { x: event.clientX, y: event.clientY }
        var n = this.normalize(screenPoint)
        var hitPoint = this.viewer.utilities.getHitPoint(n.x, n.y)
        return hitPoint
    }*/

    /**
     * get center point on hit mesh
     * @param {*} event 
     * @returns 
     */
    getHitPoint(event) {
        var screenPoint = { x: event.clientX, y: event.clientY }
        var n = this.getClientPoint(screenPoint)
        var hitTest = viewer.hitTest(n.x, n.y)
        if (hitTest == null) {
            return null
        }
        return ViewerToolkit.getBoundingBox(hitTest.dbId, hitTest.model).getCenter()
    }

    activate() {
        if (!this.active) {
            this.active = true
            this.viewer.select([])
            var bbox = this.viewer.model.getBoundingBox()

            this.viewer.impl.createOverlayScene('TransformToolOverlay')

            this._transformControlTx = new THREE.TransformControls(
                this.viewer.impl.camera,
                this.viewer.impl.canvas,
                "translate")

            this._transformControlTx.setSize(bbox.getBoundingSphere().radius * 5)
            this._transformControlTx.visible = false
            this.viewer.impl.addOverlay('TransformToolOverlay', this._transformControlTx)
            this._transformMesh = this.createTransformMesh()
            this._transformControlTx.attach(this._transformMesh)
            this.viewer.addEventListener(Autodesk.Viewing.AGGREGATE_SELECTION_CHANGED_EVENT, this.onAggregateSelectionChanged)
        }
    }

    deactivate() {
        if (this.active) {
            this.active = false
            this.viewer.impl.removeOverlay('TransformToolOverlay', this._transformControlTx)
            this._transformControlTx.removeEventListener('change', this.onTxChange)
            this.viewer.impl.removeOverlayScene('TransformToolOverlay')
            this.viewer.removeEventListener(Autodesk.Viewing.CAMERA_CHANGE_EVENT, this.onCameraChanged)
            this.viewer.removeEventListener(Autodesk.Viewing.AGGREGATE_SELECTION_CHANGED_EVENT, this.onAggregateSelectionChanged)
        }
    }

    handleButtonDown(event, button) {
        //this._hitPoint = this.getHitPoint(event)
        this._isDragging = true
        if (this._transformControlTx.onPointerDown(event)) return true
        return false
    }

    handleButtonUp(event, button) {
        this._isDragging = false
        if (this._transformControlTx.onPointerUp(event)) return true
        return false
    }

    handleMouseMove(event) {
        if (this._isDragging) {
            if (this._transformControlTx.onPointerMove(event)) return true
            return false
        }
        if (this._transformControlTx.onPointerHover(event)) return true
        return false
    }

    handleKeyDown(event, keyCode) {
        this.keys[event.key] = true
        return false
    }

    handleKeyUp(event, keyCode) {
        this.keys[event.key] = false
        return false
    }
}
