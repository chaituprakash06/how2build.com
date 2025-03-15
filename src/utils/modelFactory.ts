// src/utils/modelFactory.ts
import * as THREE from 'three';

export function createModelFromDescription(description: any): THREE.Group {
  const group = new THREE.Group();
  
  // Extract object type and properties from the LLM response
  const { objectType, parts, dimensions } = description;
  
  // Create base geometry
  const baseGeometry = createBaseGeometry(objectType, dimensions);
  const baseMaterial = new THREE.MeshStandardMaterial({ 
    color: description.color || 0xc0c0c0,
    metalness: description.metalness || 0.8,
    roughness: description.roughness || 0.2
  });
  
  const baseMesh = new THREE.Mesh(baseGeometry, baseMaterial);
  group.add(baseMesh);
  
  // Add object-specific parts
  if (parts && Array.isArray(parts)) {
    parts.forEach(part => addPartToModel(group, part));
  }
  
  return group;
}

function createBaseGeometry(type: string, dimensions: any): THREE.BufferGeometry {
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
      // Generic object as fallback
      return new THREE.BoxGeometry(size.width || 1, size.height || 1, size.depth || 1);
  }
}

function addPartToModel(group: THREE.Group, part: any): void {
  // Create geometries based on part descriptions
  let geometry: THREE.BufferGeometry;
  let material: THREE.Material;
  let mesh: THREE.Mesh;
  
  switch(part.type) {
    case 'handle':
      geometry = new THREE.BoxGeometry(part.width || 0.3, part.height || 0.3, part.depth || 0.3);
      break;
    case 'spout':
      geometry = new THREE.CylinderGeometry(part.radius || 0.2, part.radius || 0.2, part.length || 2, 32);
      break;
    case 'connector':
      geometry = new THREE.CylinderGeometry(part.radius || 0.3, part.radius || 0.3, part.length || 0.7, 32);
      break;
    default:
      geometry = new THREE.SphereGeometry(part.radius || 0.2, 32, 32);
  }
  
  material = new THREE.MeshStandardMaterial({
    color: part.color || 0xc0c0c0,
    metalness: part.metalness || 0.8,
    roughness: part.roughness || 0.2
  });
  
  mesh = new THREE.Mesh(geometry, material);
  
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