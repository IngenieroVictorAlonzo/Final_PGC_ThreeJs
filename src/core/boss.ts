import { Object3D, Scene, Vector3, Mesh, MeshStandardMaterial, AnimationMixer, PointLight, PositionalAudio, AudioLoader, AudioListener, SphereGeometry, MeshBasicMaterial, Group, CylinderGeometry } from 'three';

export class Boss {
    model: Group; 
    meshVisual: Object3D; 
    
    scene: Scene;
    mixer: AnimationMixer | null = null;
    
    saludMaxima: number = 100;
    saludActual: number = 100;
    
    estado: 'NORMAL' | 'EMBESTIDA' | 'RAYOS_OP' | 'TELETRANSPORTANDO' = 'NORMAL';
    fase: number = 1;
    tiempoUltimoAtaque: number = 0;
    tiempoInicioOP: number = 0;

    radioMinimoOjo: number = 12;       
    radioMaximoAnillos: number = 140;  
    grosorZAnillos: number = 40;       

    sonidoDisparo: PositionalAudio;
    proyectilesActivos: Mesh[] = [];
    grupoRayosOP: Group = new Group();
    
    materialRayoOP: MeshBasicMaterial = new MeshBasicMaterial({ color: 0xff0000 });
    geometriaLaser: SphereGeometry = new SphereGeometry(5, 16, 16);
    geometriaRayoOP: CylinderGeometry = new CylinderGeometry(8, 8, 4000, 8);

    golpesSeguidos: number = 0;
    tiempoUltimoGolpe: number = 0;
    cooldownTeleport: number = 0; 
    sonidoTeleport: PositionalAudio;
    objetivoTeleport: Vector3 = new Vector3();
    faseTeleport: 'DESAPARECIENDO' | 'APARECIENDO' = 'DESAPARECIENDO';
    
    contadorTeleports: number = 0;
    direccionEmbestida: Vector3 = new Vector3();

    barraSaludContainer: HTMLDivElement;
    barraSaludFill: HTMLDivElement;

    constructor(scene: Scene, modeloBase: Object3D, posicionInicial: Vector3, animaciones: any[], listener: AudioListener) {
        this.scene = scene;
        
        this.model = new Group(); 
        this.model.position.copy(posicionInicial);
        this.model.scale.set(15, 15, 15);

        this.meshVisual = modeloBase; 
        this.meshVisual.position.set(0, 0, 0);
        this.meshVisual.scale.set(1, 1, 1); 
        this.meshVisual.rotation.set(0, -Math.PI / 2, 0);

        this.model.add(this.meshVisual);

        this.geometriaRayoOP.translate(0, 2000, 0);

        if (animaciones && animaciones.length > 0) {
            this.mixer = new AnimationMixer(this.meshVisual);
            const animacionAUsar = animaciones.length > 1 ? animaciones[2] : animaciones[0];
            this.mixer.clipAction(animacionAUsar).play(); 
        }

        const luzDivina = new PointLight(0xffffff, 0.05, 100);
        this.model.add(luzDivina);

        this.model.traverse((child) => {
            if ((child as Mesh).isMesh) {
                const mesh = child as Mesh;
                mesh.frustumCulled = false; 
                if (mesh.material) {
                    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                    materials.forEach((mat) => {
                        const stdMat = mat as MeshStandardMaterial;
                        if (stdMat.emissive) stdMat.emissive.setHex(0xffffff); 
                        if (stdMat.emissiveIntensity !== undefined) stdMat.emissiveIntensity = 0.01; 
                        stdMat.flatShading = true; 
                        stdMat.needsUpdate = true; 
                    });
                }
            }
        });

        this.sonidoDisparo = new PositionalAudio(listener);
        this.sonidoDisparo.setRefDistance(100);
        const loader = new AudioLoader();
        loader.load('/Sounds/LaserEnemy.mp3', (buffer) => {
            this.sonidoDisparo.setBuffer(buffer);
            this.sonidoDisparo.setVolume(7);
        });
        this.model.add(this.sonidoDisparo);

        this.sonidoTeleport = new PositionalAudio(listener);
        this.sonidoTeleport.setRefDistance(150); 
        loader.load('/Sounds/Teleport.mp3', (buffer) => {
            this.sonidoTeleport.setBuffer(buffer);
            this.sonidoTeleport.setVolume(8);
        });
        this.model.add(this.sonidoTeleport);

        this.scene.add(this.model);

        this.barraSaludContainer = document.createElement('div');
        this.barraSaludContainer.style.position = 'absolute';
        this.barraSaludContainer.style.top = '25px'; 
        this.barraSaludContainer.style.left = '50%';
        this.barraSaludContainer.style.transform = 'translateX(-50%)';
        this.barraSaludContainer.style.width = '40%';
        this.barraSaludContainer.style.maxWidth = '500px'; 
        this.barraSaludContainer.style.height = '12px';
        this.barraSaludContainer.style.border = '1px solid #ffcc00';
        this.barraSaludContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        this.barraSaludContainer.style.boxShadow = '0 0 15px rgba(255, 204, 0, 0.3)';
        this.barraSaludContainer.style.zIndex = '100';
        
        const tituloBoss = document.createElement('div');
        tituloBoss.innerText = 'OFANIM GALGALLIR - ANOMALÍA CLASE OMEGA';
        tituloBoss.style.color = '#ffcc00';
        tituloBoss.style.fontFamily = '"Courier New", Courier, monospace';
        tituloBoss.style.textAlign = 'center';
        tituloBoss.style.fontWeight = 'bold';
        tituloBoss.style.fontSize = '14px';
        tituloBoss.style.textShadow = '0 0 5px #ffcc00';
        tituloBoss.style.position = 'absolute';
        tituloBoss.style.top = '-22px';
        tituloBoss.style.width = '100%';
        
        this.barraSaludFill = document.createElement('div');
        this.barraSaludFill.style.width = '100%';
        this.barraSaludFill.style.height = '100%';
        this.barraSaludFill.style.backgroundColor = '#ff3333';
        this.barraSaludFill.style.transition = 'width 0.1s ease-out';
        
        this.barraSaludContainer.appendChild(tituloBoss);
        this.barraSaludContainer.appendChild(this.barraSaludFill);
        document.body.appendChild(this.barraSaludContainer);
    }

