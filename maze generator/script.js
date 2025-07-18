
// --- DOM Elements ---
const canvas = document.getElementById('mazeCanvas');
const ctx = canvas.getContext('2d');
const generateBtn = document.getElementById('generateBtn');
const solveBfsBtn = document.getElementById('solveBfsBtn');
const solveDfsBtn = document.getElementById('solveDfsBtn');
const solveAStarBtn = document.getElementById('solveAStarBtn');
const sizeSlider = document.getElementById('sizeSlider');
const speedSlider = document.getElementById('speedSlider');
const sizeValue = document.getElementById('sizeValue');
const sizeValue2 = document.getElementById('sizeValue2');
const speedValue = document.getElementById('speedValue');
const statusEl = document.getElementById('status');
const solverBtns = document.querySelectorAll('.solver-btn');

// --- State Variables ---
let maze, cols, rows, cellSize;
let isGenerating = false;
let isSolving = false;
let animationSpeed = 50;
let animationFrameId;

// --- Cell Class ---
class Cell {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.walls = { top: true, right: true, bottom: true, left: true };
        this.visited = false;
        // For solvers
        this.parent = null;
        this.g = Infinity; // Cost from start
        this.h = 0;        // Heuristic cost to end
        this.f = Infinity; // g + h
    }

    draw(color = '#1f2937') { // Default to background color
        const xPos = this.x * cellSize;
        const yPos = this.y * cellSize;

        ctx.fillStyle = color;
        ctx.fillRect(xPos, yPos, cellSize, cellSize);

        ctx.strokeStyle = '#4b5563'; // gray-600 for walls
        ctx.lineWidth = 2;

        if (this.walls.top) {
            ctx.beginPath();
            ctx.moveTo(xPos, yPos);
            ctx.lineTo(xPos + cellSize, yPos);
            ctx.stroke();
        }
        if (this.walls.right) {
            ctx.beginPath();
            ctx.moveTo(xPos + cellSize, yPos);
            ctx.lineTo(xPos + cellSize, yPos + cellSize);
            ctx.stroke();
        }
        if (this.walls.bottom) {
            ctx.beginPath();
            ctx.moveTo(xPos + cellSize, yPos + cellSize);
            ctx.lineTo(xPos, yPos + cellSize);
            ctx.stroke();
        }
        if (this.walls.left) {
            ctx.beginPath();
            ctx.moveTo(xPos, yPos + cellSize);
            ctx.lineTo(xPos, yPos);
            ctx.stroke();
        }
    }

    getNeighbors(grid) {
        const neighbors = [];
        const { x, y } = this;

        const top = y > 0 ? grid[y - 1][x] : undefined;
        const right = x < cols - 1 ? grid[y][x + 1] : undefined;
        const bottom = y < rows - 1 ? grid[y + 1][x] : undefined;
        const left = x > 0 ? grid[y][x - 1] : undefined;

        if (top && !top.visited) neighbors.push(top);
        if (right && !right.visited) neighbors.push(right);
        if (bottom && !bottom.visited) neighbors.push(bottom);
        if (left && !left.visited) neighbors.push(left);

        return neighbors;
    }

    getValidMoveNeighbors(grid) {
        const neighbors = [];
        const { x, y } = this;

        // Top
        if (!this.walls.top) {
            neighbors.push(grid[y - 1][x]);
        }
        // Right
        if (!this.walls.right) {
            neighbors.push(grid[y][x + 1]);
        }
        // Bottom
        if (!this.walls.bottom) {
            neighbors.push(grid[y + 1][x]);
        }
        // Left
        if (!this.walls.left) {
            neighbors.push(grid[y][x - 1]);
        }
        return neighbors;
    }
}

// --- Maze Generation (Randomized DFS) ---
async function generateMaze() {
    if (isGenerating || isSolving) return;
    isGenerating = true;
    updateButtonStates();
    statusEl.textContent = 'Generating Maze...';

    cols = rows = parseInt(sizeSlider.value);
    setupCanvas();
    maze = Array.from({ length: rows }, (_, y) => Array.from({ length: cols }, (_, x) => new Cell(x, y)));

    const stack = [];
    let current = maze[0][0];
    current.visited = true;

    const generationLoop = () => {
        if (!isGenerating) {
            drawMaze();
            statusEl.textContent = 'Ready to Solve!';
            return;
        }

        drawMaze(); // Redraw entire maze to clear previous highlights
        highlightCell(current, '#3b82f6'); // Highlight current cell in blue

        const neighbors = current.getNeighbors(maze);
        if (neighbors.length > 0) {
            stack.push(current);
            const next = neighbors[Math.floor(Math.random() * neighbors.length)];
            removeWalls(current, next);
            current = next;
            current.visited = true;
        } else if (stack.length > 0) {
            current = stack.pop();
        } else {
            // Generation complete
            isGenerating = false;
            updateButtonStates();
            drawMaze();
            statusEl.textContent = 'Ready to Solve!';
            return;
        }

        setTimeout(() => requestAnimationFrame(generationLoop), 101 - animationSpeed);
    };

    generationLoop();
}

function removeWalls(a, b) {
    const dx = a.x - b.x;
    if (dx === 1) { // b is left of a
        a.walls.left = false;
        b.walls.right = false;
    } else if (dx === -1) { // b is right of a
        a.walls.right = false;
        b.walls.left = false;
    }
    const dy = a.y - b.y;
    if (dy === 1) { // b is top of a
        a.walls.top = false;
        b.walls.bottom = false;
    } else if (dy === -1) { // b is bottom of a
        a.walls.bottom = false;
        b.walls.top = false;
    }
}

