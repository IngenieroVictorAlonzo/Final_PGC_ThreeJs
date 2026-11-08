import { Mesh, SphereGeometry, MeshStandardMaterial, Scene, Vector3 } from 'three';

export class Asteroid {
    mesh: Mesh;
    scene: Scene;
    radio: number;
    velocidadRotacion: Vector3;

    constructor(scene: Scene, posicion: Vector3, radio: number, textura: any) {
        this.scene = scene;
        this.radio = radio;

        const geometry = new SphereGeometry(radio, 16, 16);
        const positionAttribute = geometry.attributes.position;
        const vertex = new Vector3();

        for (let i = 0; i < positionAttribute.count; i++) {
            vertex.fromBufferAttribute(positionAttribute, i);
            const factorDeformacion = 0.3; 
            const ruidoAleatorio = 1 + (Math.random() - 0.5) * factorDeformacion;
            vertex.multiplyScalar(ruidoAleatorio);
            positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
        }
        
        geometry.computeVertexNormals();

        const material = new MeshStandardMaterial({
            map: textura,
            roughness: 0.9,
            metalness: 0.5,
            // --- EFECTO GLOW SUTIL PARA ASTEROIDES ---
            emissive: 0x444444,       // Gris para que tengan vida propia
            emissiveIntensity: 0.9    // Intensidad suave para que el Bloom cree un halo leve
        });

        this.mesh = new Mesh(geometry, material);
        this.mesh.position.copy(posicion);

        this.velocidadRotacion = new Vector3(
            (Math.random() - 0.5) * 0.01,
            (Math.random() - 0.5) * 0.01,
            (Math.random() - 0.5) * 0.01
        );

        this.scene.add(this.mesh);
    }

    update() {
        this.mesh.rotation.x += this.velocidadRotacion.x;
        this.mesh.rotation.y += this.velocidadRotacion.y;
        this.mesh.rotation.z += this.velocidadRotacion.z;
    }

    reposicionar(nuevaPosicion: Vector3) {
        this.mesh.position.copy(nuevaPosicion);
    }

    dispose() {
        this.scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        (this.mesh.material as MeshStandardMaterial).dispose();
    }
}