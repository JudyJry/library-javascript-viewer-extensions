import EventsEmitter from '../components/EventsEmitter'
import ViewerToolkit from '../components/Viewer.Toolkit'

export default class RotateTool extends EventsEmitter {
    constructor(viewer) {
        super()
        this.keys = {}
        this.active = false
        this.viewer = viewer
        this.fullTransform = false
        this.viewer.toolController.registerTool(this)
        this.onAggregateSelectionChangedHandler = (e) => {
            this.onAggregateSelectionChanged(e)
        }
    }

    enable(enable) {
        var name = this.getName()
        if (enable) {
            this.viewer.toolController.activateTool(name)
        } else {
            this.viewer.toolController.deactivateTool(name)
        }
    }

    getNames() { return ['Viewing.Rotate.Tool'] }

    getName() { return 'Viewing.Rotate.Tool' }

    activate() {
        if (!this.active) {
            this.active = true
            this.viewer.addEventListener(
                Autodesk.Viewing.AGGREGATE_SELECTION_CHANGED_EVENT,
                this.onAggregateSelectionChangedHandler)
        }
    }

    deactivate() {
        if (this.active) {
            this.active = false
            if (this.rotateControl) {
                this.rotateControl.remove()
                this.rotateControl = null
            }
            this.viewer.removeEventListener(
                Autodesk.Viewing.AGGREGATE_SELECTION_CHANGED_EVENT,
                this.onAggregateSelectionChangedHandler)

        }
    }

    /**
     * Component Selection Handler 
     * (use Autodesk.Viewing.AGGREGATE_SELECTION_CHANGED_EVENT instead of
     *  Autodesk.Viewing.SELECTION_CHANGED_EVENT - deprecated )
     * @param {*} event 
     * @returns 
     */
    onAggregateSelectionChanged(event) {
        if (this.rotateControl && this.rotateControl.engaged) {
            this.rotateControl.engaged = false
            this.viewer.select(this._selection.dbIdArray)
            return
        }

        if (event.selections && event.selections.length) {
            var selection = event.selections[0]
            this._selection = selection
            this.emit('transform.modelSelected', this._selection)

            if (this.fullTransform) {
                this._selection.fragIdsArray = []
                var fragCount = selection.model.getFragmentList().fragments.fragId2dbId.length

                for (var fragId = 0; fragId < fragCount; ++fragId) {
                    this._selection.fragIdsArray.push(fragId)
                }

                this._selection.dbIdArray = []

                var instanceTree = selection.model.getData().instanceTree
                var rootId = instanceTree.getRootId()
                this._selection.dbIdArray.push(rootId)
            }

            this.drawControl()

            const selectionBox = this._selection.dbIdArray.reduce((bbox, dbId) => {
                bbox.union(ViewerToolkit.getBoundingBox(dbId, this._selection.model))
                return bbox
            }, new THREE.Box3())
            this.viewer.navigation.fitBounds(false, selectionBox.expandByScalar(3), true, true)
            //this.viewer.fitToView(this.selection.dbIdArray)

        } else {
            this.clearSelection()
        }
    }

    clearSelection() {
        this._selection = null
        if (this.rotateControl) {
            this.rotateControl.remove()
            this.rotateControl = null
            this.viewer.impl.sceneUpdated(true)
        }
    }

    /**
     * Draw rotate control
     */
    drawControl() {
        var bBox = this.geWorldBoundingBox(
            this._selection.fragIdsArray,
            this._selection.model.getFragmentList())

        this.center = bBox.getCenter()

        var size = Math.max(
            bBox.max.x - bBox.min.x,
            bBox.max.y - bBox.min.y,
            bBox.max.z - bBox.min.z) * 0.8

        if (this.rotateControl) {
            this.rotateControl.remove()
        }

        this.rotateControl = new RotateControl(this.viewer, this.center, size)

        this.rotateControl.on('transform.rotate', (data) => {
            this.rotateFragments(
                this._selection.model,
                this._selection.fragIdsArray,
                data.axis,
                data.angle,
                this.center)

            this.viewer.impl.sceneUpdated(true)
        })
    }

    handleButtonDown(event, button) {
        if (this.rotateControl) {
            if (this.rotateControl.onPointerDown(event)) {
                return true
            }
        }

        if (button === 0 && this.keys.Control) {
            this.isDragging = true
            this.mousePos = {
                x: event.clientX,
                y: event.clientY
            }
            return true
        }

        return false
    }