    evaluarImpactoLaser(posicionLaser: Vector3): 'OJO' | 'ESCUDO' | 'FALLO' {
        if (this.estado === 'TELETRANSPORTANDO') return 'FALLO';
        const posLocal = posicionLaser.clone();
        this.model.worldToLocal(posLocal);
        posLocal.multiplyScalar(15);
        const distanciaAlCentroPlano = Math.sqrt(posLocal.x * posLocal.x + posLocal.y * posLocal.y);

        if (Math.abs(posLocal.z) > this.grosorZAnillos) return 'FALLO'; 
        if (distanciaAlCentroPlano <= this.radioMinimoOjo) return 'OJO';       
        else if (distanciaAlCentroPlano <= this.radioMaximoAnillos) return 'ESCUDO';    
        return 'FALLO'; 
    }

    recibirDano(cantidad: number, posicionJugador: Vector3) {
        if (this.saludActual <= 0 || this.estado === 'TELETRANSPORTANDO') return;
        this.saludActual -= cantidad;
        if (this.saludActual < 0) this.saludActual = 0;
        
        const porcentaje = (this.saludActual / this.saludMaxima) * 100;
        this.barraSaludFill.style.width = `${porcentaje}%`;
        
        this.barraSaludContainer.style.boxShadow = '0 0 30px rgba(255, 51, 51, 0.9)';
        setTimeout(() => {
            if (this.barraSaludContainer) this.barraSaludContainer.style.boxShadow = '0 0 15px rgba(255, 204, 0, 0.3)';
        }, 150);

        const tiempoActual = Date.now();
        if (tiempoActual - this.tiempoUltimoGolpe > 1500) this.golpesSeguidos = 0;
        
        this.tiempoUltimoGolpe = tiempoActual;
        this.golpesSeguidos++;

        const limiteSaltos = (this.saludActual < this.saludMaxima / 2) ? 3 : 5;

        if (this.golpesSeguidos >= limiteSaltos && tiempoActual > this.cooldownTeleport) {
            this.ejecutarSaltoEspacial(posicionJugador);
            this.golpesSeguidos = 0; 
            this.cooldownTeleport = tiempoActual + 3000; 
        }
    }

