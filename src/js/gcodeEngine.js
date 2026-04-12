export class GCodeEngine {
  constructor(core, realWidthMm = 150) {
    this.core = core;
    this.realWidthMm = realWidthMm;
  }

  // 1. Path generation & normalization
  generateNormalizedPaths() {
    const canvasWidth = this.core.canvas.width;
    const canvasHeight = this.core.canvas.height;
    
    // The user formula: X_robot = X_pixel * (realWidthMm / canvasWidth)
    const scaleFactor = this.realWidthMm / canvasWidth;

    const entities = this.core.scene.entities.getAll();
    let paths = [];

    for (const entity of entities) {
      if (!this.core.layerManager.getItemByName(entity.layer)?.isVisible) {
        continue;
      }

      let pathCoords = [];
      const type = entity.type || entity.constructor.name;

      if (type === 'Line') {
        pathCoords.push({ x: entity.points[0].x, y: entity.points[0].y });
        pathCoords.push({ x: entity.points[1].x, y: entity.points[1].y });
      } else if (type === 'Circle') {
        const cx = entity.points[0].x;
        const cy = entity.points[0].y;
        const r = entity.radius;
        const segments = 64;
        for (let i = 0; i <= segments; i++) {
          const theta = (i / segments) * Math.PI * 2;
          pathCoords.push({
            x: cx + r * Math.cos(theta),
            y: cy + r * Math.sin(theta)
          });
        }
      } else if (type === 'Arc') {
        const cx = entity.points[0].x;
        const cy = entity.points[0].y;
        const r = entity.radius;
        
        let startAngle = entity.direction > 0 ? entity.startAngle() : entity.endAngle();
        let endAngle = entity.direction > 0 ? entity.endAngle() : entity.startAngle();
        
        if (entity.direction > 0 && startAngle >= endAngle) {
          endAngle += Math.PI * 2;
        } else if (entity.direction < 0 && startAngle <= endAngle) {
          startAngle += Math.PI * 2;
        }

        const totalAngle = Math.abs(endAngle - startAngle);
        const segments = Math.max(8, Math.floor((totalAngle / (Math.PI * 2)) * 64));
        
        for (let i = 0; i <= segments; i++) {
          const t = i / segments;
          const theta = startAngle + (endAngle - startAngle) * t;
          pathCoords.push({
            x: cx + r * Math.cos(theta),
            y: cy + r * Math.sin(theta)
          });
        }
      } else if (entity.points && Array.isArray(entity.points)) {
        // Fallback for Polylines, Rectangles, etc.
        for (const pt of entity.points) {
          pathCoords.push({ x: pt.x, y: pt.y });
        }
      }

      if (pathCoords.length > 0) {
        // Normalize immediately
        const normalizedPath = pathCoords.map(p => ({
          x: p.x * scaleFactor,
          y: p.y * scaleFactor
        }));
        paths.push(normalizedPath);
      }
    }

    return paths;
  }

  // 2. Optimization: Nearest Neighbor
  optimizePaths(paths) {
    if (paths.length === 0) return [];
    
    let unvisited = [...paths];
    let optimized = [];
    let currentPoint = { x: 0, y: 0 }; // Start at robot origin (0,0)

    while (unvisited.length > 0) {
      let nearestDist = Infinity;
      let nearestIndex = -1;
      let reversePath = false;

      for (let i = 0; i < unvisited.length; i++) {
        const path = unvisited[i];
        const startPt = path[0];
        const endPt = path[path.length - 1];

        const distToStart = Math.hypot(startPt.x - currentPoint.x, startPt.y - currentPoint.y);
        const distToEnd = Math.hypot(endPt.x - currentPoint.x, endPt.y - currentPoint.y);

        if (distToStart < nearestDist) {
          nearestDist = distToStart;
          nearestIndex = i;
          reversePath = false;
        }
        
        if (distToEnd < nearestDist) {
          nearestDist = distToEnd;
          nearestIndex = i;
          reversePath = true;
        }
      }

      let chosenPath = unvisited.splice(nearestIndex, 1)[0];
      if (reversePath) {
        chosenPath.reverse();
      }
      
      optimized.push(chosenPath);
      currentPoint = chosenPath[chosenPath.length - 1];
    }

    return optimized;
  }

  // 3. String Conversion
  convertToGCode(paths) {
    let gcode = [];
    // Hardware is basic: skip G21/G90 since they might not reply with 'ok'

    
    // Configurable feedrate
    const feedrate = 400;

    for (const path of paths) {
      if (path.length === 0) continue;

      // Air-travel (G0) to the start of the path
      gcode.push("M3 S0 ; Pen Up");
      gcode.push(`G0 X${path[0].x.toFixed(3)} Y${path[0].y.toFixed(3)}`);
      
      // Pen down command here (if required, e.g., M280 P0 S90 or Z-axis move)
      gcode.push("M3 S90 ; Pen Down");

      // Draw the path (G1)
      for (let i = 1; i < path.length; i++) {
        gcode.push(`G1 X${path[i].x.toFixed(3)} Y${path[i].y.toFixed(3)} F${feedrate}`);
      }

      // Pen up command here
      gcode.push("M3 S0 ; Pen Up");
    }

    // Go back to origin 
    gcode.push("G0 X0 Y0");
    return gcode;
  }

  // Orchestrator
  generate() {
    console.log("Generating paths...");
    const paths = this.generateNormalizedPaths();
    console.log(`Generated ${paths.length} paths.`);
    const optimized = this.optimizePaths(paths);
    console.log("Paths optimized.");
    const gcodeObj = this.convertToGCode(optimized);
    return gcodeObj;
  }
}
