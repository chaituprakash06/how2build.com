import * as THREE from 'three';
// Fix import for OrbitControls
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class ModelViewer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private currentModel: THREE.Group | null = null;

  constructor(container: HTMLElement) {
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x003366); // Dark blue for blueprint style
    
    // Create camera
    this.camera = new THREE.PerspectiveCamera(
      75, 
      window.innerWidth / window.innerHeight, 
      0.1, 
      1000
    );
    this.camera.position.set(0, 2, 5);
    
    // Create renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    container.appendChild(this.renderer.domElement);
    
    // Add controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    
    // Add lighting
    this.addLights();
    
    // Add grid for blueprint effect
    this.createGrid();
    
    // Start animation loop
    this.animate();
    
    // Handle window resize
    window.addEventListener('resize', () => this.onWindowResize());
  }
  
  private addLights(): void {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);
    
    // Directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7);
    directionalLight.castShadow = true;
    this.scene.add(directionalLight);
  }
  
  private createGrid(): void {
    // Grid helper
    const gridHelper = new THREE.GridHelper(20, 20, 0x0088ff, 0x00aaff);
    gridHelper.position.y = -0.5;
    this.scene.add(gridHelper);
    
    // Create circular reference lines (for blueprint look)
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x00ccff });
    this.createCircle(3, 64, -0.49, lineMaterial);
    this.createCircle(1.5, 32, -0.49, lineMaterial);
  }
  
  private createCircle(radius: number, segments: number, y: number, material: THREE.Material): void {
    const points = [];
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      points.push(
        new THREE.Vector3(
          radius * Math.cos(theta),
          y,
          radius * Math.sin(theta)
        )
      );
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const circle = new THREE.Line(geometry, material);
    this.scene.add(circle);
  }
  
  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
  
  private animate = (): void => {
    requestAnimationFrame(this.animate);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  // Load model based on description from LLM
  public loadModel(modelData: any): void {
    // Remove existing model if present
    if (this.currentModel) {
      this.scene.remove(this.currentModel);
    }
    
    this.currentModel = this.createModelFromDescription(modelData);
    this.scene.add(this.currentModel);
  }
  
  // Update model state based on repair step
  public updateModelState(state: any): void {
    if (!this.currentModel) return;
    
    // Reset transformations
    this.currentModel.rotation.set(0, 0, 0);
    
    // Apply rotation if specified
    if (state.rotation) {
      this.currentModel.rotation.set(
        state.rotation[0] || 0,
        state.rotation[1] || 0,
        state.rotation[2] || 0
      );
    }
    
    // Handle part visibility and highlighting
    this.currentModel.traverse((child: THREE.Object3D) => {
      if (!(child instanceof THREE.Mesh) || !child.userData.partName) {
        return;
      }
      
      try {
        // Reset visibility
        child.visible = true;
        
        // Hide parts if specified
        if (state.hideParts && Array.isArray(state.hideParts) && 
            state.hideParts.includes(child.userData.partName)) {
          child.visible = false;
        }
        
        // Reset material if we have an original stored
        if (child.userData.originalMaterial) {
          try {
            // Make sure we get a fresh clone of the original
            child.material = child.userData.originalMaterial.clone();
          } catch (err) {
            console.warn('Error cloning original material:', err);
          }
        }
        
        // Highlight parts if specified
        if (state.highlightParts && Array.isArray(state.highlightParts) && 
            state.highlightParts.includes(child.userData.partName)) {
          
          // Store original material if needed (only once)
          if (!child.userData.originalMaterial) {
            try {
              child.userData.originalMaterial = (child.material as THREE.Material).clone();
            } catch (err) {
              console.warn('Error storing original material:', err);
              // Continue anyway, we'll create a new material
            }
          }
          
          try {
            // Create a new material for highlighting
            const highlightMaterial = new THREE.MeshStandardMaterial({
              color: (child.material as THREE.MeshStandardMaterial).color,
              metalness: (child.material as THREE.MeshStandardMaterial).metalness || 0.7,
              roughness: (child.material as THREE.MeshStandardMaterial).roughness || 0.3,
              emissive: new THREE.Color(0x555500),
              emissiveIntensity: 0.5
            });
            
            // Apply the highlight material
            child.material = highlightMaterial;
          } catch (err) {
            console.error('Error applying highlight material:', err);
          }
        }
      } catch (err) {
        console.error('Error processing mesh:', err);
      }
    });
  }
  
  // Create model from LLM description
  private createModelFromDescription(description: any): THREE.Group {
    const group = new THREE.Group();
    
    // Get object type and properties
    const { objectType, parts, dimensions } = description;
    
    // Create base geometry based on object type
    const baseGeometry = this.createBaseGeometry(objectType, dimensions);
    const baseMaterial = new THREE.MeshStandardMaterial({ 
      color: new THREE.Color(description.color || 0xc0c0c0),
      metalness: description.metalness || 0.8,
      roughness: description.roughness || 0.2
    });
    
    const baseMesh = new THREE.Mesh(baseGeometry, baseMaterial);
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    baseMesh.userData.partName = 'base';
    group.add(baseMesh);
    
    // Add parts if specified
    if (parts && Array.isArray(parts)) {
      parts.forEach(part => this.addPartToModel(group, part));
    }
    
    return group;
  }
  
  private createBaseGeometry(type: string, dimensions: any): THREE.BufferGeometry {
    // Default dimensions
    const size = dimensions || { width: 1, height: 1, depth: 1, radius: 0.5 };
    
    switch(type) {
      case 'tap':
        return new THREE.CylinderGeometry(size.radius, size.radius, size.height, 32);
      case 'pipe':
        return new THREE.CylinderGeometry(size.radius, size.radius, size.length, 32);
      case 'sink':
        return new THREE.BoxGeometry(size.width, size.height, size.depth);
      default:
        return new THREE.BoxGeometry(size.width || 1, size.height || 1, size.depth || 1);
    }
  }
  
  private addPartToModel(group: THREE.Group, part: any): void {
    let geometry: THREE.BufferGeometry;
    
    // Create geometry based on part type
    switch(part.type) {
      case 'handle':
        geometry = new THREE.BoxGeometry(
          part.width || 0.3, 
          part.height || 0.3, 
          part.depth || 0.3
        );
        break;
      case 'spout':
        geometry = new THREE.CylinderGeometry(
          part.radius || 0.2, 
          part.radius || 0.2, 
          part.length || 2, 
          32
        );
        break;
      case 'connector':
        geometry = new THREE.CylinderGeometry(
          part.radius || 0.3, 
          part.radius || 0.3, 
          part.length || 0.7, 
          32
        );
        break;
      default:
        geometry = new THREE.SphereGeometry(part.radius || 0.2, 32, 32);
    }
    
    // Create material
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(part.color || 0xc0c0c0),
      metalness: part.metalness || 0.8,
      roughness: part.roughness || 0.2
    });
    
    // Create mesh
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.partName = part.name || part.type;
    
    // Position the part
    if (part.position) {
      mesh.position.set(
        part.position.x || 0,
        part.position.y || 0,
        part.position.z || 0
      );
    }
    
    // Apply rotation if specified
    if (part.rotation) {
      mesh.rotation.set(
        part.rotation.x || 0,
        part.rotation.y || 0,
        part.rotation.z || 0
      );
    }
    
    group.add(mesh);
  }
}