    handleButtonUp(event, button) {
        if (this.rotateControl) {
            this.rotateControl.onPointerUp(event)
        }

        if (button === 0) {
            this.isDragging = false
        }

        return false
    }

    handleMouseMove(event) {
        if (this.rotateControl) {
            this.rotateControl.onPointerHover(event)
        }

        if (this.isDragging) {
            if (this._selection) {
                var offset = {
                    x: this.mousePos.x - event.clientX,
                    y: event.clientY - this.mousePos.y
                }

                this.mousePos = {
                    x: event.clientX,
                    y: event.clientY
                }

                var angle = Math.sqrt(
                    offset.x * offset.x +
                    offset.y * offset.y)

                var sidewaysDirection = new THREE.Vector3()
                var moveDirection = new THREE.Vector3()
                var eyeDirection = new THREE.Vector3()
                var upDirection = new THREE.Vector3()
                var camera = this.viewer.getCamera()
                var axis = new THREE.Vector3()
                var eye = new THREE.Vector3()

                eye.copy(camera.position).sub(camera.target)
                eyeDirection.copy(eye).normalize()
                upDirection.copy(camera.up).normalize()
                sidewaysDirection.crossVectors(upDirection, eyeDirection).normalize()

                upDirection.setLength(offset.y)

                sidewaysDirection.setLength(offset.x)

                moveDirection.copy(upDirection.add(sidewaysDirection))

                axis.crossVectors(moveDirection, eye).normalize()

                this.rotateFragments(
                    this._selection.model,
                    this._selection.fragIdsArray,
                    axis, angle * Math.PI / 180,
                    this.center)

                this.viewer.impl.sceneUpdated(true)
            }

            return true
        }

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

    /**
     * Rotate selected fragments
     * @param {Autodesk.Viewing.Model} model 
     * @param {number[]} fragIdsArray 
     * @param {string} axis 
     * @param {number} angle 
     * @param {THREE.Vector3} center 
     */
    rotateFragments(model, fragIdsArray, axis, angle, center) {
        var quaternion = new THREE.Quaternion()
        quaternion.setFromAxisAngle(axis, angle)
        fragIdsArray.forEach((fragId, idx) => {
            var fragProxy = this.viewer.impl.getFragmentProxy(model, fragId)

            fragProxy.getAnimTransform()

            var position = new THREE.Vector3(
                fragProxy.position.x - center.x,
                fragProxy.position.y - center.y,
                fragProxy.position.z - center.z)

            position.applyQuaternion(quaternion)

            position.add(center)

            fragProxy.position.copy(position)

            fragProxy.quaternion.multiplyQuaternions(quaternion, fragProxy.quaternion)

            if (idx === 0) {
                var euler = new THREE.Euler()
                euler.setFromQuaternion(fragProxy.quaternion, 0)

                this.emit('transform.rotate', {
                    rotation: euler,
                    model
                })
            }

            fragProxy.updateAnimTransform()
        })
    }

    /**
     * returns bounding box as it appears in the viewer
     * (transformations could be applied)
     * @param {number[]} fragIds 
     * @param {*} fragList 
     * @returns {THREE.Box3}
     */
    geWorldBoundingBox(fragIds, fragList) {
        var fragbBox = new THREE.Box3()
        var nodebBox = new THREE.Box3()
        fragIds.forEach((fragId) => {
            fragList.getWorldBounds(fragId, fragbBox)
            nodebBox.union(fragbBox)
        })
        return nodebBox
    }
}

/**
 * RotateControl Class
 */
class RotateControl extends EventsEmitter {
    constructor(viewer, center, size) {
        super()
        this.engaged = false
        this.useAxis = false

        this.overlayScene = 'rotateControlScene'
        this.domElement = viewer.impl.canvas
        this.camera = viewer.impl.camera
        this.viewer = viewer
        this.center = center
        this.size = size
        this.gizmos = []
        this.axis = []

        this.create(center, size)
    }

