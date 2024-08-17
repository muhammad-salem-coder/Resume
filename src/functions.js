import * as THREE from "three";
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import gsap from 'gsap/gsap-core.js';
import { CSSPlugin } from 'gsap/CSSPlugin'; // Import CSSPlugin
import anime from 'animejs/lib/anime.es.js';

gsap.registerPlugin(CSSPlugin); // Register the CSSPlugin

const loaderManager = new THREE.LoadingManager();


const load_screen = document.querySelector('.loading-screen')
let counterElement = document.querySelector('.count p');
let proggress_set = 0;
let anime_time = anime.timeline({
    loop:false
})
let loaded_anime = false;
// Disable keypresses and clicks
function disableInteractions() {
    document.addEventListener('keydown', preventInteraction, true);
    document.addEventListener('click', preventInteraction, true);
    document.addEventListener('touchstart', preventInteraction, true); // for touch devices
}

function enableInteractions() {
    document.removeEventListener('keydown', preventInteraction, true);
    document.removeEventListener('click', preventInteraction, true);
    document.removeEventListener('touchstart', preventInteraction, true); // for touch devices
}

function preventInteraction(e) {
    e.stopPropagation();
    e.preventDefault();
}

// Call this function to disable interactions when the page loads

loaderManager.onProgress = (url, loaded, total) => {
    const progress = (loaded / total) * 100;
    if ((progress > proggress_set) && (100 >= progress)) {
        proggress_set = progress;
    }

    counterElement.textContent = Math.floor(proggress_set);

    // Check if the loading is complete and the anime has not been loaded yet
    if ((loaded === total) && !loaded_anime) {
        gsap.to('.count', {opacity: 0, delay:0.5, duration:0.5})
        anime_time.add({
            targets: '.ml16 .letter',
            translateY: [0, 100],
            easing: 'easeOutExpo',
            duration: 500,
            delay: (el, i) => 30 * i
        });

        gsap.to('.pre-loader', {
            scale: 0.5, 
            ease: "power4.inOut",
            duration: 2, 
        });

        gsap.to('.loader-bg', {
            height: '0',
            ease: "power4.inOut",
            duration: 1.5, 
            delay: 1,
        });

        load_screen.style.display = 'none';

        loaded_anime = true;
    }
}

let textWrapper = document.querySelector('.ml16');
textWrapper.innerHTML = textWrapper.textContent.replace(/\S/g, "<span class='letter'>$&</span>")
anime_time.add({
    targets: '.ml16 .letter',
    translateY: [-100, 0],
    easing: 'easeOutExpo',
    duration: 1500, 
    delay: (el, i) => 100 + 30 * i
})



gsap.to('.loader', {
    height: '0',
    ease: "power4.inOut",
    duration: 1.5, 
})

// _____________________________________________________________________________ //

export function load_model(path, setpath, scene, color, pos, scale, callback) {
    const loader = new GLTFLoader(loaderManager).setPath(setpath);

    loader.load(path, function (gltf) {
        const model = gltf.scene;
        model.scale.set(scale.x, scale.y, scale.z);
        model.position.set(pos.x, pos.y, pos.z);

        scene.add(model);
        if (callback) callback(model);
    }, undefined, function (error) {
        console.error(error);
    });
}


export function load_model_new(path, setpath, scene, color, pos, scale, callback) {
    return new  Promise ((resolve, reject) => {
        const loader = new GLTFLoader(loaderManager).setPath(setpath);

        loader.load(path, function (gltf) {
            const model = gltf.scene;
            model.scale.set(scale.x, scale.y, scale.z);
            model.position.set(pos.x, pos.y, pos.z);

            scene.add(model);
            resolve(model);
        }, undefined, function (error) {
            console.error(error);
            reject(error);
        });
    })
}

export function load_glass_model(path, scene, color, pos, scale, callback) {
    const loader = new GLTFLoader(loaderManager);
    loader.load(path, function (gltf) {
        const model = gltf.scene;
        let containerMesh = model.getObjectByName('Circle');

        containerMesh.traverse((child) => {
            if (child.isMesh) {
                child.material = new THREE.MeshPhysicalMaterial({
                    color: color,
                    transmission:1,
                    roughness:0.0,
                    ior:1.2,
                    thickness:2.6,
                    specularIntensity:1.0,
                    clearcoat:1,
                    sheenColor: 0x8ad1dd,
                });
            }
        });
        model.scale.set(scale.x, scale.y, scale.z);
        model.position.set(pos.x, pos.y, pos.z);

        scene.add(model);
        if (callback) callback(model);
    }, undefined, function (error) {
        console.error(error);
    });
}