// --- Solvers ---
async function solve(algorithm) {
    if (isGenerating || isSolving) return;
    isSolving = true;
    updateButtonStates();
    resetMazeState();
    drawMaze();

    const start = maze[0][0];
    const end = maze[rows - 1][cols - 1];

    let openSet;
    let current;

    // --- Algorithm-specific setup ---
    if (algorithm === 'bfs') {
        statusEl.textContent = 'Solving with BFS...';
        openSet = [start]; // Queue
    } else if (algorithm === 'dfs') {
        statusEl.textContent = 'Solving with DFS...';
        openSet = [start]; // Stack
    } else if (algorithm === 'astar') {
        statusEl.textContent = 'Solving with A*...';
        openSet = [start]; // Priority Queue (simulated with sorted array)
        start.g = 0;
        start.h = heuristic(start, end);
        start.f = start.h;
    }

    start.visited = true;

    const solveLoop = () => {
        if (!isSolving || openSet.length === 0) {
            statusEl.textContent = openSet.length === 0 ? 'No solution found!' : 'Solve cancelled.';
            isSolving = false;
            updateButtonStates();
            return;
        }

        // --- Get next cell based on algorithm ---
        if (algorithm === 'bfs') {
            current = openSet.shift(); // Dequeue
        } else if (algorithm === 'dfs') {
            current = openSet.pop(); // Pop from stack
        } else if (algorithm === 'astar') {
            // Find node with lowest f score
            openSet.sort((a, b) => a.f - b.f);
            current = openSet.shift();
        }

        // --- Check for completion ---
        if (current === end) {
            reconstructPath(current);
            isSolving = false;
            updateButtonStates();
            statusEl.textContent = 'Solved!';
            return;
        }

        // --- Draw progress ---
        if (current !== start) {
            highlightCell(current, '#d97706'); // amber-600 for visited
        }

        const neighbors = current.getValidMoveNeighbors(maze);
        for (const neighbor of neighbors) {
            if (!neighbor.visited) {
                neighbor.visited = true;
                neighbor.parent = current;

                if (algorithm === 'astar') {
                    neighbor.g = current.g + 1;
                    neighbor.h = heuristic(neighbor, end);
                    neighbor.f = neighbor.g + neighbor.h;
                }

                openSet.push(neighbor);
                if (neighbor !== end) {
                    highlightCell(neighbor, '#ca8a04'); // yellow-600 for open set
                }
            }
        }

        setTimeout(() => requestAnimationFrame(solveLoop), 101 - animationSpeed);
    };

    solveLoop();
}

function heuristic(a, b) {
    // Manhattan distance
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function reconstructPath(current) {
    let path = [];
    while (current) {
        path.push(current);
        current = current.parent;
    }
    path.reverse();

    let i = 0;
    const drawPathLoop = () => {
        if (i < path.length) {
            const cell = path[i];
            highlightCell(cell, '#16a34a', true); // green-600 for final path
            i++;
            requestAnimationFrame(drawPathLoop);
        }
    }
    drawPathLoop();
}

// --- Drawing & UI ---
function setupCanvas() {
    const container = canvas.parentElement;
    const size = Math.min(container.clientWidth, container.clientHeight, 600);
    canvas.width = size;
    canvas.height = size;
    cellSize = canvas.width / cols;
}

function drawMaze() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            maze[y][x].draw();
        }
    }
    // Draw start and end points
    highlightCell(maze[0][0], '#16a34a'); // green-600
    highlightCell(maze[rows - 1][cols - 1], '#dc2626'); // red-600
}

function highlightCell(cell, color, isPath = false) {
    const x = cell.x * cellSize;
    const y = cell.y * cellSize;
    ctx.fillStyle = color;
    if (isPath) {
        ctx.beginPath();
        ctx.arc(x + cellSize / 2, y + cellSize / 2, cellSize / 4, 0, 2 * Math.PI);
        ctx.fill();
    } else {
        ctx.fillRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
    }
}

function resetMazeState() {
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const cell = maze[y][x];
            cell.visited = false;
            cell.parent = null;
            cell.g = Infinity;
            cell.h = 0;
            cell.f = Infinity;
        }
    }
}

function updateButtonStates() {
    const busy = isGenerating || isSolving;
    generateBtn.disabled = busy;
    sizeSlider.disabled = busy;
    solverBtns.forEach(btn => btn.disabled = busy || !maze);
}

function stopAllAnimations() {
    isGenerating = false;
    isSolving = false;
    cancelAnimationFrame(animationFrameId);
    updateButtonStates();
}

// --- Event Listeners ---
window.addEventListener('resize', () => {
    if (maze) {
        setupCanvas();
        drawMaze();
    }
});

sizeSlider.addEventListener('input', (e) => {
    sizeValue.textContent = e.target.value;
    sizeValue2.textContent = e.target.value;
});

sizeSlider.addEventListener('change', () => {
    stopAllAnimations();
    generateMaze();
});

speedSlider.addEventListener('input', (e) => {
    animationSpeed = parseInt(e.target.value);
    speedValue.textContent = animationSpeed;
});

generateBtn.addEventListener('click', () => {
    stopAllAnimations();
    generateMaze();
});

solveBfsBtn.addEventListener('click', () => solve('bfs'));
solveDfsBtn.addEventListener('click', () => solve('dfs'));
solveAStarBtn.addEventListener('click', () => solve('astar'));

// --- Initial Setup ---
window.onload = () => {
    sizeValue.textContent = sizeSlider.value;
    sizeValue2.textContent = sizeSlider.value;
    speedValue.textContent = speedSlider.value;
    animationSpeed = parseInt(speedSlider.value);
    generateMaze();
};