    create(center, size) {
        const axisSize = 1 //0.85
        const gizmosSize = 0.0075 //0.0045
        const pickerSize = 0.05 //0.02
        this.viewer.impl.createOverlayScene(this.overlayScene)

        if (this.useAxis) {
            this.axis.push(this.createAxis(
                center, new THREE.Vector3(1, 0, 0),
                size * axisSize, 0xFF0000))

            this.axis.push(this.createAxis(
                center, new THREE.Vector3(0, 1, 0),
                size * axisSize, 0x00FF00))

            this.axis.push(this.createAxis(
                center, new THREE.Vector3(0, 0, 1),
                size * axisSize, 0x0000FF))
        }

        // World UP = Y
        if (this.camera.worldup.y) {
            this.gizmos.push(this.createGizmo(
                center,
                new THREE.Euler(0, Math.PI / 2, 0),
                size * gizmosSize,
                size * 0.8, 0xFF0000,
                Math.PI,
                new THREE.Vector3(1, 0, 0)))

            this.gizmos.push(this.createGizmo(
                center,
                new THREE.Euler(Math.PI / 2, 0, 0),
                size * gizmosSize,
                size * 0.8, 0x00FF00,
                2 * Math.PI,
                new THREE.Vector3(0, 1, 0)))

            this.gizmos.push(this.createGizmo(
                center,
                new THREE.Euler(0, 0, 0),
                size * gizmosSize,
                size * 0.8, 0x0000FF,
                Math.PI,
                new THREE.Vector3(0, 0, 1)))
        }
        else {
            // World UP = Z
            //X
            this.gizmos.push(this.createGizmo(
                center,
                new THREE.Euler(Math.PI / 2, Math.PI / 2, 0),
                size * gizmosSize,
                size * 0.8, 0xFF0000,
                Math.PI,
                new THREE.Vector3(1, 0, 0)))
            //Y
            this.gizmos.push(this.createGizmo(
                center,
                new THREE.Euler(Math.PI / 2, 0, 0),
                size * gizmosSize,
                size * 0.8, 0x00FF00,
                Math.PI,
                new THREE.Vector3(0, 1, 0)))
            //Z
            this.gizmos.push(this.createGizmo(
                center,
                new THREE.Euler(0, 0, 0),
                size * gizmosSize,
                size * 0.8, 0x0000FF,
                2 * Math.PI,
                new THREE.Vector3(0, 0, 1)))
        }

        this.picker = this.createSphere(size * pickerSize)

        var material = new THREE.LineBasicMaterial({
            color: 0xFFFF00,
            linewidth: 3, //1
            depthTest: false,
            depthWrite: false,
            transparent: true
        })

        this.angleLine = this.createLine(
            this.center,
            this.center,
            material)

        this.viewer.impl.sceneUpdated(true)
    }

    /**
     * Draw a line
     * @param {THREE.Vector3} start 
     * @param {THREE.Vector3} end 
     * @param {THREE.LineBasicMaterial} material 
     * @returns {THREE.Line} line
     */
    createLine(start, end, material) {
        var geometry = new THREE.Geometry()
        geometry.vertices.push(new THREE.Vector3(start.x, start.y, start.z))
        geometry.vertices.push(new THREE.Vector3(end.x, end.y, end.z))
        var line = new THREE.Line(geometry, material)
        this.viewer.impl.addOverlay(this.overlayScene, line)
        return line
    }

    /**
     * Draw a cone
     * @param {THREE.Vector3} start 
     * @param {THREE.Vector3} dir 
     * @param {number} length 
     * @param {THREE.MeshBasicMaterial} material 
     * @returns {THREE.Mesh}
     */
    createCone(start, dir, length, material) {
        var _dir = dir.clone().normalize()

        var end = {
            x: start.x + _dir.x * length,
            y: start.y + _dir.y * length,
            z: start.z + _dir.z * length
        }

        var orientation = new THREE.Matrix4()

        orientation.lookAt(start, end, new THREE.Object3D().up)

        var matrix = new THREE.Matrix4()
        matrix.set(
            1, 0, 0, 0,
            0, 0, 1, 0,
            0, -1, 0, 0,
            0, 0, 0, 1)

        orientation.multiply(matrix)

        var geometry = new THREE.CylinderGeometry(0, length * 0.2, length, 128, 1)
        var cone = new THREE.Mesh(geometry, material)

        cone.applyMatrix(orientation)

        cone.position.x = start.x + _dir.x * length / 2
        cone.position.y = start.y + _dir.y * length / 2
        cone.position.z = start.z + _dir.z * length / 2

        this.viewer.impl.addOverlay(this.overlayScene, cone)

        return cone
    }

