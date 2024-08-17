import * as THREE from "three";
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as CANNON from 'cannon-es';
import gsap from 'gsap/gsap-core.js';
import { RGBELoader, RenderPass, EffectComposer, OutputPass } from 'three/examples/jsm/Addons.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
import { GUI } from 'lil-gui';
import * as functions from './functions';
import './main.css';

// _______________________________________________________________ //

const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

const scene = new THREE.Scene();
scene.background = new THREE.Color('#fdedc9'); //43741b
const world = new CANNON.World({
    gravity: new CANNON.Vec3(0, -9.8, 0),
});
world.broadphase = new CANNON.SAPBroadphase(world);
world.defaultContactMaterial.friction = 0.3;

const camera = new THREE.PerspectiveCamera(50, sizes.width / sizes.height, 0.1, 1000);
camera.position.z = 40
scene.add(camera);

const timeStep = 1/60;

new RGBELoader().load('./assets/tex/env_map.hdr', (env_map) => {
    env_map.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = env_map;
});

const canvas = document.querySelector('.webgl');

const render = new THREE.WebGLRenderer({canvas});
render.toneMapping = THREE.NeutralToneMapping;
render.tonemap = 0.05
render.setSize(sizes.width, sizes.height);
render.setPixelRatio(2);

const renderScene = new RenderPass(scene, camera);
const composer = new EffectComposer(render);
composer.addPass(renderScene);                // first pass ~~~~
// composer.addPass(new EffectPass)

let outlinePass;
outlinePass = new OutlinePass(new THREE.Vector2(window.innerWidth, window.innerHeight), scene, camera);
composer.addPass( outlinePass );

new THREE.TextureLoader().load( './assets/tex/tri_pattern.jpg', function ( texture ) {

    outlinePass.patternTexture = texture;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;

} );

outlinePass.edgeStrength = 10.0; // intensity of the edge strength
outlinePass.edgeGlow = 0.4;      // intensity of the glow
outlinePass.edgeThickness = 0.5; // thickness of outline
outlinePass.pulsePeriod = 0;     // number of seconds it takes for the outline to fade in and out
outlinePass.visibleEdgeColor.set('#ffffff'); // color of visible edges
outlinePass.hiddenEdgeColor.set('#190a05');  // color of hidden edges

const outputPass = new OutputPass();
composer.addPass(outputPass)

// const bloomPass = new UnrealBloomPass(
//     new THREE.Vector2(window.innerWidth, innerHeight),
//     0.6,
//     0.8,
//     0.1
// );

// composer.addPass(bloomPass);                  // second pass ~~~~
// composer.renderToScreen = false;

// let bloomObjects = new Selection();

// const selectiveBloom = new SelectiveBloomEffect(scene, camera, {
//     intensity:1.5, 
//     luminanceThreshold:0.0001, 
//     mipmapBlur: true, 
//     radius: 0.3, 
// });

// selectiveBloom.selection = bloomObjects;

var formControls = new TransformControls(camera, render.domElement);
scene.add(formControls);

const light = new THREE.HemisphereLight( 0xffffbb, 0x080820, 0.1 );
scene.add( light );

const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true;
controls.autoRotateSpeed = 4

document.body.appendChild(render.domElement);

// ____________________________grass______________________________ //


const startTime = Date.now();

var vert = "varying vec2 vUv;\r\nvarying vec2 cloudUV;\r\n\r\nvarying vec3 vColor;\r\nuniform float iTime;\r\n\r\nvoid main() {\r\n  vUv = uv;\r\n  cloudUV = uv;\r\n  vColor = color;\r\n  vec3 cpos = position;\r\n\r\n  float waveSize = 10.0f;\r\n  float tipDistance = 0.3f;\r\n  float centerDistance = 0.1f;\r\n\r\n  if (color.x > 0.6f) {\r\n    cpos.x += sin((iTime / 500.) + (uv.x * waveSize)) * tipDistance;\r\n  }else if (color.x > 0.0f) {\r\n    cpos.x += sin((iTime / 500.) + (uv.x * waveSize)) * centerDistance;\r\n  }\r\n\r\n  float diff = position.x - cpos.x;\r\n  cloudUV.x += iTime / 20000.;\r\n  cloudUV.y += iTime / 10000.;\r\n\r\n  vec4 worldPosition = vec4(cpos, 1.);\r\n  vec4 mvPosition = projectionMatrix * modelViewMatrix * vec4(cpos, 1.0);\r\n  gl_Position = mvPosition;\r\n}\r\n";
var frag = "uniform sampler2D texture1;\r\nuniform sampler2D textures[4];\r\n\r\nvarying vec2 vUv;\r\nvarying vec2 cloudUV;\r\nvarying vec3 vColor;\r\n\r\nvoid main() {\r\n  float contrast = 0.6;\r\n  float brightness = 0.0;\r\n  vec3 color = texture2D(textures[0], vUv).rgb * contrast;\r\n  color = color + vec3(brightness, brightness, brightness);\r\n  color = mix(color, texture2D(textures[1], cloudUV).rgb, 0.0);\r\n  gl_FragColor.rgb = color;\r\n  gl_FragColor.a = 1.;\r\n}\r\n";
var grassShader = { frag, vert };

