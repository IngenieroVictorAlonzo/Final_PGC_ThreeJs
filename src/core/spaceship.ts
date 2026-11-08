import type { Object3D, Scene } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { InputController } from './inputController';
import { Box3, Vector3, Group, Mesh, MeshStandardMaterial, MeshBasicMaterial, SphereGeometry, Audio, AudioLoader, AudioListener } from 'three';

export class SpaceShip {

    model: Object3D | null = null;
    scene: Scene;
    gltfloader = new GLTFLoader();
    inputController: InputController;
    
    sensibilidadNormalMultiplicador: number = 1.0;
    sensibilidadMiraMultiplicador: number = 1.0;

    propulsores: Mesh[] = [];

    velocidadMovimiento = 0.8; 
    velocidadRotacion = 0.05;  

    // --- VARIABLES DE AUDIO ---
    sonidoLaser: Audio;
    sonidoTurbo: Audio;
    turboPresionadoAnteriormente: boolean = false;
    ultimoDisparoTime: number = 0;

    // --- VARIABLES PARA EL BARREL ROLL E I-FRAMES ---
    isRolling: boolean = false;
    rollTime: number = 0;
    rollDirection: number = 1; 
    rollDuration: number = 0.4; 
    rollCooldownTime: number = 0.0; // Cooldown de medio segundo
    invincibilityTime: number = 0.0; // I-frames por daño

    // --- VARIABLES DE FRENADO TÁCTICO ---
    frenoEnergia: number = 3.0; 
    cooldownFreno: number = 0.0; 
    public isBraking: boolean = false; 

    constructor(
        scene: Scene,
        inputController: InputController,
        listener: AudioListener
    ) {
        this.scene = scene;
        this.inputController = inputController;

        this.sonidoLaser = new Audio(listener);
        this.sonidoTurbo = new Audio(listener);
        const loader = new AudioLoader();
        
        loader.load('/Sounds/LaserSpaceship.mp3', (buffer) => {
            this.sonidoLaser.setBuffer(buffer);
            this.sonidoLaser.setVolume(0.05); 
        });
        loader.load('/Sounds/TurboIgnition.mp3', (buffer) => {
            this.sonidoTurbo.setBuffer(buffer);
            this.sonidoTurbo.setVolume(2);
        });
    }

    loadmodel() {
        this.gltfloader.load(
            '/Models/low_poly_x-wing.glb',

            (gltf) => {
                const modeloCrudo = gltf.scene;

                modeloCrudo.traverse((child) => {
                    if ((child as Mesh).isMesh) {
                        const mesh = child as Mesh;
                        if (mesh.material) {
                            const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                            
                            materials.forEach((mat) => {
                                const stdMat = mat as MeshStandardMaterial;
                                if (stdMat.emissive) stdMat.emissive.setHex(0x000000);
                                if (stdMat.emissiveIntensity) stdMat.emissiveIntensity = 0.3;
                                
                                stdMat.metalness = 0.05;   
                                stdMat.roughness = 0.70;  
                            });
                        }
                    }
                });

                const caja = new Box3().setFromObject(modeloCrudo);
                const centro = new Vector3();
                caja.getCenter(centro);

                modeloCrudo.position.x = -centro.x;
                modeloCrudo.position.y = -centro.y;
                modeloCrudo.position.z = -centro.z;

                this.model = new Group();
                this.model.add(modeloCrudo);
                this.model.rotation.order = 'YXZ'; 
                this.model.scale.set(1.5, 1.5, 1.5);

                const colorCyan = 0x00ffff;
                const materialPropulsor = new MeshBasicMaterial({ color: colorCyan }); 
                const geometriaPropulsor = new SphereGeometry(0.173, 16, 16); 

                geometriaPropulsor.translate(0, 0, -0.173);

                const Z_Propulsores = -2.93 + 0.173; 
                const separacionX = 0.766;  
                const alturaY = 0.569;     

                const p1 = new Mesh(geometriaPropulsor, materialPropulsor);
                p1.position.set(-separacionX, alturaY, Z_Propulsores);
                p1.userData.posInicial = p1.position.clone(); 
                
                const p2 = new Mesh(geometriaPropulsor, materialPropulsor);
                p2.position.set(separacionX, alturaY, Z_Propulsores);
                p2.userData.posInicial = p2.position.clone(); 
                
                const p3 = new Mesh(geometriaPropulsor, materialPropulsor);
                p3.position.set(-separacionX, -alturaY, Z_Propulsores);
                p3.userData.posInicial = p3.position.clone(); 
                
                const p4 = new Mesh(geometriaPropulsor, materialPropulsor);
                p4.position.set(separacionX, -alturaY, Z_Propulsores);
                p4.userData.posInicial = p4.position.clone();

                this.model.add(p1, p2, p3, p4);
                
                this.propulsores = [p1, p2, p3, p4];
                this.model.add(...this.propulsores);

                this.scene.add(this.model);
            },
            undefined,
            (error) => {
                console.error('Error al cargar la nave:', error);
            }
        );
    }