    /**
     * Draw one axis
     * @param {THREE.Vector3} start 
     * @param {THREE.Vector3} dir 
     * @param {number} size 
     * @param {number} color 
     * @returns {{line:THREE.Line, cone:THREE.Mesh}}
     */
    createAxis(start, dir, size, color) {
        var end = {
            x: start.x + dir.x * size,
            y: start.y + dir.y * size,
            z: start.z + dir.z * size
        }

        var material = new THREE.LineBasicMaterial({
            color: color,
            linewidth: 3,
            depthTest: false,
            depthWrite: false,
            transparent: true
        })

        var line = this.createLine(start, end, material)

        var cone = this.createCone(end, dir, size * 0.1, material)
        return { line, cone }
    }

    /**
     * Draw a rotate gizmo
     * @param {THREE.Vector3} center Gizmo center position
     * @param {THREE.Euler} euler 
     * @param {number} size TorusGeometry.tube like stroke weight
     * @param {number} radius Radius of the torus, from the center of the torus to the center of the tube.
     * @param {number} color 0x000000
     * @param {number} range TorusGeometry.arc angle ex: Math.PI * 2
     * @param {THREE.Vector3} axis XYZ axis
     * @returns {THREE.Mesh} Gizmo
     */
    createGizmo(center, euler, size, radius, color, range, axis) {
        var material = new GizmoMaterial({ color: color })
        var subMaterial = new GizmoMaterial({ color: color })
        var torusGizmo = new THREE.Mesh(
            new THREE.TorusGeometry(radius, size, 64, 64, range),
            material)

        var subTorus = new THREE.Mesh(
            new THREE.TorusGeometry(radius, size, 64, 64, 2 * Math.PI),
            subMaterial)

        subTorus.material.highlight(true)

        var transform = new THREE.Matrix4()

        var q = new THREE.Quaternion()
        q.setFromEuler(euler)

        var s = new THREE.Vector3(1, 1, 1)

        transform.compose(center, q, s)
        torusGizmo.applyMatrix(transform)
        subTorus.applyMatrix(transform)

        var plane = this.createBox(
            this.size * 100,
            this.size * 100,
            0.01)

        plane.applyMatrix(transform)
        subTorus.visible = false

        this.viewer.impl.addOverlay(this.overlayScene, torusGizmo)

        this.viewer.impl.addOverlay(this.overlayScene, subTorus)

        torusGizmo.subGizmo = subTorus
        torusGizmo.plane = plane
        torusGizmo.axis = axis

        return torusGizmo
    }

    /**
     * Draw a box
     * @param {number} w width
     * @param {number} h height
     * @param {number} d depth
     * @returns {THREE.Mesh}
     */
    createBox(w, h, d) {
        var material = new GizmoMaterial({ color: 0x000000 })
        var geometry = new THREE.BoxGeometry(w, h, d)
        var box = new THREE.Mesh(geometry, material)
        box.visible = false
        this.viewer.impl.addOverlay(this.overlayScene, box)
        return box
    }

    /**
     * Draw a sphere
     * @param {Number} radius sphere radius
     * @returns {THREE.Mesh}
     */
    createSphere(radius) {
        var material = new GizmoMaterial({ color: 0xFFFF00 })
        var geometry = new THREE.SphereGeometry(radius, 32, 32)
        var sphere = new THREE.Mesh(geometry, material)
        sphere.visible = false
        this.viewer.impl.addOverlay(this.overlayScene, sphere)
        return sphere
    }

    /**
     * Creates Raycatser object from the pointer
     * @param {{clientX:number,clientY:number}} pointer 
     * @returns 
     */
    pointerToRaycaster(pointer) {
        var pointerVector = new THREE.Vector3()
        var pointerDir = new THREE.Vector3()
        var ray = new THREE.Raycaster()

        var rect = this.domElement.getBoundingClientRect()

        var x = ((pointer.clientX - rect.left) / rect.width) * 2 - 1
        var y = -((pointer.clientY - rect.top) / rect.height) * 2 + 1

        if (this.camera.isPerspective) {

            pointerVector.set(x, y, 0.5)

            pointerVector.unproject(this.camera)

            ray.set(this.camera.position, pointerVector.sub(this.camera.position).normalize())

        }
        else {
            pointerVector.set(x, y, -1)
            pointerVector.unproject(this.camera)
            pointerDir.set(0, 0, -1)

            ray.set(pointerVector, pointerDir.transformDirection(this.camera.matrixWorld))
        }

        return ray
    }

