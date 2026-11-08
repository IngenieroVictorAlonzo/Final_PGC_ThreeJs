import { BufferGeometry, Float32BufferAttribute, Points, PointsMaterial, Scene, Vector3, AdditiveBlending } from 'three';

export class Explosion {
    scene: Scene;
    points: Points;
    lifespan: number = 0; 
    velocities: number[] = []; 
    active: boolean = false; // FLAG DE OPTIMIZACIÓN
    particleCount: number = 60;

    constructor(scene: Scene) {
        this.scene = scene;
        
        const positions = new Float32Array(this.particleCount * 3);
        for (let i = 0; i < this.particleCount; i++) {
            this.velocities.push(0, 0, 0); 
        }

        const geometry = new BufferGeometry();
        geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));

        const material = new PointsMaterial({
            color: 0xff5500, 
            size: 3.5,       
            transparent: true,
            opacity: 1,
            blending: AdditiveBlending, 
            depthWrite: false
        });

        this.points = new Points(geometry, material);
        this.points.visible = false; // Nace apagado
        
        // --- LA MAGIA ESTÁ AQUÍ ---
        // Le decimos a Three.js: "Nunca ocultes esto automáticamente por cámara, yo me encargo"
        this.points.frustumCulled = false; 

        this.scene.add(this.points);
    }

    // Método para re-utilizar la explosión
    spawn(posicion: Vector3) {
        this.active = true;
        this.points.visible = true;
        this.lifespan = 30;
        
        // --- SEGUNDA CORRECCIÓN CLAVE ---
        // Movemos el "Objeto 3D" completo a la posición del impacto, en lugar de mover cada chispa.
        this.points.position.copy(posicion);

        const material = this.points.material as PointsMaterial;
        material.opacity = 1;

        const positions = this.points.geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < this.particleCount; i++) {
            // Las chispas ahora nacen en (0,0,0) LOCALES y se expanden desde ahí
            positions[i * 3] = 0;
            positions[i * 3 + 1] = 0;
            positions[i * 3 + 2] = 0;

            this.velocities[i * 3] = (Math.random() - 0.5) * 3;
            this.velocities[i * 3 + 1] = (Math.random() - 0.5) * 3;
            this.velocities[i * 3 + 2] = (Math.random() - 0.5) * 3;
        }
        this.points.geometry.attributes.position.needsUpdate = true;
    }

    update() {
        if (!this.active) return;

        const positions = this.points.geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < this.particleCount; i++) {
            positions[i * 3] += this.velocities[i * 3];
            positions[i * 3 + 1] += this.velocities[i * 3 + 1];
            positions[i * 3 + 2] += this.velocities[i * 3 + 2];
        }
        
        this.points.geometry.attributes.position.needsUpdate = true;
        
        const material = this.points.material as PointsMaterial;
        material.opacity = this.lifespan / 30; 

        this.lifespan--;

        if (this.lifespan <= 0) {
            this.desactivar();
        }
    }

    desactivar() {
        this.active = false;
        this.points.visible = false;
    }

    dispose() {
        this.scene.remove(this.points);
        this.points.geometry.dispose();
        (this.points.material as PointsMaterial).dispose();
    }
}