const grassTexture = new THREE.TextureLoader().load('./assets/tex/grass.jpg');
const cloudTexture = new THREE.TextureLoader().load('./assets/tex/cloud.jpg');
cloudTexture.wrapS = cloudTexture.wrapT = THREE.RepeatWrapping;

const timeUniform = { type: 'f', value: 0.0 };

const grassUniforms = {
    textures: { value: [grassTexture, cloudTexture] },
    iTime: timeUniform
  };

const grassMaterial = new THREE.ShaderMaterial({
uniforms: grassUniforms,
vertexShader: grassShader.vert,
fragmentShader: grassShader.frag,
vertexColors: true,
side: THREE.DoubleSide
});

functions.generateField(grassMaterial, scene);

// _____________________________Vars______________________________ //

let car_model;
let car_model_geo;
let car_bbox;
let carChassisBody;
let car_debug;
let car_size;
let vehicle;

let shop_sizef;
let shop_model_geo;
const shop_models = [];

const wheel_models = [];
const wheelPromises = [];
var wheels_loaded = false;
let wheel_radius = 0.5;
var wheelVisuals = [];

const containers = [];
const scrolls = [];

// _________________________key stuff________________________ //

const toggleButton = document.querySelector('#enter-shop');
toggleButton.addEventListener('click', () => {
    if (toggleButton.classList.contains('none')) {
        toggleButton.classList.remove('none');
        toggleButton.classList.add('enter');
        toggleButton.textContent = 'Exit';
    }
     else if (toggleButton.classList.contains('enter')) {
        toggleButton.classList.remove('enter');
        toggleButton.classList.add('exit');
        toggleButton.textContent = 'Enter';
    }
});

const control_sec = document.querySelector('.contorls-sec');

// _________________________loading models________________________ //

functions.load_model('Cars.glb', './assets/models/', scene, 0xfff0ff, {x:0.5, y:0.5, z:0.5}, {x:1, y:1, z:1}, function(loadModel){
    car_model = loadModel;
    // getting size
    let car_box =  new THREE.Box3().setFromObject(car_model);
    car_bbox = new THREE.Box3().setFromObject(car_model);
    car_size = car_box.getSize(new THREE.Vector3());
    carChassisBody = functions.createCarBody(new THREE.Vector3(-45, 0.6, -0.15), new THREE.Vector3(car_size.x, car_size.y/20, car_size.z/2), world);

    car_debug = functions.create_debug_box(new THREE.BoxGeometry(car_size.x, car_size.y, car_size.z/2), scene);

    vehicle = new CANNON.RaycastVehicle({
        chassisBody: carChassisBody,
        indexRightAxis: 0,    
        indexUpAxis: 1,      
        indexForwardAxis: 2, 
    });

    const options = {
        radius: wheel_radius,
        suspensionStiffness: 15,
        directionLocal: new CANNON.Vec3(0, -1, 0),
        suspensionRestLength: 0.5,
        frictionSlip: 5,
        dampingRelaxation: 2.3,
        dampingCompression: 5,
        maxSuspensionForce: 100000,
        rollInfluence: 0.01,
        axleLocal: new CANNON.Vec3(-1, 0, 0),
        chassisConnectionPointLocal: new CANNON.Vec3(1, 1, 0),
        maxSuspensionTravel: 0.3,
        customSlidingRotationalSpeed: -30,
        useCustomSlidingRotationalSpeed: true
    };
    
    const axleWidth = 0.7;
    
    options.chassisConnectionPointLocal.set(axleWidth, 0.5, -1);
    vehicle.addWheel(options);
    
    options.chassisConnectionPointLocal.set(-axleWidth, 0.5, -1);
    vehicle.addWheel(options);
    
    options.chassisConnectionPointLocal.set(axleWidth, 0.5, 0.75);
    vehicle.addWheel(options);
    
    options.chassisConnectionPointLocal.set(-axleWidth, 0.5, 0.75);
    vehicle.addWheel(options);
    
    vehicle.addToWorld(world);
    
    // _______________________vehicle controls_______________________ //
    
    function car_controls(event) {
        if (event.type != 'keydown' && event.type != 'keyup') return;
    
        let keyup = event.type == 'keyup';
        vehicle.setBrake(0, 0);
        vehicle.setBrake(0, 1);
        vehicle.setBrake(0, 2);
        vehicle.setBrake(0, 3);
    
        let engine_force = 800, max_steer = 0.3;
        let brake_force = 8; // Define a high brake force
    
        switch(event.keyCode) {
            case 32: // forward
                control_sec.classList.add('hide');
                if (keyup) {
                    vehicle.applyEngineForce(0, 2);
                    vehicle.applyEngineForce(0, 3);
                    vehicle.setBrake(brake_force, 2); // Apply brake force to the rear wheels
                    vehicle.setBrake(brake_force, 3); // Apply brake force to the rear wheels
                } else {
                    vehicle.applyEngineForce(-engine_force, 2);
                    vehicle.applyEngineForce(-engine_force, 3);
                    vehicle.setBrake(0, 2);
                    vehicle.setBrake(0, 3);
                }
                break;
    
            case 8: // backward
                if (keyup) {
                    vehicle.applyEngineForce(0, 2);
                    vehicle.applyEngineForce(0, 3);
                    vehicle.setBrake(brake_force, 2); // Apply brake force to the rear wheels
                    vehicle.setBrake(brake_force, 3); // Apply brake force to the rear wheels
                } else {
                    vehicle.applyEngineForce(engine_force, 2);
                    vehicle.applyEngineForce(engine_force, 3);
                    vehicle.setBrake(0, 2);
                    vehicle.setBrake(0, 3);
                }
                break;
    
            // case 68: // right
            //   vehicle.setSteeringValue(keyup ? 0 : -max_steer, 2);
            //   vehicle.setSteeringValue(keyup ? 0 : -max_steer, 3);
            //   break;
    
            // case 65: // left
            //   vehicle.setSteeringValue(keyup ? 0 : max_steer, 2);
            //   vehicle.setSteeringValue(keyup ? 0 : max_steer, 3);
            //   break;
        }
    }
    
    if (!toggleButton.classList.contains('exit')) {
        window.addEventListener('keydown', car_controls);
        window.addEventListener('keyup', car_controls);
    }
})

