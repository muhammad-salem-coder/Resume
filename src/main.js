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