    ejecutarSaltoEspacial(posJugador: Vector3) {
        if (this.estado === 'TELETRANSPORTANDO') return; 
        if (this.estado === 'RAYOS_OP') this.finalizarAtaqueOP();

        this.estado = 'TELETRANSPORTANDO';
        this.faseTeleport = 'DESAPARECIENDO';

        if (this.sonidoTeleport.isPlaying) this.sonidoTeleport.stop();
        this.sonidoTeleport.play();

        const signo = Math.random() > 0.5 ? 1 : -1;
        const anguloRad = signo * (Math.PI / 3 + Math.random() * (Math.PI / 3)); 
        const direccion = new Vector3().subVectors(this.model.position, posJugador);
        direccion.applyAxisAngle(new Vector3(0, 1, 0), anguloRad);
        
        this.objetivoTeleport.copy(posJugador).add(direccion);
    }

    dispararLaserGigante(posicionJugador: Vector3) {
        const laser = new Mesh(this.geometriaLaser, this.materialRayoOP);
        laser.position.copy(this.model.position);
        laser.lookAt(posicionJugador);
        laser.userData.vida = 3;
        
        this.scene.add(laser);
        this.proyectilesActivos.push(laser);
        
        if (this.sonidoDisparo.isPlaying) this.sonidoDisparo.stop();
        this.sonidoDisparo.play();
    }

    iniciarEmbestida(posicionJugador: Vector3) { 
        this.estado = 'EMBESTIDA'; 
        this.model.lookAt(posicionJugador);
        this.model.getWorldDirection(this.direccionEmbestida);
    }

    iniciarAtaqueOP(tiempo: number) {
        this.estado = 'RAYOS_OP';
        this.tiempoInicioOP = tiempo;
        this.grupoRayosOP.rotation.set(0, 0, 0);

        for(let i = 0; i < 16; i++) {
            const rayo = new Mesh(this.geometriaRayoOP, this.materialRayoOP);
            rayo.rotation.x = Math.random() * Math.PI * 2;
            rayo.rotation.z = Math.random() * Math.PI * 2;
            rayo.scale.y = 0.01; 
            this.grupoRayosOP.add(rayo);
        }
        this.scene.add(this.grupoRayosOP);
    }

    finalizarAtaqueOP() {
        this.estado = 'NORMAL';
        this.scene.remove(this.grupoRayosOP);
        while(this.grupoRayosOP.children.length > 0){ 
            this.grupoRayosOP.remove(this.grupoRayosOP.children[0]); 
        }
    }