    // 👇 SISTEMA UNIFICADO DE INVULNERABILIDAD
    isInvincible(): boolean {
        return this.isRolling || this.invincibilityTime > 0;
    }

    activarIFramesPostDano() {
        this.invincibilityTime = 0.4; // 400ms intocable tras recibir daño
    }

    verificarColision(puntoCritico: Vector3, radioObjeto: number): boolean {
        if (!this.model) return false;

        // Si es invencible (por Roll o por haber recibido daño reciente), los objetos la atraviesan
        if (this.isInvincible()) return false;

        const posLocal = puntoCritico.clone();
        this.model.worldToLocal(posLocal);

        const distCentroFuselaje = Math.sqrt(posLocal.x * posLocal.x + (posLocal.y * 1.4) * (posLocal.y * 1.4));
        const radioFuselaje = 0.6; 
        const dentroFuselaje = distCentroFuselaje < (radioFuselaje + radioObjeto) && 
                               posLocal.z > -4.5 && posLocal.z < 2.0; 

        const distCentroAlas = Math.sqrt((posLocal.y * 1.5) * (posLocal.y * 1.5) + (posLocal.z - 1.0) * (posLocal.z - 1.0));
        const radioAlas = 0.25; 
        const dentroAlas = distCentroAlas < (radioAlas + radioObjeto) && 
                           posLocal.x > -6.0 && posLocal.x < 6.0; 

        return dentroFuselaje || dentroAlas;
    }