export function load_model_noadd(path, scene, color, pos, scale, callback) {
    const loader = new GLTFLoader(loaderManager);
    loader.load(path, function (gltf) {
        const model = gltf.scene;
        model.traverse((child) => {
            if (child.isMesh) {
                child.material = new THREE.MeshStandardMaterial({
                    color: color,
                });
            }
        });
        model.scale.set(scale.x, scale.y, scale.z);
        model.position.set(pos.x, pos.y, pos.z);

        if (callback) callback(model);
    }, undefined, function (error) {
        console.error(error);
    });
}

export function load_model_animation(path, setpath, scene, color, pos, scale, callback) {
    const loader = new GLTFLoader(loaderManager).setPath(setpath);

    loader.load(path, function (gltf) {
        const model = gltf.scene;

        model.rotation.z += Math.PI / 2; 
        model.scale.set(scale.x, scale.y, scale.z);
        model.position.set(pos.x, pos.y, pos.z);
        scene.add(model);

        let mixer = new THREE.AnimationMixer(model);
        const clips = gltf.animations;

        const action = mixer.clipAction(clips[0]); 
        action.play();
        action.paused = true; // Start paused
        action.time = 0; // Set to the first frame

        action.setLoop(THREE.LoopOnce);
        action.clampWhenFinished = true;

        if (callback) callback({ model, mixer, action });
        }, undefined, function (error) {
        console.error(error);
    });
}

export function load_model_animation_base(path, setpath, scene, color, pos, scale, callback) {
    const loader = new GLTFLoader(loaderManager).setPath(setpath);

    loader.load(path, function (gltf) {
        const model = gltf.scene;

        model.rotation.z += Math.PI / 2; 
        model.scale.set(scale.x, scale.y, scale.z);
        model.position.set(pos.x, pos.y, pos.z);
        scene.add(model);
		console.log(model)

        let mixer = new THREE.AnimationMixer(model);
        const clips = gltf.animations;

        const action = mixer.clipAction(clips[0]); 

        action.play();
        action.paused = true; // Start paused
        action.time = 0; // Set to the first frame

        action.setLoop(THREE.LoopOnce);
        action.clampWhenFinished = true;

        if (callback) callback({ model, mixer, action });
        }, undefined, function (error) {
        console.error(error);
    });
}

export function load_model_promise(url, setpath, scene, pos, color, scale) {
    return new Promise((resolve, reject) => {
        load_model(url, setpath, scene, color, pos, scale, function(loadModel) {
            resolve(loadModel);
        });
    });
}

export function load_texture_plane(path, scene){
	const texture = new THREE.TextureLoader().load(path);
	texture.flipY = false

	const geometry = new THREE.PlaneGeometry(120, 120);
	const material = new THREE.MeshBasicMaterial( {map: texture, transparent:true});
	const plane = new THREE.Mesh( geometry, material );
	plane.rotation.x = Math.PI/2;
    scene.add(plane);
	return plane;
}

export function createCarBody(pos, dimension, world) {
    const chassisBody = new CANNON.Body({
        mass: 150, 
        shape: new CANNON.Box(dimension),
    });
    chassisBody.position.set(pos.x, pos.y, pos.z);
    chassisBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0,1,0), Math.PI / 2);
    chassisBody.angularVelocity.set(0, 0, 0); 

    chassisBody.linearDamping = 0.6
    chassisBody.angularDamping = 0.6

    world.addBody(chassisBody);

    return chassisBody;
}

export function create_phy_model(pos, dimension, mass, world){
    const body = new CANNON.Body({
        mass: mass,
        shape: new CANNON.Box(dimension),
        position: pos,
    })
    body.linearDamping = 0.3
    body.angularDamping = 0.4
    world.addBody(body);
    
    return body;
}

export function create_phy_model_cylinder(pos, radius, height, seg, mass, world){
    const body = new CANNON.Body({
        mass: mass,
        shape: new CANNON.Cylinder(radius, radius, height, seg),
        position: pos,
    })
    body.linearDamping = 0.3
    body.angularDamping = 0.4
    body.angularVelocity = new CANNON.Vec3(4, 4, 4)
    world.addBody(body);
    
    return body;
}

