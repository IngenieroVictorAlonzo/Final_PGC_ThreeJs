import { Vector3, type PerspectiveCamera } from "three";
import type { SpaceShip } from "./spaceship";

export class CamaraController {
    declare camara: PerspectiveCamera;
    declare spaceship: SpaceShip;
    offset = new Vector3(0,4,-8);
    constructor(
        camara: PerspectiveCamera,
        spaceship: SpaceShip
    ) {
        this.camara = camara;
        this.spaceship = spaceship;
    }

    update() {
        if (!this.spaceship.model) {
            return;
        }

        const rotatedOffset = this.offset.clone().applyQuaternion(this.spaceship.model.quaternion)
        const desiredPosition = this.spaceship.model.position.clone().add(rotatedOffset)

        this.camara.position.lerp(desiredPosition,0.1)
        this.camara.lookAt(this.spaceship.model.position);

    }
}
