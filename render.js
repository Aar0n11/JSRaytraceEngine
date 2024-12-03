const canvas = document.getElementById("canvas")
const ctx = canvas.getContext('2d')

const fps = 20

const widthToHeightRatio = canvas.width / canvas.height

const fovX = 90
const fovY = (fovX / widthToHeightRatio) * 2

const clippingLength = 1000

let objs = []

let cams = []
let activeCam = 0

function hexToRgb(hex) {
    hex = hex.replace(/^#/, '')

    const r = parseInt(hex.substring(0, 2), 16) 
    const g = parseInt(hex.substring(2, 4), 16) 
    const b = parseInt(hex.substring(4, 6), 16) 

    return { r, g, b } 
}

function rgbToHex(r, g, b) {
    const toHex = value => value.toString(16).padStart(2, '0') 
    return `#${toHex(r)}${toHex(g)}${toHex(b)}` 
}

function addColor(color1, color2){
    const color1RGB = hexToRgb(color1)
    const color2RGB = hexToRgb(color2)

    let newR = color1RGB.r + color2RGB.r > 255 ? 255 : color1RGB.r + color2RGB.r
    let newG = color1RGB.g + color2RGB.g > 255 ? 255 : color1RGB.g + color2RGB.g
    let newB = color1RGB.b + color2RGB.b > 255 ? 255 : color1RGB.b + color2RGB.b

    return(rgbToHex(newR, newG, newB))
}

class Ray {
    constructor(x, y, z, direction) {
        this.x = x
        this.y = y
        this.z = z
        this.direction = direction
        this.color = null
        this.bounces = 0
    }

    march(objects, maxDistance, maxBounces) {
        const epsilon = 0.01
        const attenuationScale = 100
        const maxReflects = maxBounces 
    
        let accumulatedColor = { r: 0, g: 0, b: 0 } 
        let currentColor = { r: 255, g: 255, b: 255 } 
    
        for (let b = 0; b < maxReflects; b++) {
            let closestHit = null 
            let minDist = Infinity 
    
            for (const obj of objects) {
                const dist = this.distanceToBox(obj.boundingBox) 
                if (dist < minDist) {
                    minDist = dist 
                    closestHit = obj 
                }
            }
    
            if (!closestHit || minDist > maxDistance) break 
    
            this.x += this.direction.x * minDist
            this.y += this.direction.y * minDist
            this.z += this.direction.z * minDist
    
            const hitColor = hexToRgb(closestHit.boundingBox.color) 
            accumulatedColor.r = Math.min(255, accumulatedColor.r + currentColor.r * (hitColor.r / 255))
            accumulatedColor.g = Math.min(255, accumulatedColor.g + currentColor.g * (hitColor.g / 255))
            accumulatedColor.b = Math.min(255, accumulatedColor.b + currentColor.b * (hitColor.b / 255))
    
            const distance = minDist
            const attenuationFactor = Math.exp(-distance / attenuationScale)
            currentColor.r *= attenuationFactor
            currentColor.g *= attenuationFactor
            currentColor.b *= attenuationFactor
    
            const normal = this.computeNormal(closestHit.boundingBox)
            const dot = 2 * (this.direction.x * normal.x +
                             this.direction.y * normal.y +
                             this.direction.z * normal.z)
    
            this.direction = {
                x: this.direction.x - dot * normal.x,
                y: this.direction.y - dot * normal.y,
                z: this.direction.z - dot * normal.z,
            } 
    
            const length = Math.sqrt(
                this.direction.x ** 2 + 
                this.direction.y ** 2 + 
                this.direction.z ** 2
            ) 
    
            this.direction = {
                x: this.direction.x / length,
                y: this.direction.y / length,
                z: this.direction.z / length,
            } 
        }
    
        this.color = rgbToHex(accumulatedColor.r, accumulatedColor.g, accumulatedColor.b) 
    }    

    distanceToBox(box) {
        let tmin = -Infinity 
        let tmax = Infinity 
    
        const invDirX = 1 / this.direction.x 
        const invDirY = 1 / this.direction.y 
        const invDirZ = 1 / this.direction.z 
    
        if (invDirX >= 0) {
            tmin = Math.max(tmin, (box.min.x - this.x) * invDirX) 
            tmax = Math.min(tmax, (box.max.x - this.x) * invDirX) 
        } else {
            tmin = Math.max(tmin, (box.max.x - this.x) * invDirX) 
            tmax = Math.min(tmax, (box.min.x - this.x) * invDirX) 
        }
    
        if (invDirY >= 0) {
            tmin = Math.max(tmin, (box.min.y - this.y) * invDirY) 
            tmax = Math.min(tmax, (box.max.y - this.y) * invDirY) 
        } else {
            tmin = Math.max(tmin, (box.max.y - this.y) * invDirY) 
            tmax = Math.min(tmax, (box.min.y - this.y) * invDirY) 
        }
    
        if (invDirZ >= 0) {
            tmin = Math.max(tmin, (box.min.z - this.z) * invDirZ) 
            tmax = Math.min(tmax, (box.max.z - this.z) * invDirZ) 
        } else {
            tmin = Math.max(tmin, (box.max.z - this.z) * invDirZ) 
            tmax = Math.min(tmax, (box.min.z - this.z) * invDirZ) 
        }
    
        return tmax >= Math.max(tmin, 0) ? tmin : Infinity 
    }

    computeNormal(box) {
        let normal = { x: 0, y: 0, z: 0 } 

        if (Math.abs(this.x - box.min.x) < Math.abs(this.x - box.max.x)) {
            normal.x = -1
        } else {
            normal.x = 1
        }

        if (Math.abs(this.y - box.min.y) < Math.abs(this.y - box.max.y)) {
            normal.y = -1
        } else {
            normal.y = 1
        }

        if (Math.abs(this.z - box.min.z) < Math.abs(this.z - box.max.z)) {
            normal.z = -1
        } else {
            normal.z = 1
        }

        const length = Math.sqrt(normal.x ** 2 + normal.y ** 2 + normal.z ** 2) 
        return { x: normal.x / length, y: normal.y / length, z: normal.z / length } 
    }
}

class Camera {
    constructor(x, y, z, angleX, angleY){
        this.x = x
        this.y = y
        this.z = z

        this.angleX = angleX
        this.angleY = angleY 
    }
    cast(objects, resolution = 4, maxDistance = 100, maxBounces = 3) {
        const fovXRad = (fovX * Math.PI) / 180
        const fovYRad = (fovY * Math.PI) / 180
        const aspectRatio = canvas.width / canvas.height

        for (let i = 0; i < canvas.width; i += resolution) {
            for (let j = 0; j < canvas.height; j += resolution) {
                const ndcX = (i / canvas.width) * 2 - 1
                const ndcY = (j / canvas.height) * 2 - 1

                let direction = {
                    x: ndcX * Math.tan(fovXRad / 2),
                    y: ndcY * Math.tan(fovYRad / 2) / aspectRatio,
                    z: 1,
                }

                const length = Math.sqrt(direction.x ** 2 + direction.y ** 2 + direction.z ** 2)
                direction = {
                    x: direction.x / length,
                    y: direction.y / length,
                    z: direction.z / length,
                }

                const cosPitch = Math.cos(this.angleY)
                const sinPitch = Math.sin(this.angleY)
                const cosYaw = Math.cos(this.angleX)
                const sinYaw = Math.sin(this.angleX)

                direction = {
                    x: direction.x * cosYaw + direction.z * sinYaw,
                    y: direction.x * sinYaw * sinPitch + direction.y * cosPitch - direction.z * cosYaw * sinPitch,
                    z: -direction.x * sinYaw * cosPitch + direction.y * sinPitch + direction.z * cosYaw * cosPitch,
                }

                const ray = new Ray(this.x, this.y, this.z, direction)
                ray.march(objects, maxDistance, maxBounces)

                ctx.fillStyle = ray.color || "black"
                ctx.fillRect(i, j, resolution, resolution)
            }
        }
    }
}

class Obj {
    constructor(x, y, z, size, color) {
        this.x = x
        this.y = y
        this.z = z
        this.size = size
        this.color = color

        const halfSize = size / 2
        this.boundingBox = {
            min: { x: x - halfSize, y: y - halfSize, z: z - halfSize },
            max: { x: x + halfSize, y: y + halfSize, z: z + halfSize },
            color: color,
        }
    }
}

document.addEventListener("keydown", (e) => {
    const speed = 1
    const rotationSpeed = 0.1
    const cam = cams[activeCam]

    const yawMatrix = [
        [Math.cos(cam.angleX), 0, Math.sin(cam.angleX)],
        [0, 1, 0],
        [-Math.sin(cam.angleX), 0, Math.cos(cam.angleX)]
    ]
    
    const pitchMatrix = [
        [1, 0, 0],
        [0, Math.cos(cam.angleY), -Math.sin(cam.angleY)],
        [0, Math.sin(cam.angleY), Math.cos(cam.angleY)]
    ]

    let forward = [0, 0, 1]
    let right = [1, 0, 0]
    let up = [0, 1, 0]

    forward = multiplyMatrixVector(yawMatrix, forward)
    right = multiplyMatrixVector(yawMatrix, right)

    forward = multiplyMatrixVector(pitchMatrix, forward)
    up = multiplyMatrixVector(pitchMatrix, up)

    forward = normalize(forward)
    right = normalize(right)
    up = normalize(up)

    let move = { x: 0, y: 0, z: 0 }

    switch (e.key) {
        case "Shift": move.y += speed; break
        case " ": move.y -= speed; break
        case "w":
            move.x += forward[0] * speed
            move.y += forward[1] * speed
            move.z += forward[2] * speed
            break
        case "s":
            move.x -= forward[0] * speed
            move.y -= forward[1] * speed
            move.z -= forward[2] * speed
            break
        case "a":
            move.x -= right[0] * speed
            move.y -= right[1] * speed
            move.z -= right[2] * speed
            break
        case "d":
            move.x += right[0] * speed
            move.y += right[1] * speed
            move.z += right[2] * speed
            break
        case "ArrowRight":
            cam.angleX += rotationSpeed
            break
        case "ArrowLeft":
            cam.angleX -= rotationSpeed
            break
        case "ArrowUp":
            cam.angleY = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, cam.angleY - rotationSpeed))
            break
        case "ArrowDown":
            cam.angleY = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, cam.angleY + rotationSpeed))
            break

        case "0" || "1" || "2" || "3" || "4" || "5" || "6" || "7" || "8" || "9":
            let num = parseInt(key)
            if(cams[num])
                activeCam = num
    }

    cam.x += move.x
    cam.y += move.y
    cam.z += move.z
})

function multiplyMatrixVector(matrix, vector) {
    const result = [
        matrix[0][0] * vector[0] + matrix[0][1] * vector[1] + matrix[0][2] * vector[2],
        matrix[1][0] * vector[0] + matrix[1][1] * vector[1] + matrix[1][2] * vector[2],
        matrix[2][0] * vector[0] + matrix[2][1] * vector[1] + matrix[2][2] * vector[2]
    ]
    return result
}

function normalize(vector) {
    const length = Math.sqrt(vector[0] ** 2 + vector[1] ** 2 + vector[2] ** 2)
    return [vector[0] / length, vector[1] / length, vector[2] / length]
}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height) 
    cams[activeCam].cast(objs, 8, 100, 2)
}

canvas.width = window.innerWidth - 19
canvas.height = window.innerHeight - 19

setInterval(render, 1000/fps)