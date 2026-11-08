import { Object3D, Scene, Vector3, PointLight, Mesh, MeshStandardMaterial } from 'three';

export type PowerUpType = 'HEAL' | 'DOUBLE_LASER' | 'TRIPLE_LASER';

export class PowerUp {
    model: Object3D;
    scene: Scene;
    type: PowerUpType;
    lifespan: number = 600; 

    constructor(scene: Scene, modeloBase: Object3D, posicion: Vector3, type: PowerUpType) {
        this.scene = scene;
        this.type = type;
        
        // 1. Clonamos la caja para que cada drop sea independiente
        this.model = modeloBase.clone();
        this.model.position.copy(posicion);

        // 2. Colores: Verde (Curación), Cian (Láser x2), Morado (Láser x3)
        let color = 0x00ff00; 
        if (type === 'DOUBLE_LASER') color = 0x00ffff; 
        if (type === 'TRIPLE_LASER') color = 0xff00ff; 

        // 3. --- LUZ RADIANTE PARA ILUMINAR EL ESPACIO ---
        const light = new PointLight(color, 8, 30);
        this.model.add(light);

        // 4. --- MATERIAL EMISIVO PARA QUE LA CAJA BRILLE ---
        this.model.traverse((child) => {
            if ((child as Mesh).isMesh) {
                const mesh = child as Mesh;
                if (mesh.material) {
                    mesh.material = (mesh.material as MeshStandardMaterial).clone();
                    (mesh.material as MeshStandardMaterial).emissive.setHex(color);
                    (mesh.material as MeshStandardMaterial).emissiveIntensity = 1; // Brillo más fuerte para destacar en el vacío
                }
            }
        });

        this.scene.add(this.model);
    }

    update() {
        this.model.rotation.x += 0.02;
        this.model.rotation.y += 0.05;
        this.lifespan--;
    }

    dispose() {
        this.scene.remove(this.model);
    }
}