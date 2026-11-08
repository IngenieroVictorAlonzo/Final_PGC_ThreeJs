export class InputController {
    keys: { [key: string]: boolean } = {};
    private startButtonLocked: boolean = false; 

    // --- VARIABLES DE MOUSE FPS (POINTER LOCK) ---
    public mouseDeltaX: number = 0;
    public mouseDeltaY: number = 0;
    public isPointerLocked: boolean = false;

    // --- VARIABLES MÓVILES ---
    public mobileAimShoot: boolean = false;
    public mobileTurbo: boolean = false;
    public mobileRollLeft: boolean = false;
    public mobileRollRight: boolean = false;
    
    // Almacenan valores analógicos de -1.0 a 1.0
    public mobileJoystickLeft: { x: number, y: number } = { x: 0, y: 0 };
    public mobileJoystickRight: { x: number, y: number } = { x: 0, y: 0 };

    constructor() {
        this.listeners();

        window.addEventListener("gamepadconnected", (e) => {
            console.log("🎮 Mando conectado:", e.gamepad.id);
        });
    }

    public ispressed(keycode: string): boolean {
        if (this.keys[keycode]) return true;

        const gamepad = navigator.getGamepads()[0];
        const threshold = 0.25; 

        switch (keycode) {
            // --- ACELERAR / ADELANTE (W / Joystick Izq Arriba) ---
            case 'KeyW':
            case 'ArrowUp':
                return (gamepad && gamepad.axes[1] < -threshold) || (this.mobileJoystickLeft.y < -threshold) || false;
            
            // --- FRENAR / ATRÁS (S / Joystick Izq Abajo) ---
            case 'KeyS':
            case 'ArrowDown':
                return (gamepad && gamepad.axes[1] > threshold) || (this.mobileJoystickLeft.y > threshold) || false;

            // --- GIRAR SOBRE EL EJE / MODO YAW (A / Joystick Izq Izquierda) ---
            case 'KeyA':
                return (gamepad && gamepad.axes[0] < -threshold) || (this.mobileJoystickLeft.x < -threshold) || false;

            // --- GIRAR SOBRE EL EJE / MODO YAW (D / Joystick Izq Derecha) ---
            case 'KeyD':
                return (gamepad && gamepad.axes[0] > threshold) || (this.mobileJoystickLeft.x > threshold) || false;

            // --- YAW: MOVERSE IZQ (J / Joystick Der Izq) ---
            case 'KeyJ':
            case 'ArrowLeft':
                return (gamepad && gamepad.axes[2] < -threshold) || false;

            // --- YAW: MOVERSE DER (L / Joystick Der Der) ---
            case 'KeyL':
            case 'ArrowRight':
                return (gamepad && gamepad.axes[2] > threshold) || false;

            // --- PITCH: SUBIR NARIZ (I / Joystick Der Arriba) ---
            case 'KeyI': 
                return (gamepad && gamepad.axes[3] < -threshold) || false; 

            // --- PITCH: BAJAR NARIZ (K / Joystick Der Abajo) ---
            case 'KeyK': 
                return (gamepad && gamepad.axes[3] > threshold) || false; 

            // ========================================================
            // 🎮 GATILLOS, BOTONES Y CONTROLES "CLAW" MÓVILES
            // ========================================================
            
            // --- APUNTAR / ADS (M / L2 [6] o Botón Móvil) ---
            case 'KeyM':
                return (gamepad && gamepad.buttons[6]?.pressed) || this.mobileAimShoot || false;

            // --- TURBO NORMAL (X / Shift / L1 [4/5] o Botón Móvil) ---
            case 'KeyX':
            case 'ShiftLeft':
            case 'ShiftRight':
                return (gamepad && gamepad.buttons[4]?.pressed) || (gamepad && gamepad.buttons[5]?.pressed) || this.mobileTurbo || false; 

            // --- DISPARAR (O / R2 [7] o Botón Móvil) ---
            case 'KeyO': 
                return (gamepad && gamepad.buttons[7]?.pressed) || this.mobileAimShoot || false; 

            // --- BARREL ROLL TECLADO (Q / E) o Doble Toque Móvil ---
            case 'KeyE':
                return this.mobileRollLeft || false;
            case 'KeyQ':
                return this.mobileRollRight || false;

            // 🎥 CÁMARA (Triángulo / Y [3] o Tecla V)
            case 'KeyV':
                return (gamepad && gamepad.buttons[3]?.pressed) || false;

            // --- PAUSA (Esc / Start [9] o Select [8]) ---
            case 'Escape': 
                if (gamepad && (gamepad.buttons[9]?.pressed || gamepad.buttons[8]?.pressed)) { 
                    if (!this.startButtonLocked) {
                        this.startButtonLocked = true;
                        return true; 
                    }
                } else {
                    this.startButtonLocked = false; 
                }
                return false;
        }

        return false;
    }

    public isControllerButtonPressed(buttonIndex: number): boolean {
        const gamepad = navigator.getGamepads()[0];
        if (!gamepad) return false;
        return !!gamepad.buttons[buttonIndex]?.pressed;
    }

    public onkeydown(event: KeyboardEvent) { 
        this.keys[event.code] = true; 
    }

    public onkeyup(event: KeyboardEvent) { 
        this.keys[event.code] = false; 
    }

    private listeners() {
        window.addEventListener("keydown", this.onkeydown.bind(this));
        window.addEventListener("keyup", this.onkeyup.bind(this));

        // --- MOUSE TIPO SHOOTER (POINTER LOCK) ---
        document.addEventListener("mousedown", (e) => {
            if ((e.target as HTMLElement).tagName === 'BUTTON') {
                return;
            }

            if (!this.isPointerLocked) {
                document.body.requestPointerLock();
                return; 
            }
            if (e.button === 0) this.keys['KeyO'] = true; 
            if (e.button === 2) this.keys['KeyM'] = true; 
        });

        document.addEventListener("pointerlockchange", () => {
            this.isPointerLocked = document.pointerLockElement === document.body;
            if (!this.isPointerLocked) {
                this.keys['KeyO'] = false;
                this.keys['KeyM'] = false;
            }
        });

        document.addEventListener("mousemove", (e) => {
            if (this.isPointerLocked) {
                this.mouseDeltaX += e.movementX;
                this.mouseDeltaY += e.movementY;
            }
        });

        document.addEventListener("mouseup", (e) => {
            if (e.button === 0) this.keys['KeyO'] = false; 
            if (e.button === 2) this.keys['KeyM'] = false; 
        });

        window.addEventListener("contextmenu", (e) => e.preventDefault());
    }       
}