// loading wheels
for (let i = 0; i < 2; i++) {
    const promise1 = functions.load_model_promise('wheelr.glb', './assets/models/', scene, 0xfff0ff, {x:0.5, y:0.5, z:0.5}, { x: 1, y: 1, z: 1 });
    const promise2 = functions.load_model_promise('wheell.glb', './assets/models/', scene, 0xfff0ff, {x:0.5, y:0.5, z:0.5}, { x: 1, y: 1, z: 1 });
    wheelPromises.push(promise1);
    wheelPromises.push(promise2);
}

Promise.all(wheelPromises)
    .then((models) => {
        models.forEach((model) => {
            wheel_models.push(model);
        });
        wheels_loaded = true;
    })
    .catch((error) => {
        console.error('Error loading wheel models:', error);
    });

// loading stores

for (let i = 0; i < 4; i++) {
    let shopmodel;
    let store_action;
    let store_mixer;
    functions.load_model_animation_base(`store-shutter-animation-nonbaked2-${i+1}.gltf`, './assets/models/', scene, 0xfff0ff, {x:(0.5*i)+(10*i), y:0.5, z:0.5}, {x:2, y:2, z:2}, function(loadModel){
        let { model: load_shop_model, mixer: loadedMixer, action: load_action } = loadModel;
        shopmodel = load_shop_model;
        store_mixer = loadedMixer;
        store_action = load_action;
        store_action.play();     
        
        let baord_light1 = shopmodel.getObjectByName('Icosphere_hide');
        let baord_light2 = shopmodel.getObjectByName('Icosphere001_hide');
        let baord_light3 = shopmodel.getObjectByName('Icosphere002_hide');

        let bbox = new THREE.Box3().setFromObject(shopmodel);
        var bbox_size = new THREE.Vector3();
        bbox.getSize(bbox_size);
    
        let shop_size = bbox.getSize(new THREE.Vector3());
        shop_sizef = new THREE.Vector3(shop_size.x - 2, shop_size.y - 3, shop_size.z - 2);
    
        let shop_phy_body = functions.create_phy_model(new CANNON.Vec3((0.5 * i) + (20 * i) - 33, 0, 0.5 - 10), shop_sizef, 0, world);
        let shop_debug = functions.create_debug_box(new THREE.BoxGeometry(shop_sizef.x+2, shop_sizef.y, shop_sizef.z+2), scene);
    
        shop_models.push([shopmodel, shop_phy_body, shop_debug, bbox, store_action, store_mixer, false, [baord_light1, baord_light2, baord_light3]]); // last - open or close
    });
}

let emit_scrolls = [3, 5, 0, 10, 9, 15, 16, 17]
let tex_path = [];
// loading containers and scrolls
for (let i=0; i <= 16; i++){
    if (!emit_scrolls.includes(i)){
        tex_path.push(`scroll_tex${i}`)
    }
}

let texs = {};
for (let t=0; t < tex_path.length; t++){
    texs[tex_path[t]] = new THREE.TextureLoader().load(`./assets/tex/${tex_path[t]}.png`);
    texs[tex_path[t]].flipY=false;
}