export function create_plane_phy(world, ground){
    const ground_phy_mat = new CANNON.Material();
    var q = ground.quaternion;
    const ground_body = new CANNON.Body({
        shape: new CANNON.Box(new CANNON.Vec3(120 / 2, 120 / 2, 0.01)),
        mass: 0,
        type: CANNON.Body.STATIC,
        material: ground_phy_mat,
        quaternion: new CANNON.Quaternion(-q._x, q._y, q._z, q._w)
    })
    world.addBody(ground_body)
    
    return {ground_phy_mat, ground_body};
}

export function create_cylinder(radius, height, seg){
    const geometry = new THREE.CylinderGeometry(radius, radius, height, seg);
    const material = new THREE.MeshPhongMaterial({
        color: 0xd0901d,
        emissive: 0xaa0000,
        side: THREE.DoubleSide,
        flatShading: true,
        });
    const cylinder = new THREE.Mesh(geometry, material);
    cylinder.geometry.rotateZ(Math.PI/2);

    return cylinder;
}

export function create_sphere(radius, scene){
    const geometry = new THREE.SphereGeometry(radius, 32, 16); 
    const material = new THREE.MeshStandardMaterial( {
        color: 0x00ff00,
        wireframe: true,
    } );
    const sphere = new THREE.Mesh(geometry, material);

    scene.add(sphere);
    return sphere;
}

export function create_debug_box(box_geo, scene){
    const geometry = box_geo;
    const material = new THREE.MeshStandardMaterial( {
        color: 0xFF0000,
        wireframe: true,
    });
    const box = new THREE.Mesh(geometry, material);
    // scene.add(box)
    return box;
}

export function create_debug_cylinder(box_geo, scene){
    const geometry = box_geo;
    const material = new THREE.MeshStandardMaterial( {
        color: 0xFF0000,
        wireframe: true,
    });
    const box = new THREE.Mesh(geometry, material);
    scene.add(box)
    return box;
}

export function create_plane_circle(radius, scene){
    const ground_geo = new THREE.CircleGeometry(radius, 100)
    const ground_mat = new THREE.MeshBasicMaterial({
        color: 0xaacc55,
        side: THREE.DoubleSide,
    })
    const ground = new THREE.Mesh(ground_geo, ground_mat)
    ground.rotation.x = Math.PI/2;
    ground.receiveShadow = true;

    return {ground_geo, ground_mat, ground};
}

export function create_plane(scene){
    const ground_geo = new THREE.PlaneGeometry(100, 100)
    const ground_mat = new THREE.MeshBasicMaterial({
        color: 0xaacc55,
        side: THREE.DoubleSide,
    })
    const ground = new THREE.Mesh(ground_geo, ground_mat)
    ground.rotation.x = Math.PI/2;
    ground.receiveShadow = true;
    scene.add(ground);

    return {ground_geo, ground_mat, ground};
}

const PLANE_SIZE = 100;
const BLADE_COUNT = 100000;
const BLADE_WIDTH = 0.8;
const BLADE_HEIGHT = 0.4;
const BLADE_HEIGHT_VARIATION = 0.6;
const PATH_WIDTH = 5;

export function generateField (grassMaterial, scene) {
    const positions = [];
    const uvs = [];
    const indices = [];
    const colors = [];

    for (let i = 0; i < BLADE_COUNT; i++) {
        const VERTEX_COUNT = 5;
        const surfaceMin = PLANE_SIZE / 2 * -1;
        const surfaceMax = PLANE_SIZE / 2;

        let x, y = 0, z;
        
        // Ensure grass is placed only outside the pathway area
        do {
            x = Math.random() * PLANE_SIZE - PLANE_SIZE / 2;
            z = Math.random() * 80 - 80 / 2;
        } while (Math.abs(z) < PATH_WIDTH / 2);

        const pos = new THREE.Vector3(x, y, z);

        const uv = [convertRange(pos.x, surfaceMin, surfaceMax, 0, 1), convertRange(pos.z, surfaceMin, surfaceMax, 0, 1)];

        const blade = generateBlade(pos, i * VERTEX_COUNT, uv);
        blade.verts.forEach(vert => {
            positions.push(...vert.pos);
            uvs.push(...vert.uv);
            colors.push(...vert.color);
        });
        blade.indices.forEach(indice => indices.push(indice));
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
    geom.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2));
    geom.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    // geom.computeFaceNormals();

    const mesh = new THREE.Mesh(geom, grassMaterial);
    scene.add(mesh);
}


