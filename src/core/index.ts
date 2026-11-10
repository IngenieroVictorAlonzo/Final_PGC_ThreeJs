import {
    AmbientLight, DirectionalLight, PerspectiveCamera, WebGLRenderer,
    Scene, Vector2, Vector3, TextureLoader, Fog, Object3D, CubeTextureLoader,
    MeshStandardMaterial, AudioListener, AudioLoader, Audio, PositionalAudio
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import { Laser } from './laser';
import { Asteroid } from './asteroid';
import { Explosion } from './explosion';
import { Enemy } from './enemy';
import { PowerUp, type PowerUpType } from './powerup';

import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

import { SpaceShip } from './spaceship';
import { InputController } from './inputController';
import { Stars } from './stars';
import { CamaraController } from './camaraController';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { Clock } from 'three';
import { Boss } from './boss';

export class App {

    canvas = document.getElementById("canvas") as HTMLCanvasElement;
    scene = new Scene();

    renderer = new WebGLRenderer({
        canvas: this.canvas,
        antialias: true
    });

    camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1500);

    audioListener = new AudioListener();
    audioLoader = new AudioLoader();
    musicaNormal = new Audio(this.audioListener);
    musicaAlerta = new Audio(this.audioListener);
    musicaJefe = new Audio(this.audioListener);
    bufferExplosionNormal: any = null;
    bufferExplosionJefe: any = null;
    sonidoPowerUp = new Audio(this.audioListener);

    inputController = new InputController();

    spaceship = new SpaceShip(this.scene, this.inputController, this.audioListener);
    camaraController = new CamaraController(this.camera, this.spaceship);

    declare orbitControls: OrbitControls;
    declare composer: EffectComposer;
    declare estrellas: Stars;

    gltfLoader = new GLTFLoader();
    modeloEnemigo: Object3D | null = null;
    modeloCaja: Object3D | null = null;
    modeloLaserUp: Object3D | null = null;

    lasers: Laser[] = [];
    enemyLasers: Laser[] = [];
    explosiones: Explosion[] = [];

    lastShootTime: number = 0;
    shootCooldown: number = 250;
    laserLevel: number = 1;
    powerups: PowerUp[] = [];

    probabilidadExtraTriple: number = 0.0; // Pity Timer

    reloj = new Clock();
    modeloJefe: Object3D | null = null;
    animacionesJefe: any[] = [];
    jefeFinal: Boss | null = null;

    godMode: boolean = false;

    sensibilidadNormal: number = 1.0;
    sensibilidadMira: number = 1.0;
    volumenGeneral: number = 0.5;

    mobileControlsEnabled: boolean = false;

    asteroides: Asteroid[] = [];
    cantidadAsteroides: number = 750;
    texturaRoca = new TextureLoader().load('/asteroide2.jpg');
    texturaRoca2 = new TextureLoader().load('/asteroide.jpg');

    enemigos: Enemy[] = [];
    lastEnemySpawn: number = 0;
    enemySpawnRate: number = 10000;

    tiempoRestanteOleada: number = 0;
    temporizadorOleada: any = null;
    enemigosPorAparecer: number = 0;
    generadorEnemigos: any = null;
    oleadaActual: number = 1;
    maxOleadas: number = 5;
    esperandoOleada: boolean = false;

    vidas: number = 3;
    kills: number = 0;
    declare hudElement: HTMLDivElement;
    declare killCounterElement: HTMLDivElement;
    alertaEnemigos: boolean = false;
    alertaDisparo: boolean = false;
    lastEnemyShotTime: number = 0;

    gameState: 'START' | 'PLAYING' | 'PAUSED' | 'GAMEOVER' | 'OPTIONS' | 'VICTORY' = 'START';
    previousState: 'START' | 'PAUSED' = 'START';
    pauseLocked: boolean = false;

    menuSelectedIndex: number = 0;
    menuInputLocked: boolean = false;
    xButtonLocked: boolean = false;

    crosshairEnabled: boolean = true;
    cameraMode: 'THIRD_PERSON' | 'FIRST_PERSON' = 'THIRD_PERSON';
    vKeyLocked: boolean = false;

    declare uiContainer: HTMLDivElement;
    declare crosshairElement: HTMLDivElement;
    declare indicatorsContainer: HTMLDivElement;
    declare mobileControlsContainer: HTMLDivElement;

    constructor() {
        this.mobileControlsEnabled = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        this.Config();
        this.CargarAudios();
        this.CreateInstances();
        this.CreateLights();
        this.CrearHUD();
        this.CrearSkybox();
        this.CrearMenus();
        this.CrearControlesMoviles();
        this.MostrarInicio();

        this.CreatePostProcessing();

        this.animate();

        window.addEventListener('resize', this.onWindowResize.bind(this));
    }

    CrearControlesMoviles() {
        this.mobileControlsContainer = document.createElement('div');
        this.mobileControlsContainer.style.position = 'absolute';
        this.mobileControlsContainer.style.top = '0';
        this.mobileControlsContainer.style.left = '0';
        this.mobileControlsContainer.style.width = '100vw';
        this.mobileControlsContainer.style.height = '100vh';
        this.mobileControlsContainer.style.pointerEvents = 'none';
        this.mobileControlsContainer.style.zIndex = '80';
        this.mobileControlsContainer.style.display = 'none';
        document.body.appendChild(this.mobileControlsContainer);

        const createJoystick = (isLeft: boolean) => {
            const base = document.createElement('div');
            base.style.position = 'absolute';
            base.style.bottom = '10vh';
            base.style.width = '120px';
            base.style.height = '120px';
            base.style.borderRadius = '50%';
            base.style.border = '2px solid rgba(255, 255, 255, 0.2)';
            base.style.background = 'rgba(0, 0, 0, 0.4)';
            base.style.pointerEvents = 'none';

            if (isLeft) base.style.left = '10vw';
            else base.style.right = '10vw';

            const knob = document.createElement('div');
            knob.style.position = 'absolute';
            knob.style.top = '50%';
            knob.style.left = '50%';
            knob.style.width = '50px';
            knob.style.height = '50px';
            knob.style.borderRadius = '50%';
            knob.style.background = 'rgba(255, 255, 255, 0.6)';
            knob.style.transform = 'translate(-50%, -50%)';
            knob.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
            base.appendChild(knob);

            return { base, knob };
        };

        const updateJoystick = (touch: Touch, base: HTMLDivElement, knob: HTMLDivElement, output: { x: number, y: number }) => {
            const rect = base.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            let dx = touch.clientX - centerX;
            let dy = touch.clientY - centerY;

            const maxR = rect.width / 2;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > maxR) {
                dx = (dx / distance) * maxR;
                dy = (dy / distance) * maxR;
            }

            knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
            output.x = dx / maxR;
            output.y = dy / maxR;
        };

        const leftZone = document.createElement('div');
        leftZone.style.position = 'absolute'; leftZone.style.left = '0'; leftZone.style.bottom = '0';
        leftZone.style.width = '50vw'; leftZone.style.height = '100vh'; leftZone.style.pointerEvents = 'auto';
        this.mobileControlsContainer.appendChild(leftZone);

        const rightZone = document.createElement('div');
        rightZone.style.position = 'absolute'; rightZone.style.right = '0'; rightZone.style.bottom = '0';
        rightZone.style.width = '50vw'; rightZone.style.height = '100vh'; rightZone.style.pointerEvents = 'auto';
        this.mobileControlsContainer.appendChild(rightZone);

        const joyLeft = createJoystick(true);
        this.mobileControlsContainer.appendChild(joyLeft.base);

        let leftTouchId: number | null = null;
        let lastLeftTapTime = 0;

        leftZone.addEventListener('touchstart', (e) => {
            e.preventDefault();
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                if (leftTouchId === null) {
                    leftTouchId = touch.identifier;

                    const now = Date.now();
                    if (now - lastLeftTapTime < 300) {
                        if (touch.clientX < window.innerWidth / 4) this.inputController.mobileRollLeft = true;
                        else this.inputController.mobileRollRight = true;

                        setTimeout(() => {
                            this.inputController.mobileRollLeft = false;
                            this.inputController.mobileRollRight = false;
                        }, 150);
                    }
                    lastLeftTapTime = now;
                    updateJoystick(touch, joyLeft.base, joyLeft.knob, this.inputController.mobileJoystickLeft);
                }
            }
        });

        leftZone.addEventListener('touchmove', (e) => {
            e.preventDefault();
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === leftTouchId) {
                    updateJoystick(e.changedTouches[i], joyLeft.base, joyLeft.knob, this.inputController.mobileJoystickLeft);
                }
            }
        });

        const resetLeft = (e: TouchEvent) => {
            e.preventDefault();
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === leftTouchId) {
                    leftTouchId = null;
                    joyLeft.knob.style.transform = `translate(-50%, -50%)`;
                    this.inputController.mobileJoystickLeft = { x: 0, y: 0 };
                }
            }
        };
        leftZone.addEventListener('touchend', resetLeft);
        leftZone.addEventListener('touchcancel', resetLeft);

        const joyRight = createJoystick(false);
        this.mobileControlsContainer.appendChild(joyRight.base);

        let rightTouchId: number | null = null;

        rightZone.addEventListener('touchstart', (e) => {
            e.preventDefault();
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                if (rightTouchId === null) {
                    rightTouchId = touch.identifier;
                    updateJoystick(touch, joyRight.base, joyRight.knob, this.inputController.mobileJoystickRight);
                }
            }
        });

        rightZone.addEventListener('touchmove', (e) => {
            e.preventDefault();
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === rightTouchId) {
                    updateJoystick(e.changedTouches[i], joyRight.base, joyRight.knob, this.inputController.mobileJoystickRight);
                }
            }
        });

        const resetRight = (e: TouchEvent) => {
            e.preventDefault();
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === rightTouchId) {
                    rightTouchId = null;
                    joyRight.knob.style.transform = `translate(-50%, -50%)`;
                    this.inputController.mobileJoystickRight = { x: 0, y: 0 };
                }
            }
        };
        rightZone.addEventListener('touchend', resetRight);
        rightZone.addEventListener('touchcancel', resetRight);

        const btnTurbo = document.createElement('div');
        btnTurbo.style.position = 'absolute';
        btnTurbo.style.left = '22vw';
        btnTurbo.style.top = '30vh';
        btnTurbo.style.width = '70px';
        btnTurbo.style.height = '70px';
        btnTurbo.style.borderRadius = '50%';
        btnTurbo.style.border = '3px solid #00ffff';
        btnTurbo.style.background = 'rgba(0, 255, 255, 0.1)';
        btnTurbo.style.pointerEvents = 'auto';
        btnTurbo.style.display = 'flex';
        btnTurbo.style.justifyContent = 'center';
        btnTurbo.style.alignItems = 'center';
        btnTurbo.innerHTML = '<span style="font-size: 24px;">🚀</span>';

        btnTurbo.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.inputController.mobileTurbo = true;
            btnTurbo.style.background = 'rgba(0, 255, 255, 0.4)';
        });
        btnTurbo.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.inputController.mobileTurbo = false;
            btnTurbo.style.background = 'rgba(0, 255, 255, 0.1)';
        });
        this.mobileControlsContainer.appendChild(btnTurbo);

        const btnShoot = document.createElement('div');
        btnShoot.style.position = 'absolute';
        btnShoot.style.right = '22vw';
        btnShoot.style.top = '30vh';
        btnShoot.style.width = '70px';
        btnShoot.style.height = '70px';
        btnShoot.style.borderRadius = '50%';
        btnShoot.style.border = '3px solid #ff3333';
        btnShoot.style.background = 'rgba(255, 51, 51, 0.1)';
        btnShoot.style.pointerEvents = 'auto';
        btnShoot.style.display = 'flex';
        btnShoot.style.justifyContent = 'center';
        btnShoot.style.alignItems = 'center';
        btnShoot.innerHTML = '<span style="font-size: 24px;">🎯</span>';

        btnShoot.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.inputController.mobileAimShoot = true;
            btnShoot.style.background = 'rgba(255, 51, 51, 0.4)';
        });
        btnShoot.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.inputController.mobileAimShoot = false;
            btnShoot.style.background = 'rgba(255, 51, 51, 0.1)';
        });
        this.mobileControlsContainer.appendChild(btnShoot);

        const btnPausa = document.createElement('div');
        btnPausa.style.position = 'absolute';
        btnPausa.style.right = '20px';
        btnPausa.style.top = '20px';
        btnPausa.style.width = '45px';
        btnPausa.style.height = '45px';
        btnPausa.style.borderRadius = '8px';
        btnPausa.style.border = '2px solid #ffcc00';
        btnPausa.style.background = 'rgba(255, 204, 0, 0.2)';
        btnPausa.style.pointerEvents = 'auto';
        btnPausa.style.display = 'flex';
        btnPausa.style.justifyContent = 'center';
        btnPausa.style.alignItems = 'center';
        btnPausa.innerHTML = '<span style="font-size: 18px;">⏸️</span>';

        btnPausa.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (this.gameState === 'PLAYING') this.MostrarPausa();
        });
        this.mobileControlsContainer.appendChild(btnPausa);
    }

    CargarAudios() {
        this.audioLoader.load('/Sounds/MusicLoop.mp3', (buffer) => {
            this.musicaNormal.setBuffer(buffer);
            this.musicaNormal.setLoop(true);
            this.musicaNormal.setVolume(0.4);
        });
        this.audioLoader.load('/Sounds/Alert.mp3', (buffer) => {
            this.musicaAlerta.setBuffer(buffer);
            this.musicaAlerta.setLoop(true);
            this.musicaAlerta.setVolume(0.15);
        });
        this.audioLoader.load('/Sounds/BossMusicLoop.mp3', (buffer) => {
            this.musicaJefe.setBuffer(buffer);
            this.musicaJefe.setLoop(true);
            this.musicaJefe.setVolume(0.6);
        });

        this.audioLoader.load('/Sounds/Explotion.mp3', (buffer) => {
            this.bufferExplosionNormal = buffer;
        });
        this.audioLoader.load('/Sounds/ExplotionAfterBossKill.mp3', (buffer) => {
            this.bufferExplosionJefe = buffer;
        });
        this.audioLoader.load('/Sounds/Drops.mp3', (buffer) => {
            this.sonidoPowerUp.setBuffer(buffer);
            this.sonidoPowerUp.setVolume(0.8);
        });
    }


    AjustarResolucion() {
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        const maxHeight = 720;

        let renderWidth = screenWidth;
        let renderHeight = screenHeight;

        if (screenHeight > maxHeight) {
            renderHeight = maxHeight;
            renderWidth = maxHeight * (screenWidth / screenHeight);
        }

        this.camera.aspect = screenWidth / screenHeight;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(renderWidth, renderHeight, false);
        this.renderer.domElement.style.width = '100vw';
        this.renderer.domElement.style.height = '100vh';

        if (this.composer) {
            this.composer.setSize(renderWidth, renderHeight);
        }
    }

    CreatePostProcessing() {
        const renderScene = new RenderPass(this.scene, this.camera);
        const bloom = new UnrealBloomPass(new Vector2(window.innerWidth, window.innerHeight), 2, 1, 0.85);
        bloom.strength = 0.85;
        bloom.radius = 0.33;
        bloom.threshold = 0.20;

        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(renderScene);
        this.composer.addPass(bloom);

        this.AjustarResolucion();
    }

    CreateInstances() {
        this.estrellas = new Stars(this.scene, 20000, 1000);
        this.estrellas.createStars();
        this.spaceship.loadmodel();
        this.CrearCampoAsteroides();

        for (let i = 0; i < 50; i++) {
            this.lasers.push(new Laser(this.scene));
        }

        for (let i = 0; i < 30; i++) {
            const laserRojo = new Laser(this.scene);
            laserRojo.velocidad = 3;
            const mat = laserRojo.mesh.material as MeshStandardMaterial;
            mat.color.setHex(0xff3333);
            mat.emissive.setHex(0xff3333);
            this.enemyLasers.push(laserRojo);
        }
        for (let i = 0; i < 30; i++) {
            this.explosiones.push(new Explosion(this.scene));
        }

        this.gltfLoader.load('/Models/low_poly_tie_fighter.glb', (gltf) => {
            this.modeloEnemigo = gltf.scene;
            this.modeloEnemigo.scale.set(5, 5, 5);
        });

        this.gltfLoader.load('/Models/low_poly_sci-fi_box.glb', (gltf) => {
            this.modeloCaja = gltf.scene;
            this.modeloCaja.scale.set(2.5, 2.5, 2.5);
            this.modeloLaserUp = gltf.scene;
        });

        this.gltfLoader.load('/Models/boss.glb', (gltf) => {
            this.modeloJefe = gltf.scene;
            this.animacionesJefe = gltf.animations;
        }, undefined, (error) => {
            console.error("Error cargando al jefe:", error);
        });
    }

    Config() {
        this.AjustarResolucion();

        this.camera.position.set(0, 8, -10);
        this.camera.lookAt(0, 0, 0);

        this.camera.add(this.audioListener);
        this.audioListener.setMasterVolume(this.volumenGeneral);

        this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
        this.orbitControls.enableDamping = true;

        this.renderer.toneMappingExposure = 2;
        this.scene.fog = new Fog(0x000000, 400, 1100);
    }

    CrearSkybox() {
        const loader = new CubeTextureLoader();
        const path = '/Space Skybox Pack/nebula/';

        const texture = loader.load([
            path + 'jettelly_space_nebulas_black_LEFT.png',
            path + 'jettelly_space_nebulas_black_RIGHT.png',
            path + 'jettelly_space_nebulas_black_UP.png',
            path + 'jettelly_space_nebulas_black_DOWN.png',
            path + 'jettelly_space_nebulas_black_FRONT.png',
            path + 'jettelly_space_nebulas_black_BACK.png'
        ]);

        this.scene.background = texture;
    }

    dispararLaser(offsetX: number) {
        const laser = this.lasers.find(l => !l.active);
        if (laser && this.spaceship.model) {
            laser.spawn(this.spaceship.model, offsetX);
        }
    }

    dispararLaserEnemigo(origen: Object3D) {
        this.lastEnemyShotTime = Date.now();
        const laserIzq = this.enemyLasers.find(l => !l.active);
        if (laserIzq) {
            laserIzq.spawn(origen, -0.8, -1.2);
        }

        const laserDer = this.enemyLasers.find(l => !l.active && l !== laserIzq);
        if (laserDer) {
            laserDer.spawn(origen, 0.8, -1.2);
        }
    }

    crearExplosion(pos: Vector3) {
        const exp = this.explosiones.find(e => !e.active);
        if (exp) exp.spawn(pos);
        this.ReproducirExplosionEnPosicion(pos, false);
    }

    ReproducirExplosionEnPosicion(posicion: Vector3, esJefe: boolean = false) {
        const pistaBuffer = esJefe ? this.bufferExplosionJefe : this.bufferExplosionNormal;
        if (!pistaBuffer) return;

        const sonidoEspacial = new PositionalAudio(this.audioListener);
        sonidoEspacial.setBuffer(pistaBuffer);

        sonidoEspacial.setRefDistance(300);
        sonidoEspacial.setVolume(esJefe ? 2.0 : 1.2);

        sonidoEspacial.position.copy(posicion);

        this.scene.add(sonidoEspacial);
        sonidoEspacial.play();

        const duracionMilisegundos = (pistaBuffer.duration * 1000) + 100;

        setTimeout(() => {
            if (sonidoEspacial.isPlaying) sonidoEspacial.stop();
            this.scene.remove(sonidoEspacial);
            sonidoEspacial.disconnect();
        }, duracionMilisegundos);
    }

    animate() {
        if (this.gameState !== 'PLAYING') {
            const buttons = Array.from(this.uiContainer.querySelectorAll('button')) as HTMLButtonElement[];
            if (buttons.length > 0) {
                const gamepad = navigator.getGamepads()[0];

                const navUp = (gamepad && (gamepad.buttons[12]?.pressed || gamepad.axes[1] < -0.5 || gamepad.axes[7] < -0.5)) ||
                    this.inputController.ispressed("ArrowUp") ||
                    this.inputController.ispressed("KeyW");

                const navDown = (gamepad && (gamepad.buttons[13]?.pressed || gamepad.axes[1] > 0.5 || gamepad.axes[7] > 0.5)) ||
                    this.inputController.ispressed("ArrowDown") ||
                    this.inputController.ispressed("KeyS");

                const navSelect = this.inputController.isControllerButtonPressed(0) ||
                    this.inputController.ispressed("Enter") ||
                    this.inputController.ispressed("Space");

                if (navUp || navDown) {
                    if (!this.menuInputLocked) {
                        this.menuInputLocked = true;
                        if (navUp) this.menuSelectedIndex = (this.menuSelectedIndex - 1 + buttons.length) % buttons.length;
                        if (navDown) this.menuSelectedIndex = (this.menuSelectedIndex + 1) % buttons.length;
                        this.actualizarFocoMenu(buttons);
                    }
                } else {
                    this.menuInputLocked = false;
                }

                if (navSelect) {
                    if (!this.xButtonLocked) {
                        this.xButtonLocked = true;
                        buttons[this.menuSelectedIndex]?.click();
                    }
                } else {
                    this.xButtonLocked = false;
                }
            }
        }

        const botonPausaPresionado = this.inputController.ispressed('Escape');

        if (botonPausaPresionado && !this.pauseLocked) {
            this.pauseLocked = true;
            if (this.gameState === 'PLAYING') this.MostrarPausa();
            else if (this.gameState === 'PAUSED') this.ReanudarJuego();
            else if (this.gameState === 'OPTIONS' && this.previousState === 'PAUSED') this.MostrarPausa();
        } else if (!botonPausaPresionado) {
            this.pauseLocked = false;
        }

        const deltaTime = this.reloj ? this.reloj.getDelta() : 0.016;

        if (this.estrellas && this.estrellas.star) {
            this.estrellas.star.position.copy(this.camera.position);
        }

        if (this.gameState === 'PLAYING') {

            if (this.mobileControlsEnabled) {
                const rightJoy = this.inputController.mobileJoystickRight;
                if (rightJoy.x !== 0 || rightJoy.y !== 0) {
                    this.inputController.mouseDeltaX += rightJoy.x * 20.0;
                    this.inputController.mouseDeltaY += rightJoy.y * 20.0;
                }
            }

            this.spaceship.sensibilidadNormalMultiplicador = this.sensibilidadNormal;
            this.spaceship.sensibilidadMiraMultiplicador = this.sensibilidadMira;

            this.spaceship.move();

            if (this.jefeFinal && this.spaceship && this.spaceship.model) {
                this.jefeFinal.update(deltaTime, this.spaceship.model.position);
            }

            const velocidadCrucero = 0.6;

            if (this.spaceship.model) {
                if (!this.spaceship.isBraking) {
                    this.spaceship.model.translateZ(velocidadCrucero);
                }

                const tiempo = Date.now() * 0.003;
                if (!this.isMoving() && !(this.spaceship as any).isRolling) {
                    this.spaceship.model.position.y += Math.sin(tiempo) * 0.0015;
                }
            }

            const botonV = this.inputController.ispressed('KeyV');
            if (botonV && !this.vKeyLocked) {
                this.vKeyLocked = true;
                this.cameraMode = (this.cameraMode === 'THIRD_PERSON') ? 'FIRST_PERSON' : 'THIRD_PERSON';
                if (this.spaceship.model) this.spaceship.model.visible = true;
            } else if (!botonV) {
                this.vKeyLocked = false;
            }

            if (this.spaceship.model) {
                const vectorArriba = new Vector3(0, 1, 0);
                vectorArriba.applyQuaternion(this.spaceship.model.quaternion);
                this.camera.up.copy(vectorArriba);

                const direccionNave = new Vector3();
                this.spaceship.model.getWorldDirection(direccionNave);

                if (this.cameraMode === 'THIRD_PERSON') {
                    const offsetCamara = new Vector3(0, 3, -12);
                    offsetCamara.applyQuaternion(this.spaceship.model.quaternion);
                    offsetCamara.add(this.spaceship.model.position);

                    this.camera.position.lerp(offsetCamara, 0.15);

                    const objetivoFrente = new Vector3(0, 0, 1000);
                    objetivoFrente.applyQuaternion(this.spaceship.model.quaternion);
                    objetivoFrente.add(this.spaceship.model.position);
                    this.camera.lookAt(objetivoFrente);

                } else {
                    this.camera.position.copy(this.spaceship.model.position);
                    this.camera.position.addScaledVector(vectorArriba, 2);
                    this.camera.position.addScaledVector(direccionNave, -4.5);

                    const objetivoFrente = this.camera.position.clone().add(direccionNave);
                    this.camera.lookAt(objetivoFrente);
                }
            }

            const apuntando = this.inputController.ispressed("KeyM");
            const turbo = this.inputController.ispressed("ShiftLeft") || this.inputController.ispressed("ShiftRight");

            let fovObjetivo = 75;

            if (apuntando) {
                fovObjetivo = 45;
            } else if (turbo) {
                fovObjetivo = 100;
            }

            this.camera.fov += (fovObjetivo - this.camera.fov) * 0.10;
            this.camera.updateProjectionMatrix();

            if (this.inputController.ispressed("KeyO") && this.spaceship.model) {
                const currentTime = Date.now();
                if (currentTime - this.lastShootTime > this.shootCooldown) {
                    if (this.laserLevel === 1) {
                        this.dispararLaser(0);
                    } else if (this.laserLevel === 2) {
                        this.dispararLaser(-1.5);
                        this.dispararLaser(1.5);
                    } else {
                        this.dispararLaser(0);
                        this.dispararLaser(-2);
                        this.dispararLaser(2);
                    }
                    this.lastShootTime = currentTime;
                }
            }

            for (let i = this.powerups.length - 1; i >= 0; i--) {
                const powerup = this.powerups[i];
                powerup.update();

                if (powerup.lifespan <= 0) {
                    powerup.dispose();
                    this.powerups.splice(i, 1);
                    continue;
                }

                if (this.spaceship.model && this.spaceship.model.position.distanceToSquared(powerup.model.position) < 1600.0) {

                    if (this.sonidoPowerUp.isPlaying) this.sonidoPowerUp.stop();
                    this.sonidoPowerUp.play();

                    if (powerup.type === 'HEAL') {
                        if (this.vidas < 3) this.vidas++;
                        this.probabilidadExtraTriple += 0.03;
                    } else if (powerup.type === 'DOUBLE_LASER') {
                        if (this.laserLevel < 2) this.laserLevel = 2;
                        this.probabilidadExtraTriple += 0.03;
                    } else if (powerup.type === 'TRIPLE_LASER') {
                        this.laserLevel = 3;
                    }

                    this.ActualizarHUD();
                    powerup.dispose();
                    this.powerups.splice(i, 1);
                }
            }

            let enemigoCercano = false;
            let indicadoresHTML = '';

            for (let i = this.enemigos.length - 1; i >= 0; i--) {
                const enemigo = this.enemigos[i];

                if (this.spaceship.model && enemigo.model) {
                    enemigo.update(this.spaceship.model.position);
                    const distSq = this.spaceship.model.position.distanceToSquared(enemigo.model.position);

                    if (distSq < 22500) {
                        const vectorAtraccion = new Vector3().subVectors(this.spaceship.model.position, enemigo.model.position).normalize();
                        enemigo.model.position.addScaledVector(vectorAtraccion, 3.0);
                    } else {
                        if (Math.random() < 0.05 && (Date.now() - this.lastEnemyShotTime > 3000)) {
                            this.dispararLaserEnemigo(enemigo.model);
                            enemigo.reproducirSonidoDisparo();
                        }
                    }

                    if (distSq < 202500) {
                        enemigoCercano = true;
                        const distanciaReal = Math.sqrt(distSq);

                        const posLocal = enemigo.model.position.clone();
                        this.camera.worldToLocal(posLocal);
                        const anguloRad = Math.atan2(posLocal.x, posLocal.y);
                        const opacidad = Math.max(0.2, 1.0 - (distanciaReal / 450));

                        indicadoresHTML += `
                            <div style="position: absolute; width: 100%; height: 100%; transform: rotate(${anguloRad}rad);">
                                <div style="margin: 0 auto; width: 70px; height: 15px; border-top: 5px solid rgba(255, 50, 50, ${opacidad}); border-radius: 50% 50% 0 0; box-shadow: 0 -10px 20px rgba(255, 0, 0, ${opacidad}); background: radial-gradient(ellipse at bottom, rgba(255,50,50,${opacidad * 0.5}) 0%, transparent 70%);"></div>
                            </div>
                        `;
                    }

                    if (distSq > 1690000) {
                        const direccionNave = new Vector3();
                        this.spaceship.model.getWorldDirection(direccionNave);

                        const direccionAleatoria = new Vector3(
                            (Math.random() - 0.5) * 2,
                            (Math.random() - 0.5) * 2,
                            (Math.random() - 0.5) * 2
                        ).normalize();

                        const direccionAparicion = direccionNave.multiplyScalar(0.8).add(direccionAleatoria.multiplyScalar(0.4)).normalize();

                        const radioAparicion = 800 + (Math.random() * 200);
                        const nuevaPos = this.spaceship.model.position.clone().addScaledVector(direccionAparicion, radioAparicion);

                        enemigo.model.position.copy(nuevaPos);
                        continue;
                    }

                    const radioEnemigo = (enemigo as any).radio !== undefined ? (enemigo as any).radio : 15.0;

                    if (this.spaceship.verificarColision(enemigo.model.position, Math.max(0, radioEnemigo - 2.0))) {
                        this.crearExplosion(enemigo.model.position);

                        this.kills++;
                        this.ActualizarKills();

                        const retroceso = new Vector3(0, 0, 15);
                        retroceso.applyQuaternion(this.spaceship.model.quaternion);
                        this.spaceship.model.position.add(retroceso);

                        enemigo.dispose();
                        this.enemigos.splice(i, 1);

                        if (!this.godMode) {
                            this.vidas--;
                            if (this.laserLevel > 1) this.laserLevel--;
                            this.spaceship.activarIFramesPostDano();
                        }
                        this.ActualizarHUD();
                        if (this.vidas <= 0 && !this.godMode) this.MostrarGameOver();
                    }
                }
            }

            for (let i = 0; i < this.enemyLasers.length; i++) {
                const laser = this.enemyLasers[i];
                if (!laser.active) continue;

                if (this.spaceship.model) {
                    const distSq = this.spaceship.model.position.distanceToSquared(laser.mesh.position);

                    if (distSq < 250000) {
                        const posLocal = laser.mesh.position.clone();
                        this.camera.worldToLocal(posLocal);

                        if (posLocal.z > 10) continue;

                        const anguloRad = Math.atan2(posLocal.x, posLocal.y);

                        indicadoresHTML += `
                            <div style="position: absolute; width: 100%; height: 100%; transform: rotate(${anguloRad}rad);">
                                <div style="margin: 0 auto; width: 25px; height: 15px; border-top: 8px solid #ff9900; border-radius: 50% 50% 0 0; box-shadow: 0 -15px 25px #ff9900; background: radial-gradient(ellipse at bottom, rgba(255,153,0,0.9) 0%, transparent 70%);"></div>
                            </div>
                        `;
                    }
                }
            }

            if (this.jefeFinal && this.spaceship.model) {
                const posLocalJefe = this.jefeFinal.model.position.clone();
                this.camera.worldToLocal(posLocalJefe);

                const anguloRadJefe = Math.atan2(posLocalJefe.x, posLocalJefe.y);

                indicadoresHTML += `
                    <div style="position: absolute; width: 100%; height: 100%; transform: rotate(${anguloRadJefe}rad);">
                        <div style="margin: 0 auto; width: 120px; height: 25px; border-top: 8px solid #ff3333; border-radius: 50% 50% 0 0; box-shadow: 0 -15px 30px #ff3333; background: radial-gradient(ellipse at bottom, rgba(255,51,51,0.8) 0%, transparent 70%);"></div>
                    </div>
                `;

                for (let j = 0; j < this.jefeFinal.proyectilesActivos.length; j++) {
                    const esfera = this.jefeFinal.proyectilesActivos[j];
                    const posLocalEsfera = esfera.position.clone();
                    this.camera.worldToLocal(posLocalEsfera);

                    if (posLocalEsfera.z <= 10) {
                        const anguloRadEsfera = Math.atan2(posLocalEsfera.x, posLocalEsfera.y);
                        indicadoresHTML += `
                            <div style="position: absolute; width: 100%; height: 100%; transform: rotate(${anguloRadEsfera}rad);">
                                <div style="margin: 0 auto; width: 40px; height: 15px; border-top: 8px solid #ff9900; border-radius: 50% 50% 0 0; box-shadow: 0 -15px 25px #ff9900; background: radial-gradient(ellipse at bottom, rgba(255,153,0,0.9) 0%, transparent 70%);"></div>
                            </div>
                        `;
                    }
                }
            }

            this.indicatorsContainer.innerHTML = indicadoresHTML;

            if (this.alertaEnemigos !== enemigoCercano) {
                this.alertaEnemigos = enemigoCercano;
                this.ActualizarHUD();
            }

            const bajoFuego = (Date.now() - this.lastEnemyShotTime) < 600;
            if (this.alertaDisparo !== bajoFuego) {
                this.alertaDisparo = bajoFuego;
                this.ActualizarHUD();
            }

            for (let i = 0; i < this.explosiones.length; i++) {
                if (this.explosiones[i].active) {
                    this.explosiones[i].update();
                }
            }

            for (const asteroide of this.asteroides) {
                asteroide.update();
                if (this.spaceship.model && asteroide.mesh) {
                    const distSqAst = this.spaceship.model.position.distanceToSquared(asteroide.mesh.position);

                    asteroide.mesh.visible = (distSqAst < 1300000);

                    if (distSqAst > 1690000) {
                        this.ReciclarAsteroide(asteroide);
                    }

                    if (this.spaceship.verificarColision(asteroide.mesh.position, asteroide.radio * 0.85)) {
                        this.crearExplosion(asteroide.mesh.position);

                        const retroceso = new Vector3(0, 0, 15);
                        retroceso.applyQuaternion(this.spaceship.model.quaternion);
                        this.spaceship.model.position.add(retroceso);
                        this.ReciclarAsteroide(asteroide);

                        if (!this.godMode) {
                            this.vidas--;
                            if (this.laserLevel > 1) this.laserLevel--;
                            this.spaceship.activarIFramesPostDano();
                        }
                        this.ActualizarHUD();

                        if (this.vidas <= 0 && !this.godMode) this.MostrarGameOver();
                    }
                }
            }

            for (let i = 0; i < this.lasers.length; i++) {
                const laser = this.lasers[i];
                if (!laser.active) continue;

                laser.update();
                let laserImpacto = false;

                for (const asteroide of this.asteroides) {
                    if (asteroide.mesh.visible && laser.mesh.position.distanceToSquared(asteroide.mesh.position) < Math.pow(asteroide.radio + 6.0, 2)) {
                        this.crearExplosion(asteroide.mesh.position);
                        this.ReciclarAsteroide(asteroide);
                        laserImpacto = true;
                        break;
                    }
                }

                if (!laserImpacto) {
                    for (let j = this.enemigos.length - 1; j >= 0; j--) {
                        const enemigo = this.enemigos[j];
                        const radioEnemigo = (enemigo as any).radio !== undefined ? (enemigo as any).radio : 15.0;

                        if (laser.mesh.position.distanceToSquared(enemigo.model.position) < Math.pow(radioEnemigo + 8.0, 2)) {
                            this.crearExplosion(enemigo.model.position);

                            this.kills++;
                            this.ActualizarKills();

                            if (Math.random() < 0.35) {
                                let tipo: PowerUpType = 'HEAL';
                                const azar = Math.random();

                                const thresholdTriple = Math.max(0.4, 0.85 - this.probabilidadExtraTriple);

                                if (azar >= thresholdTriple) {
                                    tipo = 'TRIPLE_LASER';
                                    this.probabilidadExtraTriple = 0.0;
                                } else if (azar >= 0.4) {
                                    tipo = 'DOUBLE_LASER';
                                } else {
                                    tipo = 'HEAL';
                                }

                                const modeloSeleccionado = this.modeloCaja;

                                if (modeloSeleccionado) {
                                    this.powerups.push(new PowerUp(this.scene, modeloSeleccionado, enemigo.model.position, tipo));
                                }
                            }

                            enemigo.dispose();
                            this.enemigos.splice(j, 1);
                            laserImpacto = true;
                            break;
                        }
                    }
                }

                if (!laserImpacto && this.jefeFinal && this.spaceship && this.spaceship.model) {
                    const impacto = this.jefeFinal.evaluarImpactoLaser(laser.mesh.position);

                    if (impacto === 'ESCUDO') {
                        this.crearExplosion(laser.mesh.position);
                        laserImpacto = true;
                    }
                    else if (impacto === 'OJO') {
                        this.crearExplosion(laser.mesh.position);
                        this.jefeFinal.recibirDano(1, this.spaceship.model.position);

                        if (this.jefeFinal.saludActual <= 0) {

                            const bossPos = this.jefeFinal.model.position.clone();
                            this.ReproducirExplosionEnPosicion(bossPos, true);

                            const duracionMuerteMs = this.bufferExplosionJefe ? (this.bufferExplosionJefe.duration * 1000) : 6000;

                            for (let k = 0; k < 12; k++) {
                                const offset = new Vector3((Math.random() - 0.5) * 40, (Math.random() - 0.5) * 40, (Math.random() - 0.5) * 40);
                                this.crearExplosion(bossPos.clone().add(offset));
                            }

                            let contadorExplosiones = 0;
                            const intervaloExplosiones = setInterval(() => {
                                const offset = new Vector3((Math.random() - 0.5) * 120, (Math.random() - 0.5) * 120, (Math.random() - 0.5) * 120);
                                this.crearExplosion(bossPos.clone().add(offset));
                                contadorExplosiones++;
                                if (contadorExplosiones > 35) clearInterval(intervaloExplosiones);
                            }, 100);

                            this.jefeFinal.dispose();
                            this.jefeFinal = null;

                            this.kills += 100;
                            this.ActualizarKills();

                            setTimeout(() => {
                                this.MostrarVictoria();
                            }, duracionMuerteMs + 200);
                        }
                        laserImpacto = true;
                    }
                }

                if (laserImpacto || laser.lifespan <= 0) {
                    laser.desactivar();
                }

                if (!laserImpacto && this.jefeFinal) {
                    for (let j = this.jefeFinal.proyectilesActivos.length - 1; j >= 0; j--) {
                        const esfera = this.jefeFinal.proyectilesActivos[j];

                        if (laser.mesh.position.distanceToSquared(esfera.position) < 100.0) {
                            this.crearExplosion(laser.mesh.position);
                            laserImpacto = true;

                            esfera.userData.vida -= 1;
                            esfera.scale.multiplyScalar(0.8);

                            if (esfera.userData.vida <= 0) {
                                this.crearExplosion(esfera.position);
                                this.jefeFinal.scene.remove(esfera);
                                this.jefeFinal.proyectilesActivos.splice(j, 1);
                            }
                            break;
                        }
                    }
                }
            }

            if (this.jefeFinal && this.spaceship.model) {
                if (this.jefeFinal.verificarColisionJugador(this.spaceship)) {
                    this.crearExplosion(this.spaceship.model.position);

                    const retroceso = new Vector3(0, 0, 15);
                    retroceso.applyQuaternion(this.spaceship.model.quaternion);
                    this.spaceship.model.position.add(retroceso);

                    if (!this.godMode) {
                        this.vidas--;
                        if (this.laserLevel > 1) this.laserLevel--;
                        this.spaceship.activarIFramesPostDano();
                    }
                    this.ActualizarHUD();
                    if (this.vidas <= 0 && !this.godMode) this.MostrarGameOver();
                }
            }

            for (let i = 0; i < this.enemyLasers.length; i++) {
                const laser = this.enemyLasers[i];
                if (!laser.active) continue;

                laser.update();

                if (this.spaceship.model) {
                    if (this.spaceship.verificarColision(laser.mesh.position, 2.0)) {
                        this.crearExplosion(this.spaceship.model.position);
                        laser.desactivar();

                        const retroceso = new Vector3(0, 0, 10);
                        retroceso.applyQuaternion(this.spaceship.model.quaternion);
                        this.spaceship.model.position.add(retroceso);

                        if (!this.godMode) {
                            this.vidas--;
                            if (this.laserLevel > 1) this.laserLevel--;
                            this.spaceship.activarIFramesPostDano();
                        }
                        this.ActualizarHUD();
                        if (this.vidas <= 0 && !this.godMode) this.MostrarGameOver();
                    }
                }

                if (laser.lifespan <= 0) {
                    laser.desactivar();
                }
            }

            for (let i = 0; i < this.lasers.length; i++) {
                const playerLaser = this.lasers[i];
                if (!playerLaser.active) continue;

                for (let j = 0; j < this.enemyLasers.length; j++) {
                    const enemyLaser = this.enemyLasers[j];
                    if (!enemyLaser.active) continue;

                    if (playerLaser.mesh.position.distanceToSquared(enemyLaser.mesh.position) < 16.0) {
                        const puntoMedio = playerLaser.mesh.position.clone().add(enemyLaser.mesh.position).multiplyScalar(0.5);
                        this.crearExplosion(puntoMedio);

                        playerLaser.desactivar();
                        enemyLaser.desactivar();

                        break;
                    }
                }
            }

            if (this.crosshairEnabled && this.spaceship.model) {
                this.crosshairElement.style.display = 'block';

                let x = window.innerWidth / 2;
                let y = window.innerHeight / 2;

                if (this.cameraMode === 'THIRD_PERSON') {
                    const puntoApuntado = new Vector3();
                    this.spaceship.model.getWorldDirection(puntoApuntado);
                    puntoApuntado.multiplyScalar(200);
                    puntoApuntado.add(this.spaceship.model.position);

                    puntoApuntado.project(this.camera);

                    x = (puntoApuntado.x * 0.5 + 0.5) * window.innerWidth;
                    y = (-(puntoApuntado.y * 0.5) + 0.5) * window.innerHeight;
                }

                this.crosshairElement.style.left = `${x}px`;
                this.crosshairElement.style.top = `${y}px`;

                this.indicatorsContainer.style.left = `${x}px`;
                this.indicatorsContainer.style.top = `${y}px`;
            } else {
                this.crosshairElement.style.display = 'none';
            }

            if (this.enemigos.length === 0 && this.enemigosPorAparecer === 0 && !this.esperandoOleada && this.gameState === 'PLAYING') {
                this.esperandoOleada = true;

                if (this.oleadaActual < this.maxOleadas) {
                    this.oleadaActual++;
                    this.PrepararOleada();
                }
            }
        }

        this.composer.render();
        requestAnimationFrame(this.animate.bind(this));
    }

    isMoving() {
        const keys = [
            "KeyW", "KeyA", "KeyS", "KeyD",
            "KeyJ", "KeyK", "KeyL", "KeyI",
            "KeyM", "KeyX", "ShiftLeft", "ShiftRight",
            "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"
        ];
        return keys.some(key => this.inputController.ispressed(key));
    }

    CreateLights() {
        const ambientLight = new AmbientLight(0xffffff, 0.5);
        const directionalLight = new DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 10, 5);
        this.scene.add(ambientLight);
        this.scene.add(directionalLight);
    }

    onWindowResize() {
        this.AjustarResolucion();
    }

    CrearCampoAsteroides() {
        for (let i = 0; i < this.cantidadAsteroides; i++) {
            let radioAst = (Math.random() > 0.3) ? (Math.random() * 4 + 1) : (Math.random() * 10 + 6);
            let texturaUsada = (i % 2 === 0) ? this.texturaRoca : this.texturaRoca2;

            const radioSpawn = 150 + Math.random() * 1050;
            const theta = Math.random() * 2 * Math.PI;
            const phi = Math.acos(2 * Math.random() - 1);

            const posAleatoria = new Vector3(
                radioSpawn * Math.sin(phi) * Math.cos(theta),
                radioSpawn * Math.sin(phi) * Math.sin(theta),
                radioSpawn * Math.cos(phi)
            );

            this.asteroides.push(new Asteroid(this.scene, posAleatoria, radioAst, texturaUsada));
        }
    }

    ReciclarAsteroide(asteroide: Asteroid) {
        if (!this.spaceship.model) return;

        const distanciaSpawn = 1000 + Math.random() * 200;

        const direccionNave = new Vector3();
        this.spaceship.model.getWorldDirection(direccionNave);

        const direccionAleatoria = new Vector3(
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2
        ).normalize();

        const direccionAparicion = direccionNave.multiplyScalar(0.75).add(direccionAleatoria.multiplyScalar(0.4)).normalize();

        const nuevoPunto = this.spaceship.model.position.clone().addScaledVector(direccionAparicion, distanciaSpawn);

        asteroide.reposicionar(nuevoPunto);
    }

    CrearHUD() {
        const style = document.createElement('style');
        style.innerHTML = `@keyframes parpadeoAlerta { 0% { opacity: 1; text-shadow: 0 0 20px #ff3333; } 50% { opacity: 0.3; text-shadow: none; } 100% { opacity: 1; text-shadow: 0 0 20px #ff3333; } }`;
        document.head.appendChild(style);

        this.hudElement = document.createElement('div');
        this.hudElement.style.position = 'absolute';
        this.hudElement.style.top = '30px';
        this.hudElement.style.left = '30px';
        this.hudElement.style.fontFamily = '"Courier New", Courier, monospace';
        this.hudElement.style.fontWeight = 'bold';
        this.hudElement.style.letterSpacing = '2px';
        this.hudElement.style.backgroundColor = 'rgba(0, 20, 30, 0.75)';
        this.hudElement.style.padding = '12px 25px';
        this.hudElement.style.border = '1px solid #00ffff';
        this.hudElement.style.borderLeft = '6px solid #00ffff';
        this.hudElement.style.borderRadius = '4px';
        this.hudElement.style.pointerEvents = 'none';

        document.body.appendChild(this.hudElement);
        this.ActualizarHUD();

        this.killCounterElement = document.createElement('div');
        this.killCounterElement.style.position = 'absolute';
        this.killCounterElement.style.bottom = '20px';
        this.killCounterElement.style.left = '50%';
        this.killCounterElement.style.transform = 'translateX(-50%)';
        this.killCounterElement.style.fontFamily = '"Courier New", Courier, monospace';
        this.killCounterElement.style.fontWeight = 'bold';
        this.killCounterElement.style.fontSize = '22px';
        this.killCounterElement.style.color = '#aaaaaa';
        this.killCounterElement.style.letterSpacing = '2px';
        this.killCounterElement.style.backgroundColor = 'rgba(0, 20, 30, 0.75)';
        this.killCounterElement.style.padding = '8px 25px';
        this.killCounterElement.style.border = '1px solid #ff3333';
        this.killCounterElement.style.borderBottom = '4px solid #ff3333';
        this.killCounterElement.style.borderRadius = '4px';
        this.killCounterElement.style.pointerEvents = 'none';

        document.body.appendChild(this.killCounterElement);
        this.ActualizarKills();
    }

    ActualizarHUD() {
        const vidasSeguras = Math.max(0, this.vidas);

        const escudosActivos = '■ '.repeat(vidasSeguras);
        const escudosPerdidos = '□ '.repeat(Math.max(0, 3 - vidasSeguras));

        let colorEstado = '#00ffff';
        let textoEstado = 'ÓPTIMA';

        if (this.vidas === 2) {
            colorEstado = '#ffcc00';
            textoEstado = 'DAÑADA';
        } else if (this.vidas <= 1) {
            colorEstado = '#ff3333';
            textoEstado = 'CRÍTICA';
        }

        this.hudElement.style.borderLeftColor = colorEstado;
        this.hudElement.style.boxShadow = `0 0 15px ${colorEstado}40`;

        let colorLaser = '#00ffff';
        if (this.laserLevel === 2) colorLaser = '#4488ff';
        if (this.laserLevel === 3) colorLaser = '#ff00ff';

        const textoLaser = `<span style="font-size: 18px; font-weight: bold; color: ${colorLaser}; text-shadow: 0 0 10px ${colorLaser}; margin-left: 20px; vertical-align: text-bottom; letter-spacing: 1px;">LÁSER x${this.laserLevel}</span>`;

        let radarHTML = '';
        if (this.jefeFinal) {
            radarHTML = `<div style="color: #ff00ff; font-size: 16px; margin-top: 15px; font-weight: bold; text-shadow: 0 0 15px #ff00ff; animation: parpadeoAlerta 0.3s infinite;">⚠️ AMENAZA CLASE OMEGA ⚠️</div>`;
        }
        else if (this.alertaDisparo) {
            radarHTML = `<div style="color: #ff0000; font-size: 16px; margin-top: 15px; font-weight: bold; text-shadow: 0 0 15px #ff0000; animation: parpadeoAlerta 0.2s infinite;">🔴 ¡EVASIÓN: DISPARO ENTRANTE! 🔴</div>`;
        }
        else if (this.alertaEnemigos) {
            radarHTML = `<div style="color: #ff3333; font-size: 14px; margin-top: 15px; animation: parpadeoAlerta 1s infinite;">⚠️ PELIGRO: HOSTILES CERCA ⚠️</div>`;
        }
        else {
            radarHTML = `<div style="color: #00ffff; font-size: 14px; margin-top: 15px; opacity: 0.5;">RADAR: ZONA DESPEJADA</div>`;
        }

        let overlayOleada = '';
        if (this.esperandoOleada && this.tiempoRestanteOleada > 0) {
            overlayOleada = `
                <div style="position: fixed; top: 15%; left: 50%; transform: translateX(-50%); text-align: center; font-family: 'Courier New', monospace; pointer-events: none; z-index: 100;">
                    <div style="font-size: 16px; color: #ffcc00; text-shadow: 0 0 10px #ffcc00; margin-bottom: 8px; animation: parpadeoAlerta 1s infinite;">
                        DETECTANDO SEÑALES DE SALTO HIPERESPACIAL...
                    </div>
                    <div style="font-size: 20px; color: #ffffff; text-shadow: 0 0 15px #00ffff; letter-spacing: 3px;">
                        OLEADA ${this.oleadaActual} EN:
                    </div>
                    <div style="font-size: 45px; font-weight: bold; color: #ff3333; text-shadow: 0 0 20px #ff3333;">
                        - ${this.tiempoRestanteOleada} -
                    </div>
                </div>
            `;
        }

        this.hudElement.innerHTML = `
            <div style="font-size: 12px; color: #aaaaaa; margin-bottom: 8px; letter-spacing: 3px;">
                INTEGRIDAD: <span style="color: ${colorEstado}">${textoEstado}</span>
            </div>
            <div style="font-size: 28px; line-height: 1; margin-bottom: 12px;">
                <span style="color: ${colorEstado}; text-shadow: 0 0 10px ${colorEstado};">
                    ${escudosActivos}
                </span><span style="color: #444444; text-shadow: none;">
                    ${escudosPerdidos}
                </span>
                ${textoLaser}
            </div>
            <div style="font-size: 12px; color: #ffcc00; letter-spacing: 3px; text-shadow: 0 0 10px #ffcc00;">
                OLEADA: ${this.oleadaActual} / ${this.maxOleadas}
            </div>
            ${radarHTML}
            ${overlayOleada}
        `;
    }

    ActualizarKills() {
        this.killCounterElement.innerHTML = `BAJAS: <span style="color: #ff3333; text-shadow: 0 0 15px #ff3333;">${this.kills}</span>`;
    }

    ReiniciarJuego() {
        this.vidas = 3;
        this.laserLevel = 1;
        this.kills = 0;
        this.alertaDisparo = false;
        this.oleadaActual = 1;
        this.probabilidadExtraTriple = 0.0;

        if (this.jefeFinal) {
            this.jefeFinal.dispose();
            this.jefeFinal = null;
        }

        if (this.temporizadorOleada) clearInterval(this.temporizadorOleada);
        if (this.generadorEnemigos) clearInterval(this.generadorEnemigos);
        this.enemigosPorAparecer = 0;

        this.ActualizarHUD();
        this.ActualizarKills();

        if (this.spaceship.model) {
            this.spaceship.model.position.set(0, 0, 0);
            this.spaceship.model.rotation.set(0, 0, 0);
            this.camera.position.set(0, 8, -10);
            this.camera.lookAt(0, 0, 0);
        }

        for (const asteroide of this.asteroides) {
            const radioSpawn = 150 + Math.random() * 1050;
            const theta = Math.random() * 2 * Math.PI;
            const phi = Math.acos(2 * Math.random() - 1);

            const posAleatoria = new Vector3(
                radioSpawn * Math.sin(phi) * Math.cos(theta),
                radioSpawn * Math.sin(phi) * Math.sin(theta),
                radioSpawn * Math.cos(phi)
            );
            asteroide.reposicionar(posAleatoria);
        }

        this.explosiones.forEach(e => e.desactivar());
        this.lasers.forEach(l => l.desactivar());

        if (this.enemyLasers) {
            this.enemyLasers.forEach(l => l.desactivar());
        }

        this.enemigos.forEach(e => e.dispose());
        this.enemigos = [];
        this.powerups.forEach(p => p.dispose());
        this.powerups = [];
        this.indicatorsContainer.innerHTML = '';

        if (this.musicaJefe.isPlaying) this.musicaJefe.stop();

        this.ReanudarJuego();

        this.PrepararOleada();
    }

    PrepararOleada() {
        this.esperandoOleada = true;
        this.tiempoRestanteOleada = 10;
        this.ActualizarHUD();

        if (this.musicaNormal.isPlaying) this.musicaNormal.pause();
        if (!this.musicaAlerta.isPlaying) this.musicaAlerta.play();

        if (this.temporizadorOleada) clearInterval(this.temporizadorOleada);

        this.temporizadorOleada = setInterval(() => {
            if (this.gameState !== 'PLAYING') return;

            this.tiempoRestanteOleada--;
            this.ActualizarHUD();

            if (this.tiempoRestanteOleada <= 0) {
                clearInterval(this.temporizadorOleada);
                this.ComenzarGeneracionEnemigos();
            }
        }, 1000);
    }

    ComenzarGeneracionEnemigos() {
        this.esperandoOleada = false;
        this.ActualizarHUD();

        if (this.musicaAlerta.isPlaying) this.musicaAlerta.stop();

        if (this.oleadaActual >= 5) {
            if (this.musicaNormal.isPlaying) this.musicaNormal.stop();
            if (!this.musicaJefe.isPlaying) this.musicaJefe.play();

            if (this.modeloJefe && this.spaceship.model) {
                const posAparicion = this.spaceship.model.position.clone();
                const direccionNave = new Vector3();
                this.spaceship.model.getWorldDirection(direccionNave);

                posAparicion.addScaledVector(direccionNave, 800);

                this.jefeFinal = new Boss(this.scene, this.modeloJefe, posAparicion, this.animacionesJefe, this.audioListener);
                this.ActualizarHUD();
            }
            return;
        }

        if (!this.musicaNormal.isPlaying) this.musicaNormal.play();
        this.enemigosPorAparecer = 3 + (this.oleadaActual * 2);

        if (this.generadorEnemigos) clearInterval(this.generadorEnemigos);

        this.generadorEnemigos = setInterval(() => {
            if (this.gameState !== 'PLAYING') return;

            if (this.enemigosPorAparecer > 0) {
                this.GenerarUnEnemigo();
                this.enemigosPorAparecer--;
            } else {
                clearInterval(this.generadorEnemigos);
            }
        }, 1500);
    }

    GenerarUnEnemigo() {
        if (!this.modeloEnemigo) return;

        const posJugador = this.spaceship.model ? this.spaceship.model.position.clone() : new Vector3(0, 0, 0);
        const radioAparicion = 600 + (Math.random() * 200);

        const offsetAleatorio = new Vector3(
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2
        ).normalize().multiplyScalar(radioAparicion);

        const posAleatoria = posJugador.clone().add(offsetAleatorio);

        const enemigo = new Enemy(this.scene, this.modeloEnemigo, posAleatoria, posJugador, this.audioListener);

        this.enemigos.push(enemigo);
    }

    CrearMenus() {
        this.crosshairElement = document.createElement('div');
        this.crosshairElement.innerHTML = '✛';
        this.crosshairElement.style.position = 'absolute';
        this.crosshairElement.style.top = '50%';
        this.crosshairElement.style.left = '50%';
        this.crosshairElement.style.transform = 'translate(-50%, -50%)';
        this.crosshairElement.style.color = 'rgba(0, 255, 255, 0.7)';
        this.crosshairElement.style.fontSize = '24px';
        this.crosshairElement.style.pointerEvents = 'none';
        this.crosshairElement.style.textShadow = '0 0 10px #00ffff';
        document.body.appendChild(this.crosshairElement);

        this.indicatorsContainer = document.createElement('div');
        this.indicatorsContainer.style.position = 'absolute';
        this.indicatorsContainer.style.top = '50%';
        this.indicatorsContainer.style.left = '50%';
        this.indicatorsContainer.style.width = '250px';
        this.indicatorsContainer.style.height = '250px';
        this.indicatorsContainer.style.transform = 'translate(-50%, -50%)';
        this.indicatorsContainer.style.pointerEvents = 'none';
        document.body.appendChild(this.indicatorsContainer);

        this.uiContainer = document.createElement('div');
        this.uiContainer.style.position = 'absolute';
        this.uiContainer.style.top = '0';
        this.uiContainer.style.left = '0';
        this.uiContainer.style.width = '100vw';
        this.uiContainer.style.height = '100vh';
        this.uiContainer.style.backgroundColor = 'rgba(0, 10, 20, 0.85)';
        this.uiContainer.style.display = 'flex';
        this.uiContainer.style.flexDirection = 'column';
        this.uiContainer.style.justifyContent = 'center';
        this.uiContainer.style.alignItems = 'center';
        this.uiContainer.style.fontFamily = '"Courier New", Courier, monospace';
        this.uiContainer.style.zIndex = '10';
        document.body.appendChild(this.uiContainer);
    }

    actualizarFocoMenu(buttons: HTMLButtonElement[]) {
        this.menuSelectedIndex = Math.max(0, Math.min(this.menuSelectedIndex, buttons.length - 1));
        buttons.forEach((btn, index) => {
            if (index === this.menuSelectedIndex) {
                btn.style.background = 'rgba(0, 255, 255, 0.4)';
                btn.style.borderColor = '#ffffff';
                btn.style.boxShadow = '0 0 15px #00ffff';
            } else {
                btn.style.background = 'rgba(0, 255, 255, 0.1)';
                btn.style.borderColor = '#00ffff';
                btn.style.boxShadow = 'none';
            }
        });
    }

    generarBotonHTML(id: string, texto: string) {
        return `<button id="${id}" style="background: rgba(0, 255, 255, 0.1); color: #00ffff; border: 1px solid #00ffff; padding: 15px 40px; margin: 10px; font-size: 20px; font-family: 'Courier New', monospace; cursor: pointer; text-transform: uppercase; transition: 0.3s;" onmouseover="this.style.background='rgba(0,255,255,0.3)'" onmouseout="this.style.background='rgba(0,255,255,0.1)'">${texto}</button>`;
    }

    MostrarInicio() {

        // Salir del Pointer Lock solo si está disponible, para que funcione en iOS.
        if (typeof document.exitPointerLock === 'function') {
            document.exitPointerLock();
        }

        // Suspender audio de forma segura
        if (this.audioListener.context.state !== 'closed') {
            this.audioListener.context.suspend().catch(console.warn);
        }

        this.gameState = 'START';
        this.previousState = 'START';
        this.uiContainer.style.display = 'flex';
        this.menuSelectedIndex = 0;

        this.hudElement.style.display = 'none';
        this.killCounterElement.style.display = 'none';
        this.crosshairElement.style.display = 'none';
        this.indicatorsContainer.style.display = 'none';
        if (this.mobileControlsContainer) this.mobileControlsContainer.style.display = 'none';

        this.uiContainer.innerHTML = `
            <h1 style="color: #00ffff; 
            font-size: clamp(28px, 7vw, 60px);
            text-shadow: 0 0 20px #00ffff; margin-bottom: 10px;">SPACE SHOOTER</h1>
            <h3 style="color: #aaaaaa; margin-bottom: 50px; letter-spacing: 5px;">PROYECTO FINAL</h3>
            ${this.generarBotonHTML('btn-jugar', 'Iniciar Misión')}
            ${this.generarBotonHTML('btn-opciones', 'Opciones')}
        `;
        //document.getElementById('btn-jugar')!.onclick = () => this.ReiniciarJuego();

        const btnJugar = document.getElementById('btn-jugar');

        if (btnJugar) {
            btnJugar.onclick = async () => {
                try {
                    if (!document.fullscreenElement) {
                        await document.documentElement.requestFullscreen();
                    }

                    await screen.orientation.lock('landscape');

                } catch (error) {
                    console.error("Error al configurar pantalla:", error);
                }

                this.ReiniciarJuego();
            };
        }



        document.getElementById('btn-opciones')!.onclick = () => this.MostrarOpciones();

        const buttons = Array.from(this.uiContainer.querySelectorAll('button')) as HTMLButtonElement[];
        this.actualizarFocoMenu(buttons);
    }

    MostrarPausa() {
        document.exitPointerLock();
        this.audioListener.context.suspend();

        this.gameState = 'PAUSED';
        this.previousState = 'PAUSED';
        this.uiContainer.style.display = 'flex';
        this.menuSelectedIndex = 0;

        this.hudElement.style.display = 'none';
        this.killCounterElement.style.display = 'none';
        this.crosshairElement.style.display = 'none';
        this.indicatorsContainer.style.display = 'none';
        if (this.mobileControlsContainer) this.mobileControlsContainer.style.display = 'none';

        this.uiContainer.innerHTML = `
            <h1 style="color: #ffcc00; font-size: 50px; text-shadow: 0 0 20px #ffcc00; margin-bottom: 40px;">JUEGO PAUSADO</h1>
            ${this.generarBotonHTML('btn-reanudar', 'Reanudar')}
            ${this.generarBotonHTML('btn-opciones', 'Opciones')}
        `;
        document.getElementById('btn-reanudar')!.onclick = () => this.ReanudarJuego();
        document.getElementById('btn-opciones')!.onclick = () => this.MostrarOpciones();

        const buttons = Array.from(this.uiContainer.querySelectorAll('button')) as HTMLButtonElement[];
        this.actualizarFocoMenu(buttons);
    }

    MostrarOpciones() {
        document.exitPointerLock();

        this.gameState = 'OPTIONS';
        this.uiContainer.style.display = 'flex';
        this.menuSelectedIndex = 0;

        const textoMira = this.crosshairEnabled ? 'Ocultar Mira' : 'Mostrar Mira';
        const textoCamara = this.cameraMode === 'THIRD_PERSON' ? 'Cámara: 3ra Persona' : 'Cámara: 1ra Persona';
        const textoMovil = this.mobileControlsEnabled ? 'Controles Móviles: ON' : 'Controles Móviles: OFF';

        this.uiContainer.innerHTML = `
            <h1 style="color: #00ffff; font-size: 40px; text-shadow: 0 0 20px #00ffff; margin-bottom: 30px;">OPCIONES</h1>
            
            <div style="display: flex; align-items: center; margin: 10px; background: rgba(0, 255, 255, 0.1); border: 1px solid #00ffff; padding: 10px 20px; border-radius: 5px;">
                <label style="color: #00ffff; font-size: 20px; font-family: 'Courier New', monospace; width: 280px;">VOLUMEN GENERAL:</label>
                <input type="rang e" id="slider-volumen" min="0.0" max="1.0" step="0.05" value="${this.volumenGeneral}" style="width: 200px; cursor: pointer; accent-color: #00ffff;">
                <span id="val-volumen" style="color: #fff; font-family: 'Courier New', monospace; width: 70px; text-align: right; font-size: 20px;">${Math.round(this.volumenGeneral * 100)}%</span>
                <button id="btn-reset-volumen" title="Restablecer" style="background: none; border: none; color: #ff3333; font-size: 28px; cursor: pointer; margin-left: 15px; text-shadow: 0 0 10px #ff3333; transition: transform 0.2s;" onmouseover="this.style.transform='rotate(-45deg)'" onmouseout="this.style.transform='rotate(0deg)'">⟲</button>
            </div>

            <div style="display: flex; align-items: center; margin: 10px; background: rgba(0, 255, 255, 0.1); border: 1px solid #00ffff; padding: 10px 20px; border-radius: 5px;">
                <label style="color: #00ffff; font-size: 20px; font-family: 'Courier New', monospace; width: 280px;">SENS. NORMAL:</label>
                <input type="range" id="slider-normal" min="0.1" max="3.0" step="0.1" value="${this.sensibilidadNormal}" style="width: 200px; cursor: pointer; accent-color: #00ffff;">
                <span id="val-normal" style="color: #fff; font-family: 'Courier New', monospace; width: 70px; text-align: right; font-size: 20px;">${this.sensibilidadNormal.toFixed(1)}x</span>
                <button id="btn-reset-normal" title="Restablecer" style="background: none; border: none; color: #ff3333; font-size: 28px; cursor: pointer; margin-left: 15px; text-shadow: 0 0 10px #ff3333; transition: transform 0.2s;" onmouseover="this.style.transform='rotate(-45deg)'" onmouseout="this.style.transform='rotate(0deg)'">⟲</button>
            </div>

            <div style="display: flex; align-items: center; margin: 10px; background: rgba(0, 255, 255, 0.1); border: 1px solid #00ffff; padding: 10px 20px; border-radius: 5px;">
                <label style="color: #00ffff; font-size: 20px; font-family: 'Courier New', monospace; width: 280px;">SENS. MIRA (ADS):</label>
                <input type="range" id="slider-mira" min="0.1" max="3.0" step="0.1" value="${this.sensibilidadMira}" style="width: 200px; cursor: pointer; accent-color: #00ffff;">
                <span id="val-mira" style="color: #fff; font-family: 'Courier New', monospace; width: 70px; text-align: right; font-size: 20px;">${this.sensibilidadMira.toFixed(1)}x</span>
                <button id="btn-reset-mira" title="Restablecer" style="background: none; border: none; color: #ff3333; font-size: 28px; cursor: pointer; margin-left: 15px; text-shadow: 0 0 10px #ff3333; transition: transform 0.2s;" onmouseover="this.style.transform='rotate(-45deg)'" onmouseout="this.style.transform='rotate(0deg)'">⟲</button>
            </div>

            <div style="margin-top: 20px;">
                ${this.generarBotonHTML('btn-crosshair', textoMira)}
                ${this.generarBotonHTML('btn-camara', textoCamara)}
                ${this.generarBotonHTML('btn-movil', textoMovil)} 
            </div>
            <div style="margin-top: 5px;">
                ${this.generarBotonHTML('btn-volver', 'Volver')}
            </div>
        `;

        const sliderVolumen = document.getElementById('slider-volumen') as HTMLInputElement;
        const valVolumen = document.getElementById('val-volumen')!;
        sliderVolumen.oninput = () => {
            this.volumenGeneral = parseFloat(sliderVolumen.value);
            valVolumen.innerText = Math.round(this.volumenGeneral * 100) + '%';
            this.audioListener.setMasterVolume(this.volumenGeneral);
        };

        const sliderNormal = document.getElementById('slider-normal') as HTMLInputElement;
        const valNormal = document.getElementById('val-normal')!;
        sliderNormal.oninput = () => {
            this.sensibilidadNormal = parseFloat(sliderNormal.value);
            valNormal.innerText = this.sensibilidadNormal.toFixed(1) + 'x';
        };

        const sliderMira = document.getElementById('slider-mira') as HTMLInputElement;
        const valMira = document.getElementById('val-mira')!;
        sliderMira.oninput = () => {
            this.sensibilidadMira = parseFloat(sliderMira.value);
            valMira.innerText = this.sensibilidadMira.toFixed(1) + 'x';
        };

        document.getElementById('btn-reset-volumen')!.onclick = () => {
            this.volumenGeneral = 0.5;
            sliderVolumen.value = "0.5";
            valVolumen.innerText = "50%";
            this.audioListener.setMasterVolume(0.5);
        };

        document.getElementById('btn-reset-normal')!.onclick = () => {
            this.sensibilidadNormal = 1.0;
            sliderNormal.value = "1.0";
            valNormal.innerText = "1.0x";
        };

        document.getElementById('btn-reset-mira')!.onclick = () => {
            this.sensibilidadMira = 1.0;
            sliderMira.value = "1.0";
            valMira.innerText = "1.0x";
        };

        document.getElementById('btn-crosshair')!.onclick = () => {
            this.crosshairEnabled = !this.crosshairEnabled;
            this.MostrarOpciones();
        };

        document.getElementById('btn-camara')!.onclick = () => {
            this.cameraMode = (this.cameraMode === 'THIRD_PERSON') ? 'FIRST_PERSON' : 'THIRD_PERSON';
            if (this.spaceship.model) this.spaceship.model.visible = true;
            this.MostrarOpciones();
        };

        document.getElementById('btn-movil')!.onclick = () => {
            this.mobileControlsEnabled = !this.mobileControlsEnabled;
            this.MostrarOpciones();
        };

        document.getElementById('btn-volver')!.onclick = () => {
            if (this.previousState === 'START') this.MostrarInicio();
            else this.MostrarPausa();
        };

        const buttons = Array.from(this.uiContainer.querySelectorAll('button[id^="btn-"]:not([id*="reset"])')) as HTMLButtonElement[];
        this.actualizarFocoMenu(buttons);
    }

    MostrarGameOver() {
        document.exitPointerLock();

        if (this.musicaJefe.isPlaying) this.musicaJefe.stop();
        if (this.musicaNormal.isPlaying) this.musicaNormal.stop();
        if (this.musicaAlerta.isPlaying) this.musicaAlerta.stop();

        this.gameState = 'GAMEOVER';
        this.uiContainer.style.display = 'flex';
        this.menuSelectedIndex = 0;

        this.hudElement.style.display = 'none';
        this.killCounterElement.style.display = 'none';
        this.crosshairElement.style.display = 'none';
        this.indicatorsContainer.style.display = 'none';
        if (this.mobileControlsContainer) this.mobileControlsContainer.style.display = 'none';

        this.uiContainer.innerHTML = `
            <h1 style="color: #ff3333; font-size: 70px; text-shadow: 0 0 30px #ff3333; margin-bottom: 20px;">HAS MUERTO</h1>
            <h3 style="color: #aaaaaa; margin-bottom: 50px;">INTEGRIDAD DEL CASCO CRÍTICA</h3>
            ${this.generarBotonHTML('btn-reintentar', 'Reintentar')}
        `;
        document.getElementById('btn-reintentar')!.onclick = () => this.ReiniciarJuego();

        const buttons = Array.from(this.uiContainer.querySelectorAll('button')) as HTMLButtonElement[];
        this.actualizarFocoMenu(buttons);
    }

    MostrarVictoria() {
        document.exitPointerLock();

        if (this.musicaJefe.isPlaying) this.musicaJefe.stop();
        if (this.musicaNormal.isPlaying) this.musicaNormal.stop();
        if (this.musicaAlerta.isPlaying) this.musicaAlerta.stop();

        this.gameState = 'VICTORY';
        this.uiContainer.style.display = 'flex';
        this.menuSelectedIndex = 0;

        this.hudElement.style.display = 'none';
        this.killCounterElement.style.display = 'none';
        this.crosshairElement.style.display = 'none';
        this.indicatorsContainer.style.display = 'none';
        if (this.mobileControlsContainer) this.mobileControlsContainer.style.display = 'none';

        this.uiContainer.innerHTML = `
            <h1 style="color: #ffcc00; font-size: 70px; text-shadow: 0 0 30px #ffcc00; margin-bottom: 10px;">¡MISIÓN CUMPLIDA!</h1>
            <h3 style="color: #00ffff; margin-bottom: 30px; font-size: 24px; letter-spacing: 2px;">ANOMALÍA OMEGA ELIMINADA</h3>
            
            <div style="background: rgba(0, 20, 30, 0.8); border: 1px solid #00ffff; padding: 25px; text-align: center; margin-bottom: 40px; border-radius: 10px; width: 60%; max-width: 600px; box-shadow: 0 0 20px rgba(0, 255, 255, 0.2);">
                <h2 style="color: #ffffff; margin-bottom: 20px; border-bottom: 1px solid #00ffff; padding-bottom: 10px; letter-spacing: 4px;">CRÉDITOS</h2>
                <p style="color: #aaaaaa; margin: 8px 0; font-size: 18px;"><strong>Desarrolladores:</strong> Gemini, Alex Palma, Abiud Vera, Saul Velez</p>
                <p style="color: #aaaaaa; margin: 8px 0; font-size: 18px;"><strong>Artista:</strong> Cristian Cortopassi</p>
                <p style="color: #aaaaaa; margin: 8px 0; font-size: 18px;"><strong>Carrera:</strong> Ingeniería en Software (Septimo Semestre)</p>
                <p style="color: #aaaaaa; margin: 8px 0; font-size: 18px;"><strong>Materia:</strong> Introducción a PGC</p>
                <p style="color: #aaaaaa; margin: 8px 0; font-size: 18px;"><strong>Motor Gráfico:</strong> Three.js</p>
            </div>
            
            ${this.generarBotonHTML('btn-menu-principal', 'Volver al Menú Principal')}
        `;

        document.getElementById('btn-menu-principal')!.onclick = () => {
            this.MostrarInicio();
        };

        const buttons = Array.from(this.uiContainer.querySelectorAll('button')) as HTMLButtonElement[];
        this.actualizarFocoMenu(buttons);
    }

    ReanudarJuego() {
        this.audioListener.context.resume();

        this.gameState = 'PLAYING';
        this.uiContainer.style.display = 'none';

        this.hudElement.style.display = 'block';
        this.killCounterElement.style.display = 'block';
        this.crosshairElement.style.display = this.crosshairEnabled ? 'block' : 'none';
        this.indicatorsContainer.style.display = 'block';

        if (this.mobileControlsContainer && this.mobileControlsEnabled) {
            this.mobileControlsContainer.style.display = 'block';
        }
    }
}