let scroll_count = 0;
for (let i=0; i < 4; i++){
    let y_change = 1;
    let x_change = 0;
    for (let j=1; j <= 6; j++){
        x_change++;
        if (j == 4){
            y_change = 0.7;
            x_change = 1;
        }

        let render_pos = new THREE.Vector3((0.5*i)+(20*i)-34 + (x_change*0.5), (3*y_change), 0.5-11)

        functions.load_glass_model('./assets/models/container.glb', scene, 0xc2e1e3, {x:render_pos.x, y:render_pos.y, z:render_pos.z}, {x:0.5, y:0.5, z:0.5}, function(loadModel){
        let container_model = loadModel;
        container_model.renderOrder = 1;
        
        let lidMesh = container_model.getObjectByName('lid');

        if (lidMesh && lidMesh.material) {
            lidMesh.material = new THREE.MeshStandardMaterial({
                color: 0xffffff,
                metalness: 0.1,
                roughness: 1,
                color: '#824403',
                envMap: scene.environment
            });
        
        }
        containers.push(container_model);
        
        if (containers.length == 24){
            functions.quickSort(containers, 0, containers.length-1)
        }
        });

        let scroll_model;
        let action;
        let mixer;
        functions.load_model_animation('123.glb', './assets/models/', scene, 0xc2e1e3, {x:render_pos.x, y:render_pos.y, z:render_pos.z}, {x:0.27, y:0.27, z:0.27}, function(loadModel){
            let { model: load_scroll_model, mixer: loadedMixer, action: load_action } = loadModel;
            
            scroll_model = load_scroll_model;
            mixer = loadedMixer;
            action = load_action;

            scroll_count++;

            action.play();
            scrolls.push([scroll_model, action, mixer, false, render_pos, false, 0]); // bool -> 1. rotation 2. open & close
            
            if (scrolls.length == 24){
                functions.quickSort2(scrolls, 0, scrolls.length-1)
            }
        });
    }
}

containers.forEach(container => {
    container.lidOpen = false;
});

// __________________________ loading decore__________________________
let barrels = []
let barrel_radius = 0.7
let barrel_height = 1.5
let barrel_seg = 14
let barrel_pos = [
    functions.create_phy_model_cylinder(new CANNON.Vec3(-24.3, 2, 7), barrel_radius, barrel_height, barrel_seg, 2, world),
    functions.create_phy_model_cylinder(new CANNON.Vec3(-41, 0.1, -3.9), barrel_radius, barrel_height, barrel_seg, 2, world),
    functions.create_phy_model_cylinder(new CANNON.Vec3(-43.3, 0.4, -3.1), barrel_radius, barrel_height, barrel_seg, 2, world),
    functions.create_phy_model_cylinder(new CANNON.Vec3(-6.9, 0.75, -1), barrel_radius, barrel_height, barrel_seg, 0.5, world),
    functions.create_phy_model_cylinder(new CANNON.Vec3(-5.5, 0.75, 0), barrel_radius, barrel_height, barrel_seg, 0.5, world),
    functions.create_phy_model_cylinder(new CANNON.Vec3(-6.9, 0.75, 1.2), barrel_radius, barrel_height, barrel_seg, 0.5, world),
    functions.create_phy_model_cylinder(new CANNON.Vec3(25.2, 0.75, -8), barrel_radius, barrel_height, barrel_seg, 1, world),
]

barrel_pos[0].quaternion.setFromAxisAngle(new CANNON.Vec3(1,1,0), -Math.PI / 3);
barrel_pos[1].quaternion.setFromAxisAngle(new CANNON.Vec3(1,0,0), Math.PI / 2);

const barrel_count = barrel_pos.length

for (let i=0; i < barrel_count; i++){
    let barrel_model;
    functions.load_model('barrel2.glb', './assets/models/', scene, 0xc2e1e3, {x:2*i, y:0, z:0}, {x:1, y:1, z:1}, function(loadModel){
    barrel_model = loadModel;

    let rim1 = barrel_model.getObjectByName('metal1');
    let rim2 = barrel_model.getObjectByName('metal2');

    if (rim1 && rim1.material) {
        rim1.material = new THREE.MeshStandardMaterial( {
            color: 0xaaaaaa,
            metalness: 1.0,
            roughness: 0.4
        } );
        
    }
    if (rim2 && rim2.material) {
        rim2.material = new THREE.MeshStandardMaterial( {
            color: 0xaaaaaa,
            metalness: 1.0,
            roughness: 0.4 
        } );
    }

    barrels.push([barrel_model, barrel_pos[i]]);

    // const folder = gui.addFolder(`Barrel ${i + 1}`);
    // folder.add(barrel_model.position, 'x', -50, 50).onChange(value => updateBarrelPosition(i, 'x', value));
    // folder.add(barrel_model.position, 'y', -10, 10).onChange(value => updateBarrelPosition(i, 'y', value));
    // folder.add(barrel_model.position, 'z', -50, 50).onChange(value => updateBarrelPosition(i, 'z', value));
    // folder.open();
});
}