    onPointerDown(event) {
        var pointer = event.pointers ? event.pointers[0] : event
        if (pointer.button === 0) {
            var ray = this.pointerToRaycaster(pointer)
            var intersectResults = ray.intersectObjects(this.gizmos, true)

            if (intersectResults.length) {

                this.gizmos.forEach((gizmo) => { gizmo.visible = false })

                this.selectedGizmo = intersectResults[0].object

                this.selectedGizmo.subGizmo.visible = true

                this.picker.position.copy(intersectResults[0].point)

                this.angleLine.geometry.vertices[1].copy(intersectResults[0].point)

                this.lastDir = intersectResults[0].point.sub(this.center).normalize()

                this.angleLine.geometry.verticesNeedUpdate = true

                this.angleLine.visible = true

                this.picker.visible = true

            }
            else { this.picker.visible = false }

            this.engaged = this.picker.visible
            this.viewer.impl.sceneUpdated(true)
        }

        return this.picker.visible
    }

    onPointerHover(event) {
        var pointer = event.pointers ? event.pointers[0] : event
        if (this.engaged) {
            var ray = this.pointerToRaycaster(pointer)
            var intersectResults = ray.intersectObjects([this.selectedGizmo.plane], true)

            if (intersectResults.length) {
                var intersectPoint = intersectResults[0].point
                var dir = intersectPoint.sub(this.center).normalize()

                var cross = new THREE.Vector3()

                cross.crossVectors(this.lastDir, dir)

                var sign = Math.sign(cross.dot(this.selectedGizmo.axis))

                this.emit('transform.rotate', {
                    angle: sign * dir.angleTo(this.lastDir),
                    axis: this.selectedGizmo.axis
                })

                this.lastDir = dir

                var pickerPoint = new THREE.Vector3(
                    this.center.x + dir.x * this.size * 0.8,
                    this.center.y + dir.y * this.size * 0.8,
                    this.center.z + dir.z * this.size * 0.8)

                this.picker.position.copy(pickerPoint)

                this.angleLine.geometry.vertices[1].copy(pickerPoint)
            }

            this.angleLine.visible = true

            this.angleLine.geometry.verticesNeedUpdate = true

        }
        else {
            this.angleLine.visible = false
            var ray = this.pointerToRaycaster(pointer)
            var intersectResults = ray.intersectObjects(this.gizmos, true)

            if (intersectResults.length) {
                this.picker.position.set(
                    intersectResults[0].point.x,
                    intersectResults[0].point.y,
                    intersectResults[0].point.z)

                this.picker.visible = true

            } else {
                this.picker.visible = false
            }
        }

        this.viewer.impl.sceneUpdated(true)
    }

    onPointerUp(event) {
        this.angleLine.visible = false
        this.picker.visible = false
        this.gizmos.forEach((gizmo) => {
            gizmo.visible = true
            gizmo.subGizmo.visible = false
        })

        this.viewer.impl.sceneUpdated(true)

        setTimeout(() => { this.engaged = false }, 100)
    }

    /**
     * normalize screen coordinates
     * @param {{x:number,y:number}} screenPoint 
     * @returns {{x:number,y:number}}
     */
    normalize(screenPoint) {
        var viewport = this.viewer.navigation.getScreenViewport()
        return {
            x: (screenPoint.x - viewport.left) / viewport.width,
            y: (screenPoint.y - viewport.top) / viewport.height
        }
    }

    /**
     * projects a vector3 onto a specified plane
     * @param {THREE.Vector3} worldPoint 
     * @param {THREE.Vector3} normal 
     * @returns {THREE.Vector3}
     */
    projectOntoPlane(worldPoint, normal) {
        var dist = normal.dot(worldPoint)
        return new THREE.Vector3(
            worldPoint.x - dist * normal.x,
            worldPoint.y - dist * normal.y,
            worldPoint.z - dist * normal.z)
    }

    remove() { this.viewer.impl.removeOverlayScene(this.overlayScene) }
}

/**
 * Highlightable Gizmo Material
 */
class GizmoMaterial extends THREE.MeshBasicMaterial {
    constructor(parameters) {
        super()
        this.setValues(parameters)

        this.colorInit = this.color.clone()
        this.opacityInit = this.opacity
        this.side = THREE.FrontSide
        this.depthWrite = false
        this.transparent = true
        this.depthTest = false
    }

    highlight(highlighted) {
        if (highlighted) {
            this.color.setRGB(1, 230 / 255, 3 / 255)
            this.opacity = 1

        } else {
            this.color.copy(this.colorInit)
            this.opacity = this.opacityInit
        }
    }
}
