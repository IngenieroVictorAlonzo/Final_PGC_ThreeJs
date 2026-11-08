import {
    BufferGeometry,
    Float32BufferAttribute,
    Points,
    PointsMaterial,
    Vector3, // IMPORTANTE: Agregado Vector3 para la matemática esférica
    type Scene
} from 'three';

export class Stars {
    declare star: Points;

    scene: Scene;
    cantidad: number;
    rango: number;

    constructor(
        scene: Scene,
        cantidad: number = 20000,
        rango: number = 1000
    ) {
        this.scene = scene;
        this.cantidad = cantidad;
        this.rango = rango;
    }

    createStars() {
        const positions = new Float32Array(this.cantidad * 3);
        const vector = new Vector3();

        for (let i = 0; i < this.cantidad; i++) {
            // 1. Generar una dirección aleatoria en 3D
            vector.x = Math.random() * 2 - 1;
            vector.y = Math.random() * 2 - 1;
            vector.z = Math.random() * 2 - 1;
            
            // Normalizar el vector para que tenga longitud 1 (crea una forma de esfera)
            if (vector.lengthSq() === 0) vector.x = 1; // Seguridad
            vector.normalize();

            // 2. Empujar la estrella lejos del centro (donde está la nave)
            // Esto las coloca en un radio entre (rango/2) y (rango)
            const distancia = (this.rango / 2) + Math.random() * (this.rango / 2);
            vector.multiplyScalar(distancia);

            // 3. Asignar las posiciones
            positions[i * 3] = vector.x;
            positions[i * 3 + 1] = vector.y;
            positions[i * 3 + 2] = vector.z;
        }

        const geometry = new BufferGeometry();

        geometry.setAttribute(
            'position',
            new Float32BufferAttribute(positions, 3)
        );

        const material = new PointsMaterial({
            color: 0xffffff,
            size: 1.5, // Lo aumenté un poco porque ahora las estrellas están físicamente más lejos
            transparent: true,
            opacity: 0.7,
            depthTest: true,   // ¡SOLUCIÓN 1! Ahora las estrellas respetan los objetos sólidos
            depthWrite: false  // ¡SOLUCIÓN 2! Evita fallos gráficos entre partículas transparentes
        });

        this.star = new Points(geometry, material);

        this.scene.add(this.star);
    }
}