let shelf_models = [];
let shelf_model_promises = [];
let dummy_decors = [2,3, 2, 3, 2, 2, 2, 3]
for (let i = 0; i <= 7; i++) {
    let loadPromise = functions.load_model_new(`shelf_decor${dummy_decors[i]}.glb`, './assets/models/', scene, 0xc2e1e3, {x: 2 * i, y: 0, z: 0}, {x: 0.2, y: 0.2, z: 0.2})
        .then((model) => {
            shelf_models.push(model);
    });
        shelf_model_promises.push(loadPromise);
}

function updateBarrelPosition(i, axis, value){
    const barrel = barrels[i];
    if (barrel){
        barrel[1].position[axis] = value;
    }    
}

let board1_model;
let board2_model;
functions.load_model('board1.glb', './assets/models/', scene, 0xc2e1e3, {x:-45, y:0.1, z:-3.9}, {x:0.3, y:0.3, z:0.3}, function(loadModel){
    board1_model = loadModel;
    board1_model.rotation.y -= Math.PI/2;
});
functions.load_model('board2.glb', './assets/models/', scene, 0xc2e1e3, {x:45, y:0.1, z:-3.9}, {x:0.3, y:0.3, z:0.3}, function(loadModel){
    board2_model = loadModel;
    board2_model.rotation.y -= Math.PI/2;
});

// _________________________obj elements__________________________ //

const ground = functions.load_texture_plane('./assets/tex/alpha-map2.png', scene);


function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]]; // Swap elements
    }
    return array;
}

Promise.all(shelf_model_promises).then(() => {
    const shuffledValues = shuffleArray(shelf_models);

    for (let i=0; i <= emit_scrolls.length; i++){
        const pos = tex_path.indexOf(`scroll_tex${emit_scrolls[i]}`)
        tex_path.splice(pos, 1)
        let next_model = shuffledValues[i]
        next_model.position.copy(containers[emit_scrolls[i]].position)
        scene.add(next_model)
        if (containers[emit_scrolls[i]].position.y >= 3){
            next_model.position.y += 0.1
        }
        next_model.position.y -= 0.3
        next_model.position.z -= 0.2
    }
}).catch((error) => {
    console.error(`Could not load model on async load. Error: ${error}`)
})

// ____________________.:obj elements physics:.____________________ /

const wheel_phy_mat = new CANNON.Material();
const {ground_phy_mat, ground_body} = functions.create_plane_phy(world, ground);

const ground_sphere_contact = new CANNON.ContactMaterial(
    wheel_phy_mat, 
    ground_phy_mat,
    {
        friction: 0.4,
        restitution: 1,
        contactEquationStiffness: 1000,
    }
);
world.addContactMaterial(ground_sphere_contact);

// ___________________.:obj raycast element:.____________________ //
const tl = gsap.timeline()
let current_cam_pos = new THREE.Vector3();
function look_at_object(pos, dist){
    controls.enabled = false;
    const adjust_pos = new THREE.Vector3(pos.x, pos.y+dist/2.3, pos.z+dist)
    tl.to(camera.position, {
        x: adjust_pos.x,
        y: adjust_pos.y,
        z: adjust_pos.z,
        duration: 1.5,
        onUpdate: () => {
            camera.lookAt(new THREE.Vector3(pos.x, pos.y+1.8, pos.z))
        },
    });
    const v1 = new THREE.Vector3(Math.round(camera.position.x), Math.round(camera.position.y), Math.round(camera.position.z))
    const v2 = new THREE.Vector3(Math.round(adjust_pos.x), Math.round(adjust_pos.y), Math.round(adjust_pos.z))
    if (v1.y == v2.y){
        current_cam_pos = new THREE.Vector3(adjust_pos.x, adjust_pos.y, adjust_pos.z)
    }
}

function reset_camera(){
    controls.enabled = false;
    if (car_model){
        camera.position.y = 3
        camera.position.x = car_model.position.x - 9;
        camera.position.z = car_model.position.z+18;
        camera.lookAt(new THREE.Vector3(car_model.position.x, car_model.position.y, car_model.position.z));
    }
}

let collisionDetected = false;
let in_area = false;
let selected_store = null;
// shop_btn.style.display = 'none';