    move() {
        if (!this.model) return;

        const deltaTime = 0.016; 

        // ========================================================
        // 🛡️ ACTUALIZACIÓN DE TIMERS (Cooldowns e I-frames)
        // ========================================================
        if (this.rollCooldownTime > 0) this.rollCooldownTime -= deltaTime;

        if (this.invincibilityTime > 0) {
            this.invincibilityTime -= deltaTime;
            // Efecto visual de parpadeo (blink) mientras eres invencible
            this.model.visible = Math.floor(Date.now() / 100) % 2 === 0;
            
            if (this.invincibilityTime <= 0) {
                this.model.visible = true; // Restaurar visibilidad normal
            }
        }

        // ========================================================
        // 🌀 SISTEMA DE EVASIÓN TÁCTICA (BARREL ROLL)
        // ========================================================
        const gamepad = navigator.getGamepads()[0];
        
        const rollIzq = this.inputController.ispressed('KeyE') || (gamepad && gamepad.buttons[1]?.pressed && gamepad.axes[0] > 0.5);
        const rollDer = this.inputController.ispressed('KeyQ') || (gamepad && gamepad.buttons[1]?.pressed && gamepad.axes[0] < 0.5);

        // 👇 Solo rueda si NO está rodando Y el cooldown terminó
        if (!this.isRolling && this.rollCooldownTime <= 0 && (rollIzq || rollDer)) {
            this.isRolling = true;
            this.rollTime = this.rollDuration;
            this.rollDirection = rollIzq ? 1 : -1; 
        }

        if (this.isRolling) {
            this.rollTime -= deltaTime;
            
            const velocidadGiro = (Math.PI * 2) / this.rollDuration;
            this.model.rotateZ(this.rollDirection * velocidadGiro * deltaTime);
            
            this.model.translateX(this.rollDirection * -35.0 * deltaTime);

            if (this.rollTime <= 0) {
                this.isRolling = false;
                this.rollCooldownTime = 0.5; // 👇 Aplica 0.5s de Cooldown al terminar
                
                this.inputController.mobileRollLeft = false;
                this.inputController.mobileRollRight = false;
            }
        }

        // ========================================================
        // 🚀 SISTEMA DE TURBO
        // ========================================================
        const enTurbo = this.inputController.ispressed("KeyX") || 
                        this.inputController.ispressed("ShiftLeft") || 
                        this.inputController.ispressed("ShiftRight");
        
        if (enTurbo && !this.turboPresionadoAnteriormente) {
            if (this.sonidoTurbo.isPlaying) this.sonidoTurbo.stop();
            this.sonidoTurbo.play();
        }
        this.turboPresionadoAnteriormente = enTurbo;
        
        let velocidadActual = this.velocidadMovimiento;
        let multiplicadorGiro = 1.0;
        
        if (enTurbo) {
            velocidadActual = this.velocidadMovimiento * 5;  
            multiplicadorGiro = 1.25;                        
        }

        const escalaObjetivoZ = enTurbo ? 25.0 : 1.0; 
        const escalaObjetivoXY = enTurbo ? 1.5 : 1.0; 
        
        this.propulsores.forEach(prop => {
            prop.scale.z += (escalaObjetivoZ - prop.scale.z) * 0.15;
            prop.scale.x += (escalaObjetivoXY - prop.scale.x) * 0.15;
            prop.scale.y += (escalaObjetivoXY - prop.scale.y) * 0.15;
            
            if (enTurbo) {
                prop.position.x = prop.userData.posInicial.x + (Math.random() - 0.5) * 0.05;
                prop.position.y = prop.userData.posInicial.y + (Math.random() - 0.5) * 0.05;
            } else {
                prop.position.copy(prop.userData.posInicial);
            }
        });

        // ========================================================
        // --- SISTEMA DE APUNTADO Y SENSIBILIDAD ---
        // ========================================================
        const apuntando = this.inputController.ispressed("KeyM");
        let sensibilidadActual = this.velocidadRotacion * multiplicadorGiro;

        if (apuntando) {
            sensibilidadActual *= (0.35 * this.sensibilidadMiraMultiplicador);
        } else {
            sensibilidadActual *= this.sensibilidadNormalMultiplicador;
        }

        if (this.inputController.ispressed("KeyW") || this.inputController.ispressed("ArrowUp")) {
            this.model.translateZ(velocidadActual);
        }

        // ========================================================
        // 🛑 SISTEMA DE FRENADO TÁCTICO
        // ========================================================
        if (this.cooldownFreno > 0) {
            this.cooldownFreno -= deltaTime;
            if (this.cooldownFreno <= 0) {
                this.frenoEnergia = 3.0; 
            }
        }

        const intentandoFrenar = this.inputController.ispressed("KeyS") || this.inputController.ispressed("ArrowDown");
        
        this.isBraking = false;

        if (intentandoFrenar && this.cooldownFreno <= 0 && !enTurbo && !this.isRolling) {
            this.frenoEnergia -= deltaTime;
            this.isBraking = true;
            
            if (this.frenoEnergia <= 0) {
                this.isBraking = false;
                this.cooldownFreno = 10.0; 
            }
        } else {
            if (this.cooldownFreno <= 0 && this.frenoEnergia < 3.0) {
                this.frenoEnergia += deltaTime * 0.5; 
                if (this.frenoEnergia > 3.0) this.frenoEnergia = 3.0;
            }
        }

        // ========================================================
        // --- CÁMARA Y ROTACIÓN ---
        // ========================================================
        if (this.inputController.isPointerLocked) {
            let sensibilidadMouse = apuntando ? 0.0005 : 0.002; 
            sensibilidadMouse *= multiplicadorGiro; 
            
            if (apuntando) {
                sensibilidadMouse *= this.sensibilidadMiraMultiplicador;
            } else {
                sensibilidadMouse *= this.sensibilidadNormalMultiplicador;
            }
            
            this.model.rotateY(-this.inputController.mouseDeltaX * sensibilidadMouse);
            this.model.rotateX(this.inputController.mouseDeltaY * sensibilidadMouse);
            
            this.inputController.mouseDeltaX = 0;
            this.inputController.mouseDeltaY = 0;
        }

        if (this.inputController.ispressed("KeyJ") || this.inputController.ispressed("ArrowLeft")) {
            this.model.rotateY(sensibilidadActual); 
        }
        if (this.inputController.ispressed("KeyL") || this.inputController.ispressed("ArrowRight")) {
            this.model.rotateY(-sensibilidadActual); 
        }

        if (this.inputController.ispressed("KeyI")) {
            this.model.rotateX(-sensibilidadActual); 
        }
        if (this.inputController.ispressed("KeyK")) {
            this.model.rotateX(sensibilidadActual); 
        }

        const PI2 = Math.PI * 2;
        const limitePitch = Math.PI / 2 - 0.05; 
        
        const cicloActual = Math.round(this.model.rotation.x / PI2) * PI2;
        const limiteSuperior = cicloActual + limitePitch;
        const limiteInferior = cicloActual - limitePitch;

        if (!enTurbo && !this.isRolling) { 
            const distanciaArriba = this.model.rotation.x - limiteSuperior;
            const distanciaAbajo = limiteInferior - this.model.rotation.x;

            if (distanciaArriba > 0) {
                if (distanciaArriba > 0.1) {
                    this.model.rotation.x -= distanciaArriba * 0.1;
                } else {
                    this.model.rotation.x = limiteSuperior;
                }
            } else if (distanciaAbajo > 0) {
                if (distanciaAbajo > 0.1) {
                    this.model.rotation.x += distanciaAbajo * 0.1;
                } else {
                    this.model.rotation.x = limiteInferior;
                }
            }
        }

        const velocidadGiroLado = 0.03 * multiplicadorGiro;
        if (this.inputController.ispressed('KeyD')) {
            this.model.rotateZ(velocidadGiroLado); 
        }
        if (this.inputController.ispressed('KeyA')) {
            this.model.rotateZ(-velocidadGiroLado); 
        }
        
        if (this.inputController.ispressed("KeyO")) {
            const tiempoActual = Date.now();
            
            if (tiempoActual - this.ultimoDisparoTime > 250) {
                this.ultimoDisparoTime = tiempoActual;
                
                if (this.sonidoLaser.isPlaying) {
                    this.sonidoLaser.stop();
                }
                this.sonidoLaser.play();
            }
        }                
    }
}