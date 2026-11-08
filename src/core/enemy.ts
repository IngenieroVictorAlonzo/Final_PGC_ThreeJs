import { Object3D, Scene, Vector3, PointLight, Mesh, MeshStandardMaterial, PositionalAudio, AudioLoader, AudioListener } from 'three';

export class Enemy {
    model: Object3D;
    scene: Scene;
    velocidad: number = 0.70; 
    radio: number = 3.0; 
    
    // Altavoz posicional para los láseres de este enemigo en específico
    sonidoDisparoEnemigo: PositionalAudio; 

    constructor(scene: Scene, modeloBase: Object3D, posicionInicial: Vector3, posicionJugador: Vector3, listener: AudioListener) {
        this.scene = scene;
        this.model = modeloBase.clone();
        this.model.position.copy(posicionInicial);
        this.model.lookAt(posicionJugador);
        
        // --- 🔊 CONFIGURACIÓN DE AUDIO 3D ENEMIGO ---
        this.sonidoDisparoEnemigo = new PositionalAudio(listener);
        this.sonidoDisparoEnemigo.setRefDistance(50); // El sonido se irá atenuando a partir de 50 unidades de distancia
        this.sonidoDisparoEnemigo.setVolume(0.8);

        const loader = new AudioLoader();
        loader.load('/Sounds/LaserEnemy.mp3', (buffer) => {
            this.sonidoDisparoEnemigo.setBuffer(buffer);
        });

        // Pegamos la bocina al modelo del enemigo
        this.model.add(this.sonidoDisparoEnemigo);
        
        // --- LUZ Y GLOW ROJO PARA ENEMIGOS ---
        const luzRoja = new PointLight(0xff0000, 1, 0.5);
        this.model.add(luzRoja);

        this.model.traverse((child) => {
            if ((child as Mesh).isMesh) {
                const mesh = child as Mesh;
                if (mesh.material) {
                    mesh.material = (mesh.material as MeshStandardMaterial).clone();
                    (mesh.material as MeshStandardMaterial).emissive.setHex(0xff0000); 
                    (mesh.material as MeshStandardMaterial).emissiveIntensity = 0.81; 
                }
            }
        });

        this.scene.add(this.model);
    }

    reproducirSonidoDisparo() {
        if (this.sonidoDisparoEnemigo.isPlaying) {
            this.sonidoDisparoEnemigo.stop();
        }
        this.sonidoDisparoEnemigo.play();
    }

    update(posicionJugador: Vector3) {
        this.model.lookAt(posicionJugador);
        this.model.translateZ(this.velocidad);
    }

    dispose() {
        // Desconecta y apaga todo para liberar memoria de sonido y gráficos
        if (this.sonidoDisparoEnemigo.isPlaying) this.sonidoDisparoEnemigo.stop();
        this.sonidoDisparoEnemigo.disconnect();
        this.scene.remove(this.model);
    }
}