function check_collision() {
    const shop_btn = document.querySelector('#enter-shop');
    collisionDetected = false;
    in_area = false;

    for (let i = 0; i < (shop_models.length-1); i++){
        let max_car_dist = car_debug.position.x + (car_debug.geometry.parameters.width)
        let min_car_dist = car_debug.position.x - (car_debug.geometry.parameters.depth * 2)
        let mid_car_dist = ((max_car_dist - min_car_dist)/2) + min_car_dist;

        let max_shop_dist = shop_models[i][2].position.x + (shop_models[i][2].geometry.parameters.width / 2)
        let min_shop_dist = shop_models[i][2].position.x - (shop_models[i][2].geometry.parameters.width / 2)

        if (shop_models[i][0]){
            if ((mid_car_dist >= min_shop_dist) && (mid_car_dist <= max_shop_dist)){
                shop_btn.style.display = '';
                in_area = true;

                if (!selectedContainer || (selectedContainer.position.z == -10.5)){
                    toggleButton.classList.remove('disappear');
                    toggleButton.classList.add('appear');
                }else{
                    toggleButton.classList.remove('appear');
                    toggleButton.classList.add('disappear');
                }

                if (toggleButton.classList.contains('enter')){
                    look_at_object(shop_models[i][0].position, 7);
            
                    if (!blinkInterval) {
                        blinkShutters(shop_models[i]);
                    }
                    if (shop_models[i][4].time === 0.75){
                        shop_models[i][7][0].visible = false;
                        shop_models[i][7][1].visible = false;
                        shop_models[i][7][2].visible = false;
                    }
                    collisionDetected = true;
                    selected_store = shop_models[i];
                }
                break;  
        }
    }
}

    if (!in_area){
        toggleButton.classList.add('disappear');
        toggleButton.classList.remove('appear');
    }
    if (!collisionDetected){
        toggleButton.classList.remove('enter');
        toggleButton.classList.add('none');
        reset_camera();
        shop_models.forEach(i => {
            i[7][0].visible = true;
            i[7][1].visible = true;
            i[7][2].visible = true;
        });

        if (blinkInterval) {
            clearInterval(blinkInterval);
            blinkInterval = null;
        }
    }
}

function move_obj(obj, pos) {
    gsap.to(obj.position, {
        x: pos.x,
        y: pos.y,
        z: pos.z,
        duration: 1,
    });
}

function rot_obj(obj, pos){
    gsap.to(obj.rotation, {
        x: pos.x,
        y: pos.y,
        z: pos.z,
        duration:1,
    }
    )
}

function toggleLid(container) {
    const lidMesh = container.getObjectByName('lid');

    if (lidMesh) {
        const targetPositionx = lidMesh.position.x === 0.3 ? -0.015 : 0.3; 
        const targetPositiony = lidMesh.position.y ===  0.7 ? 0.56 : 0.7; 
        const targetRotation = lidMesh.rotation.z === -2.5 ? 0.03 : -2.5; 

        gsap.to(lidMesh.position, {
            x: targetPositionx,
            y: targetPositiony,
            duration: 1,
        });
        gsap.to(lidMesh.rotation, {
            z:targetRotation,
            duration: 1,
        });

        container.lidOpen = !container.lidOpen; // Toggle lidOpen state
    }
}

let is_selected = false;
let object_rotate = false;
const initial_pos = [];
let default_pos = new THREE.Vector3();
let selectedContainer = null;
let max_dist = 0;
let min_dist = 0;

let blinkInterval = null;

function blinkShutters(shop_model) {
    let blinkDuration = 100; // Duration of each blink in milliseconds
    let totalBlinkTime = 850; // Total time for blinking effect in milliseconds
    let blinkCount = Math.floor(totalBlinkTime / (blinkDuration * 2));
    let blinkedTimes = 0;

    blinkInterval = setInterval(() => {
        if (blinkedTimes < blinkCount) {
            shop_model[7][0].visible = !shop_model[7][0].visible;
            shop_model[7][1].visible = !shop_model[7][1].visible;
            shop_model[7][2].visible = !shop_model[7][2].visible;
            blinkedTimes++;
        } else {
            clearInterval(blinkInterval);
            shop_model[7][0].visible = true;
            shop_model[7][1].visible = true;
            shop_model[7][2].visible = true;
        }
    }, blinkDuration);
}
window.addEventListener('mousemove', (e) => {
    const mouse = new THREE.Vector2();
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(containers, true);
   
    if (intersects.length > 0) {
        if ((!selectedContainer) || (selectedContainer && scrolls[containers.indexOf(selectedContainer)][0].position.z === -10.5)){
            outlinePass.selectedObjects = [containers.find(container => container === intersects[0].object.parent)];
        }else {
            outlinePass.selectedObjects = [];
        }
    } else {
        outlinePass.selectedObjects = [];
    }
});

