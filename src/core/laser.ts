import { Mesh, CapsuleGeometry, MeshStandardMaterial, Object3D, Scene, Vector3 } from 'three';

export class Laser {
    mesh: Mesh;
    lifespan: number = 0; 
    scene: Scene;
    direccion: Vector3 = new Vector3();
    active: boolean = false; // FLAG DE OPTIMIZACIÓN
    velocidad: number = 15;

    constructor(scene: Scene) {
        this.scene = scene;
        
        const geometry = new CapsuleGeometry(0.25, 2, 4, 8);
        const material = new MeshStandardMaterial({ 
            color: 0x00ffff,     
            emissive: 0x00ffff,  
            emissiveIntensity: 3 
        });
        
        this.mesh = new Mesh(geometry, material);
        this.mesh.rotation.x = Math.PI / 2; 
        this.mesh.visible = false; // Nace apagado
        
        scene.add(this.mesh);
    }

    // Método para "encender" un láser reciclado
    spawn(originObject: Object3D, offsetX: number = 0, offsetY: number = 0) {
        this.active = true;
        this.mesh.visible = true;
        this.lifespan = 120;

        this.mesh.position.copy(originObject.position);
        
        // Copiamos la rotación exacta de forma limpia
        this.mesh.quaternion.copy(originObject.quaternion);
        
        // Movemos el láser hacia los lados (X) y hacia arriba/abajo (Y)
        this.mesh.translateX(offsetX);
        this.mesh.translateY(offsetY); 
        
        originObject.getWorldDirection(this.direccion);
        this.mesh.position.addScaledVector(this.direccion, 2);
    }

    update() {
        if (!this.active) return;

        this.mesh.position.addScaledVector(this.direccion, this.velocidad); 
        this.lifespan--;

        if (this.lifespan <= 0) {
            this.desactivar();
        }
    }

    desactivar() {
        this.active = false;
        this.mesh.visible = false; // Se oculta pero no se borra de la memoria
    }

    dispose() {
        this.scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        (this.mesh.material as MeshStandardMaterial).dispose();
    }
}