    update(deltaTime: number, posicionJugador: Vector3) {
        if (this.mixer) this.mixer.update(deltaTime);

        if (this.estado !== 'TELETRANSPORTANDO') {
            this.model.lookAt(posicionJugador);
        }

        if (this.estado === 'TELETRANSPORTANDO') {
            if (this.faseTeleport === 'DESAPARECIENDO') {
                this.model.scale.lerp(new Vector3(0.01, 0.01, 0.01), deltaTime * 15);
                if (this.model.scale.x < 0.5) {
                    this.model.position.copy(this.objetivoTeleport);
                    this.model.lookAt(posicionJugador);
                    this.faseTeleport = 'APARECIENDO';
                }
            } else {
                this.model.scale.lerp(new Vector3(15, 15, 15), deltaTime * 15);
                if (this.model.scale.x > 14.5) {
                    this.model.scale.set(15, 15, 15); 
                    
                    if (this.fase === 2) {
                        this.contadorTeleports++;
                        if (this.contadorTeleports <= 2) {
                            this.iniciarAtaqueOP(Date.now()); 
                            return; 
                        } else {
                            this.contadorTeleports = 0; 
                        }
                    }

                    this.estado = 'NORMAL';
                    this.dispararLaserGigante(posicionJugador); 
                }
            }
            return; 
        }

        const tiempoActual = Date.now();
        if (this.saludActual <= this.saludMaxima / 3 && this.fase === 1) {
            this.fase = 2;
            this.iniciarAtaqueOP(tiempoActual);
        }

        if (this.estado === 'RAYOS_OP') {
            const tiempoTranscurrido = tiempoActual - this.tiempoInicioOP;
            const tiempoCarga = 2000; 

            if (tiempoTranscurrido < tiempoCarga) {
                const progreso = tiempoTranscurrido / tiempoCarga;
                for (let i = 0; i < this.grupoRayosOP.children.length; i++) {
                    this.grupoRayosOP.children[i].scale.y = Math.max(0.01, progreso);
                }
                this.grupoRayosOP.rotateZ(deltaTime * 0.1); 
                this.grupoRayosOP.rotateX(deltaTime * 0.1); 
            } else {
                for (let i = 0; i < this.grupoRayosOP.children.length; i++) {
                    this.grupoRayosOP.children[i].scale.y = 1.0;
                }
                this.grupoRayosOP.rotateZ(deltaTime * 1.5);
                this.grupoRayosOP.rotateX(deltaTime * 1.2);
            }
            
            this.grupoRayosOP.position.copy(this.model.position); 
            if (tiempoTranscurrido > 7000) this.finalizarAtaqueOP();
        } 
        else if (this.estado === 'EMBESTIDA') {
            this.model.position.addScaledVector(this.direccionEmbestida, 4.0); 
            if (tiempoActual - this.tiempoUltimoAtaque > 1000) this.estado = 'NORMAL'; 
        } 
        else {
            const distanciaSq = posicionJugador.distanceToSquared(this.model.position);
            const distanciaReal = Math.sqrt(distanciaSq);
            
            if (distanciaReal > 800) this.model.translateZ(3.0); 
            else this.model.translateZ(0.2); 

            this.model.position.y += Math.sin(tiempoActual * 0.0015) * 0.25;
            const porcentajeVida = this.saludActual / this.saludMaxima;
            const cooldownDinamico = 800 + (1700 * porcentajeVida);

            if (tiempoActual - this.tiempoUltimoAtaque > cooldownDinamico) {
                this.tiempoUltimoAtaque = tiempoActual;
                if (distanciaSq < 90000 && Math.random() > 0.5) this.iniciarEmbestida(posicionJugador);
                else this.dispararLaserGigante(posicionJugador);
            }
        }

        for (let i = this.proyectilesActivos.length - 1; i >= 0; i--) {
            const p = this.proyectilesActivos[i];
            p.translateZ(3.5); 
            if (p.position.distanceToSquared(this.model.position) > 1000000) {
                this.scene.remove(p);
                this.proyectilesActivos.splice(i, 1);
            }
        }
    }

    // 👇 AHORA RECIBE LA NAVE ENTERA EN VEZ DE SOLO SU POSICIÓN
    verificarColisionJugador(nave: any): boolean {
        if (this.estado === 'TELETRANSPORTANDO') return false;
        
        // Embestida es inmensa, chocar con el centro basta
        if (this.estado === 'EMBESTIDA' && this.model.position.distanceToSquared(nave.model.position) < 1000) return true;
        
        // Rayos rojos (Esferas) evaluados contra los Cilindros
        for (let i = this.proyectilesActivos.length - 1; i >= 0; i--) {
            if (nave.verificarColision(this.proyectilesActivos[i].position, 3.0)) {
                this.scene.remove(this.proyectilesActivos[i]);
                this.proyectilesActivos.splice(i, 1);
                return true;
            }
        }

        // Rayos OP rotatorios evaluados contra el centro de la nave (es más justo en 3D)
        if (this.estado === 'RAYOS_OP') {
            for (let i = 0; i < this.grupoRayosOP.children.length; i++) {
                const rayo = this.grupoRayosOP.children[i];
                const posLocal = nave.model.position.clone();
                rayo.worldToLocal(posLocal);
                if (posLocal.y > 0 && posLocal.y < 4000) {
                    const distCentro = Math.sqrt(posLocal.x * posLocal.x + posLocal.z * posLocal.z);
                    if (distCentro < 12) return true; 
                }
            }
        }
        return false;
    }

    dispose() {
        if (this.sonidoDisparo.isPlaying) this.sonidoDisparo.stop();
        this.sonidoDisparo.disconnect();
        if (this.sonidoTeleport.isPlaying) this.sonidoTeleport.stop();
        this.sonidoTeleport.disconnect();
        
        this.proyectilesActivos.forEach(p => this.scene.remove(p));
        this.scene.remove(this.grupoRayosOP);
        this.scene.remove(this.model);
        
        if (this.barraSaludContainer.parentNode) this.barraSaludContainer.parentNode.removeChild(this.barraSaludContainer);

        this.geometriaLaser.dispose();
        this.geometriaRayoOP.dispose();
        this.materialRayoOP.dispose();
    }
}