document.addEventListener('click', (e) => {
    if (control_sec.style.opacity <= 0){
        control_sec.style.display = 'none';
    }

    const mouse = new THREE.Vector2();
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(containers, true);

    if (intersects.length > 0) {
        is_selected = true
        const clickedObject = intersects[0].object;

        let item = containers.find(container => container === clickedObject.parent);
        if (selectedContainer !== null){
            max_dist = selectedContainer.position.z;
        }else{
            max_dist = item.position.z;
        }
        min_dist = current_cam_pos.z;

        if ((max_dist <= item.position.z) && (camera.position.z <= -1)){
            selectedContainer = containers.find(container => container === clickedObject.parent);
        }

        var selected_scroll = scrolls[containers.indexOf(selectedContainer)][0]
        if ((selectedContainer.position.z !== current_cam_pos.z-1 ) && (camera.position.z <= -1)) {

            if (!initial_pos[selectedContainer.uuid]){
                initial_pos[selectedContainer.uuid] = selectedContainer.position.clone();
            }
            move_obj(selectedContainer, new THREE.Vector3(current_cam_pos.x, current_cam_pos.y-0.2, current_cam_pos.z-1));
            move_obj(selected_scroll, new THREE.Vector3(current_cam_pos.x, current_cam_pos.y-0.2, current_cam_pos.z-1));
            scrolls[containers.indexOf(selectedContainer)][3] = true;
            object_rotate = true;
        }
        default_pos = initial_pos[selectedContainer.uuid]

        // move container and scroll back if lid closed
        const lidMesh = selectedContainer.getObjectByName('lid');

        if (selectedContainer && selectedContainer.position.z == (current_cam_pos.z - 1) && lidMesh.position.y.toFixed(2) == 0.56) {
            // toggleButton.classList.add('appear');
            // toggleButton.classList.remove('disappear');
            
            move_obj(selectedContainer, default_pos);
            move_obj(scrolls[containers.indexOf(selectedContainer)][0], default_pos);
            object_rotate = false;
        
            // Save current animation time
            scrolls[containers.indexOf(selectedContainer)][6] = scrolls[containers.indexOf(selectedContainer)][1].time;
        }
    }

    if ((selectedContainer && selectedContainer.position.y.toFixed(1) === (current_cam_pos.y - 2).toFixed(1)) || (!selected_store && selectedContainer)) {
        const intersect_scroll = raycaster.intersectObject(scrolls[containers.indexOf(selectedContainer)][0]);
        if (intersect_scroll.length > 0) {
            object_rotate = false;
    
            move_obj(selectedContainer, default_pos);
            move_obj(scrolls[containers.indexOf(selectedContainer)][0], default_pos);
            toggleLid(selectedContainer);
            scrolls[containers.indexOf(selectedContainer)][5] = false; // set scroll to close state
    
            // Restore animation time
            const savedTime = scrolls[containers.indexOf(selectedContainer)][6];
            scrolls[containers.indexOf(selectedContainer)][1].reset();
            scrolls[containers.indexOf(selectedContainer)][1].time = savedTime;
            scrolls[containers.indexOf(selectedContainer)][1].paused = true;
        }
    }
    

});

// _______________________________________________________________ //

let wheel_visual;
let loaded_scrolls = false;