function generateBlade (center, vArrOffset, uv) {
    const MID_WIDTH = BLADE_WIDTH * 0.5;
    const TIP_OFFSET = 0.1;
    const height = BLADE_HEIGHT + (Math.random() * BLADE_HEIGHT_VARIATION);

    const yaw = Math.random() * Math.PI * 2;
    const yawUnitVec = new THREE.Vector3(Math.sin(yaw), 0, -Math.cos(yaw));
    const tipBend = Math.random() * Math.PI * 2;
    const tipBendUnitVec = new THREE.Vector3(Math.sin(tipBend), 0, -Math.cos(tipBend));

    // Find the Bottom Left, Bottom Right, Top Left, Top right, Top Center vertex positions
    const bl = new THREE.Vector3().addVectors(center, new THREE.Vector3().copy(yawUnitVec).multiplyScalar((BLADE_WIDTH / 2) * 1));
    const br = new THREE.Vector3().addVectors(center, new THREE.Vector3().copy(yawUnitVec).multiplyScalar((BLADE_WIDTH / 2) * -1));
    const tl = new THREE.Vector3().addVectors(center, new THREE.Vector3().copy(yawUnitVec).multiplyScalar((MID_WIDTH / 2) * 1));
    const tr = new THREE.Vector3().addVectors(center, new THREE.Vector3().copy(yawUnitVec).multiplyScalar((MID_WIDTH / 2) * -1));
    const tc = new THREE.Vector3().addVectors(center, new THREE.Vector3().copy(tipBendUnitVec).multiplyScalar(TIP_OFFSET));

    tl.y += height / 2;
    tr.y += height / 2;
    tc.y += height;

    // Vertex Colors
    const black = [0, 0, 0];
    const gray = [0.5, 0.5, 0.5];
    const white = [1.0, 1.0, 1.0];

    const verts = [
        { pos: bl.toArray(), uv: uv, color: black },
        { pos: br.toArray(), uv: uv, color: black },
        { pos: tr.toArray(), uv: uv, color: gray },
        { pos: tl.toArray(), uv: uv, color: gray },
        { pos: tc.toArray(), uv: uv, color: white }
    ];

    const indices = [
        vArrOffset,
        vArrOffset + 1,
        vArrOffset + 2,
        vArrOffset + 2,
        vArrOffset + 4,
        vArrOffset + 3,
        vArrOffset + 3,
        vArrOffset,
        vArrOffset + 2
    ];

    return { verts, indices };
}
// ___________________________data funcs _____________________________//

export function quickSort(list, start, end){
    if (end <= start) return;

    let pivot = get_pivot(list, start, end);

    quickSort(list, start, pivot - 1);
    quickSort(list, pivot + 1, end);
}

function get_pivot(list, start, end){
    var pivot = list[end].position.x + list[end].position.y;
    let i = start - 1;
    for (let j=start; j <= (end-1); j++){
        if ((list[j].position.x+list[j].position.y) < pivot){
            i++;
            const temp = list[i];
            list[i] = list[j]
            list[j] = temp;
        }
    }
    i++;
    let temp = list[i];
    list[i] = list[end];
    list[end] = temp;

    return i;
}   

// quick sort 
export function quickSort2(list, start, end){
    if (end <= start) return;

    let pivot = get_pivot2(list, start, end);

    quickSort2(list, start, pivot - 1);
    quickSort2(list, pivot + 1, end);
}

function get_pivot2(list, start, end){
    var pivot = list[end][0].position.x + list[end][0].position.y;
    let i = start - 1;
    for (let j=start; j <= (end-1); j++){
        if ((list[j][0].position.x+list[j][0].position.y) < pivot){
            i++;
            const temp = list[i];
            list[i] = list[j]
            list[j] = temp;
        }
    }
    i++;
    let temp = list[i];
    list[i] = list[end];
    list[end] = temp;

    return i;
}  

function convertRange (val, oldMin, oldMax, newMin, newMax) {
    return (((val - oldMin) * (newMax - newMin)) / (oldMax - oldMin)) + newMin;
  }