function animate(){

    if (!loaded_scrolls && (scrolls.length == 24)){
        for (let scroll_count=0; scroll_count <= scrolls.length; scroll_count++){
            if (texs[`scroll_tex${scroll_count}`] !== undefined){
                scrolls[scroll_count][0].traverse((child) => {
                    if(child.isMesh){
                        child.material.map = texs[`scroll_tex${scroll_count}`];
                    }
                });
            } if (emit_scrolls.indexOf(scroll_count) !== -1){
                scene.remove(containers[scroll_count]);
                if (containers[scroll_count].geometry){
                    containers[scroll_count].geometry.dispose();
                }
                containers[scroll_count].children.forEach(child => {
                    containers[scroll_count].remove(child);
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) child.material.dispose();
                  });
                if (scrolls[scroll_count]){
                    scene.remove(scrolls[scroll_count][0]);
                    if (scrolls[scroll_count][0].geometry){
                        scrolls[scroll_count][0].geometry.dispose();
                    }
                }
            }
        }
        loaded_scrolls = true;
    }

    const et = Date.now() - startTime;

    if (!collisionDetected){
        controls.enabled = true;
        controls.update();
    }else{
        controls.enabled = false;
        tl.clear()
    }

    world.step(timeStep);
    scrolls.forEach(scroll => {
        if (scroll[2]){
            scroll[2].update(timeStep);
        }
    });
    shop_models.forEach(shop => {
        if (shop[5]){
            shop[5].update(timeStep);
        }
    });
    
    ground.quaternion.copy(ground_body.quaternion);

    // update car model pos 
    if (car_model){
        car_model.position.copy(carChassisBody.position);
        car_model.quaternion.copy(carChassisBody.quaternion);
        
        car_debug.scale.copy(new THREE.Vector3(car_size.x, car_size.y, car_size.z));
        car_debug.position.copy(carChassisBody.position);
        car_debug.quaternion.copy(carChassisBody.quaternion);

        car_model.traverse((child) => {
            if (child.isMesh){
                car_model_geo = child.geometry;
            }
        })

        car_debug.scale.copy(car_size);
        car_debug.position.copy(car_model.position)
        car_debug.quaternion.copy(car_model.quaternion)
        
        vehicle.wheelInfos.forEach((wheel, index) => {
            if (wheels_loaded && wheel_models.length > 0) {
                wheel_visual = wheel_models[index];
            } else {
                if (!wheel_visual) {
                    wheel_visual = functions.create_cylinder(0.4, 0.3, 20);
                    wheelVisuals[index] = wheel_visual;
                }
            }
            const t = vehicle.wheelInfos[index].worldTransform;
            wheel_visual.position.copy(t.position);
            wheel_visual.quaternion.copy(t.quaternion);
        });
        if (carChassisBody.position.y <= -5){
            carChassisBody.position.x = -45;
            carChassisBody.position.y = 0.6;
            carChassisBody.position.z = 0.15;
            carChassisBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0,1,0), Math.PI / 2);
        }
    }

    // update shop model pos 
    if (shop_models.length > 0){
        for (let i=0; i < 4; i++){
            // set model position to physics position
            if (shop_models[i]){
                shop_models[i][0].position.copy(shop_models[i][1].position);
                shop_models[i][0].quaternion.copy(shop_models[i][1].quaternion);
                
                // set debug box positions
                shop_models[i][2].position.copy(shop_models[i][0].position);
                shop_models[i][2].quaternion.copy(shop_models[i][0].quaternion);

            }

        }
    }
    
    // update container  model pos 
    if (selectedContainer) {

        const lidMesh = selectedContainer.getObjectByName('lid');

        if (selectedContainer.position.z === current_cam_pos.z-1){
            if (selectedContainer && selectedContainer.position.z === -3.5 && !scrolls[containers.indexOf(selectedContainer)][5]) {
                toggleLid(selectedContainer);
            }
        }

        if (lidMesh.position.y.toFixed(1) == 0.7 && !scrolls[containers.indexOf(selectedContainer)][5] && selectedContainer.position.z === current_cam_pos.z-1){
            const corner_pos = new THREE.Vector3(current_cam_pos.x, current_cam_pos.y-2, current_cam_pos.z-1)
            scrolls[containers.indexOf(selectedContainer)][1].play()
            scrolls[containers.indexOf(selectedContainer)][1].paused = false;             // start scroll animation
            scrolls[containers.indexOf(selectedContainer)][3] = false;                    // stop scroll rotation
            scrolls[containers.indexOf(selectedContainer)][5] = true; 
            rot_obj(scrolls[containers.indexOf(selectedContainer)][0], new THREE.Vector3((Math.PI/2) - 0.15, 0, 0))
            move_obj(scrolls[containers.indexOf(selectedContainer)][0], new THREE.Vector3(current_cam_pos.x, current_cam_pos.y+0.27, current_cam_pos.z-1.06));
            gsap.to(selectedContainer.position, {
                x: corner_pos.x,
                y: corner_pos.y,
                z: corner_pos.z,
                duration:1,
            }
            )
        }
        
        if (object_rotate) {
            selectedContainer.rotation.x += 0.001;
            selectedContainer.rotation.y += 0.003;
            selectedContainer.rotation.z += 0.001;
            const index = containers.indexOf(selectedContainer);
            if (scrolls[index][3]){
                scrolls[index][0].rotation.x += 0.001;
                scrolls[index][0].rotation.y += 0.003;
                scrolls[index][0].rotation.z += 0.001;
            }
            
        } else {
            rot_obj(selectedContainer, {x:0, y:0, z:0})
            rot_obj(scrolls[containers.indexOf(selectedContainer)][0], {x:0, y:0, z: Math.PI/2})
        }
    }

    // update barrel model pos 
    if (barrels.length > 0){
        for (let i=0; i < barrel_count; i++){
            if (barrels[i]){
                barrels[i][0].position.copy(barrels[i][1].position);
                barrels[i][0].quaternion.copy(barrels[i][1].quaternion);
            }

        }
    }

    if (selected_store){
        if (!collisionDetected) {
            selected_store[4].paused = false;
            selected_store[4].timeScale = -1;
            selected_store[4].play();
            selected_store[6] = false; // Set shop to closed

        } else {
            selected_store[4].paused = false;
            selected_store[4].timeScale = 1;
            selected_store[4].play();
        }
    }

    grassUniforms.iTime.value = et;

    // ______________________________________________________________ //
    check_collision();

    
    // render.render(scene, camera);

    requestAnimationFrame(animate);
    composer.render()
}
animate();
formControls.detach();

// ___________________________resize_____________________________ //

function onWindowResize(){
    window.addEventListener("resize", () => {
        sizes.width = window.innerWidth, 
        sizes.height = window.innerHeight
    
        camera.updateProjectionMatrix();
        camera.aspect = sizes.width / sizes.height;
        render.setSize(sizes.width, sizes.height);
        composer.setSize(sizes.width, sizes.height);

    })
}

onWindowResize();
