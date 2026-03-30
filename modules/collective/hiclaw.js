#!/usr/bin/env node
/**
 * HiClaw - Hierarchical Agent System
 * ===================================
 * 
 * Implements hierarchical agent orchestration inspired by win4r/HiClaw
 * Provides supervisor-worker patterns for complex task decomposition.
 * 
 * Key Features:
 * - Hierarchical task decomposition (supervisor → workers)
 * - Worker pool management with auto-scaling
 * - Task dependency tracking with blocking
 * - Inter-level communication and reporting
 * - Priority-based task scheduling
 * 
 * Architecture:
 * 
 *   ┌─────────────────────────────────────────────────────────────┐
 *   │                    SUPERVISOR (HiClaw)                     │
 *   │  - Task decomposition                                       │
 *   │  - Worker assignment                                         │
 *   │  - Result aggregation                                       │
 *   │  - Hierarchy management                                     │
 *   └─────────────────────────────────────────────────────────────┘
 *                              │
 *         ┌────────────────────┼────────────────────┐
 *         │                    │                    │
 *         ▼                    ▼                    ▼
 *   ┌───────────┐        ┌───────────┐        ┌───────────┐
 *   │  Worker 1 │        │  Worker 2 │        │  Worker 3 │
 *   │  (Task A) │        │  (Task B) │        │  (Task C) │
 *   └───────────┘        └───────────┘        └───────────┘
 * 
 * Usage:
 *   const HiClaw = require('./modules/collective/hiclaw.js');
 *   const supervisor = new HiClaw('main-supervisor');
 *   await supervisor.decompose(task, { maxWorkers: 5 });
 */

const fs = require('fs');
const path = require('path');

// Try to load Redis
let Redis;
try {
  Redis = require('ioredis');
} catch (e) {
  console.warn('[HiClaw] ioredis not available, using local mode');
}

// Configuration
const CONFIG = {
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  
  // Hierarchy settings
  hierarchy: {
    maxDepth: 5,              // Maximum hierarchy depth
    maxWorkersPerSupervisor: 10,
    workerTimeout: 600000,    // 10 minutes
    idleWorkerTimeout: 300000, // 5 minutes
    autoScaleUp: true,
    autoScaleDown: true,
    scaleUpThreshold: 0.8,     // 80% capacity triggers scale up
    scaleDownThreshold: 0.3    // 30% capacity triggers scale down
  },
  
  // Task settings
  task: {
    maxRetries: 3,
    retryDelay: 5000,         // 5 seconds
    priorityLevels: ['critical', 'high', 'normal', 'low'],
    defaultPriority: 'normal'
  },
  
  // Communication channels
  channels: {
    supervisorTasks: 'hiclaw:supervisor:tasks',
    workerTasks: 'hiclaw:worker:tasks',
    results: 'hiclaw:results',
    heartbeats: 'hiclaw:heartbeats',
    control: 'hiclaw:control'
  }
};

// Task status enum
const TaskStatus = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  BLOCKED: 'blocked',
  CANCELLED: 'cancelled'
};

// Worker status enum
const WorkerStatus = {
  IDLE: 'idle',
  BUSY: 'busy',
  BLOCKED: 'blocked',
  OFFLINE: 'offline'
};

/**
 * Task item representing a unit of work
 */
class Task {
  constructor(id, description, options = {}) {
    this.id = id;
    this.description = description;
    this.status = TaskStatus.PENDING;
    this.priority = options.priority || CONFIG.task.defaultPriority;
    this.dependencies = options.dependencies || [];
    this.assignedTo = null;
    this.result = null;
    this.error = null;
    this.retries = 0;
    this.createdAt = Date.now();
    this.startedAt = null;
    this.completedAt = null;
    this.metadata = options.metadata || {};
    this.depth = options.depth || 0;
    this.parentId = options.parentId || null;
    this.subtasks = [];
  }
  
  canExecute() {
    if (this.status !== TaskStatus.PENDING) return false;
    
    // Check dependencies
    for (const depId of this.dependencies) {
      const dep = TaskManager.get(depId);
      if (dep && dep.status !== TaskStatus.COMPLETED) {
        return false;
      }
    }
    
    return true;
  }
  
  markRunning() {
    this.status = TaskStatus.RUNNING;
    this.startedAt = Date.now();
  }
  
  markCompleted(result) {
    this.status = TaskStatus.COMPLETED;
    this.result = result;
    this.completedAt = Date.now();
  }
  
  markFailed(error) {
    this.status = TaskStatus.FAILED;
    this.error = error;
    this.completedAt = Date.now();
  }
  
  toJSON() {
    return {
      id: this.id,
      description: this.description,
      status: this.status,
      priority: this.priority,
      dependencies: this.dependencies,
      assignedTo: this.assignedTo,
      result: this.result,
      error: this.error,
      retries: this.retries,
      createdAt: this.createdAt,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      depth: this.depth,
      parentId: this.parentId,
      subtasks: this.subtasks
    };
  }
}

/**
 * Worker representing a subordinate agent
 */
class Worker {
  constructor(id, supervisor, options = {}) {
    this.id = id;
    this.supervisorId = supervisor;
    this.status = WorkerStatus.IDLE;
    this.currentTask = null;
    this.capabilities = options.capabilities || [];
    this.maxConcurrent = options.maxConcurrent || 1;
    this.busyCount = 0;
    this.totalProcessed = 0;
    this.failedTasks = 0;
    this.createdAt = Date.now();
    this.lastHeartbeat = Date.now();
    this.metadata = options.metadata || {};
  }
  
  isAvailable() {
    return this.status === WorkerStatus.IDLE && this.busyCount < this.maxConcurrent;
  }
  
  assign(task) {
    this.currentTask = task.id;
    this.busyCount++;
    this.status = WorkerStatus.BUSY;
    task.assignedTo = this.id;
    task.markRunning();
  }
  
  release(taskId) {
    this.currentTask = null;
    this.busyCount = Math.max(0, this.busyCount - 1);
    this.status = this.busyCount > 0 ? WorkerStatus.BUSY : WorkerStatus.IDLE;
    this.totalProcessed++;
  }
  
  recordFailure() {
    this.failedTasks++;
  }
  
  updateHeartbeat() {
    this.lastHeartbeat = Date.now();
  }
  
  isStale() {
    const idleTime = Date.now() - this.lastHeartbeat;
    return idleTime > CONFIG.hierarchy.idleWorkerTimeout && this.status === WorkerStatus.IDLE;
  }
  
  toJSON() {
    return {
      id: this.id,
      supervisorId: this.supervisorId,
      status: this.status,
      currentTask: this.currentTask,
      capabilities: this.capabilities,
      maxConcurrent: this.maxConcurrent,
      busyCount: this.busyCount,
      totalProcessed: this.totalProcessed,
      failedTasks: this.failedTasks,
      createdAt: this.createdAt,
      lastHeartbeat: this.lastHeartbeat
    };
  }
}

/**
 * Task Manager - manages all tasks
 */
class TaskManager {
  static tasks = new Map();
  
  static add(task) {
    this.tasks.set(task.id, task);
  }
  
  static get(id) {
    return this.tasks.get(id);
  }
  
  static getByStatus(status) {
    return Array.from(this.tasks.values()).filter(t => t.status === status);
  }
  
  static getByWorker(workerId) {
    return Array.from(this.tasks.values()).filter(t => t.assignedTo === workerId);
  }
  
  static remove(id) {
    this.tasks.delete(id);
  }
  
  static clear() {
    this.tasks.clear();
  }
  
  static getAll() {
    return Array.from(this.tasks.values());
  }
  
  static getStats() {
    const tasks = Array.from(this.tasks.values());
    return {
      total: tasks.length,
      pending: tasks.filter(t => t.status === TaskStatus.PENDING).length,
      running: tasks.filter(t => t.status === TaskStatus.RUNNING).length,
      completed: tasks.filter(t => t.status === TaskStatus.COMPLETED).length,
      failed: tasks.filter(t => t.status === TaskStatus.FAILED).length
    };
  }
}

/**
 * HiClaw - Hierarchical Agent System Supervisor
 */
class HiClaw {
  constructor(supervisorId, options = {}) {
    this.supervisorId = supervisorId;
    this.options = {
      ...CONFIG.hierarchy,
      ...options
    };
    
    this.redis = null;
    this.workers = new Map();
    this.tasks = new Map();
    this.subSupervisors = new Map();
    this.parentSupervisor = options.parentSupervisor || null;
    this.depth = options.depth || 0;
    this.initialized = false;
    this.isRunning = false;
  }
  
  /**
   * Initialize Redis connection and load state
   */
  async initialize() {
    if (this.initialized) return;
    
    if (Redis) {
      try {
        this.redis = new Redis(CONFIG.redisUrl, {
          retryStrategy: (times) => Math.min(times * 200, 2000)
        });
        await this.redis.ping();
        console.log(`[HiClaw:${this.supervisorId}] Redis connected`);
        
        // Subscribe to channels
        await this.subscribeChannels();
      } catch (e) {
        console.warn(`[HiClaw:${this.supervisorId}] Redis unavailable, using local mode`);
      }
    }
    
    this.initialized = true;
  }
  
  /**
   * Subscribe to HiClaw Redis channels
   */
  async subscribeChannels() {
    if (!this.redis) return;
    
    // Subscribe to worker responses and results
    const channels = [
      CONFIG.channels.results,
      `${CONFIG.channels.heartbeats}:${this.supervisorId}`
    ];
    
    await this.redis.subscribe(...channels);
    
    this.redis.on('message', (channel, message) => {
      this.handleMessage(channel, message);
    });
  }
  
  /**
   * Handle incoming messages
   */
  handleMessage(channel, message) {
    try {
      const data = JSON.parse(message);
      
      if (channel === CONFIG.channels.results) {
        this.handleResult(data);
      } else if (channel.startsWith(CONFIG.channels.heartbeats)) {
        this.handleHeartbeat(data);
      }
    } catch (e) {
      console.error(`[HiClaw:${this.supervisorId}] Failed to handle message:`, e);
    }
  }
  
  /**
   * Handle task result from worker
   */
  handleResult(data) {
    const task = TaskManager.get(data.taskId);
    if (!task) return;
    
    if (data.success) {
      task.markCompleted(data.result);
    } else {
      task.markFailed(data.error);
    }
    
    // Release worker
    const worker = this.workers.get(task.assignedTo);
    if (worker) {
      worker.release(task.id);
      if (!data.success) {
        worker.recordFailure();
      }
    }
    
    // Notify parent if exists
    if (this.parentSupervisor) {
      this.parentSupervisor.handleChildResult(task.id, data);
    }
    
    // Check for blocked tasks that can now proceed
    this.unblockTasks();
  }
  
  /**
   * Handle worker heartbeat
   */
  handleHeartbeat(data) {
    const worker = this.workers.get(data.workerId);
    if (worker) {
      worker.updateHeartbeat();
    }
  }
  
  /**
   * Handle result from child supervisor
   */
  handleChildResult(taskId, data) {
    const task = TaskManager.get(taskId);
    if (task && data.success) {
      task.markCompleted(data.result);
    }
  }
  
  /**
   * Register a worker with this supervisor
   */
  registerWorker(workerId, capabilities = [], maxConcurrent = 1) {
    const worker = new Worker(workerId, this.supervisorId, {
      capabilities,
      maxConcurrent
    });
    this.workers.set(workerId, worker);
    console.log(`[HiClaw:${this.supervisorId}] Worker registered: ${workerId}`);
    return worker;
  }
  
  /**
   * Unregister a worker
   */
  unregisterWorker(workerId) {
    const worker = this.workers.get(workerId);
    if (worker) {
      // Cancel any running tasks
      const workerTasks = TaskManager.getByWorker(workerId);
      for (const task of workerTasks) {
        if (task.status === TaskStatus.RUNNING) {
          task.markFailed('Worker unregistered');
        }
      }
      
      this.workers.delete(workerId);
      console.log(`[HiClaw:${this.supervisorId}] Worker unregistered: ${workerId}`);
    }
  }
  
  /**
   * Submit a task for processing
   */
  async submitTask(description, options = {}) {
    await this.initialize();
    
    const taskId = options.id || `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const task = new Task(taskId, description, {
      ...options,
      depth: this.depth
    });
    
    TaskManager.add(task);
    this.tasks.set(taskId, task);
    
    console.log(`[HiClaw:${this.supervisorId}] Task submitted: ${taskId} (${task.priority})`);
    
    // Try to execute immediately if possible
    this.scheduleTask(task);
    
    return task;
  }
  
  /**
   * Decompose a complex task into subtasks
   */
  async decompose(taskDescription, options = {}) {
    await this.initialize();
    
    const maxDepth = options.maxDepth || this.options.maxDepth;
    const maxWorkers = options.maxWorkers || this.options.maxWorkersPerSupervisor;
    
    if (this.depth >= maxDepth) {
      // Max depth reached - submit as single task
      return this.submitTask(taskDescription, options);
    }
    
    // Create parent task
    const parentTaskId = `decomp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const parentTask = new Task(parentTaskId, taskDescription, {
      ...options,
      depth: this.depth
    });
    
    TaskManager.add(parentTask);
    this.tasks.set(parentTaskId, parentTask);
    
    // Decompose logic (placeholder - in production, use AI to decompose)
    const subtasks = this._generateSubtasks(taskDescription, maxWorkers);
    
    parentTask.subtasks = subtasks.map(st => st.id);
    
    // Submit subtasks
    const childSupervisor = new HiClaw(`${this.supervisorId}-child-${parentTaskId}`, {
      ...this.options,
      parentSupervisor: this,
      depth: this.depth + 1
    });
    
    for (const subtask of subtasks) {
      await childSupervisor.submitTask(subtask.description, {
        priority: subtask.priority,
        parentId: parentTaskId,
        depth: this.depth + 1
      });
    }
    
    // Monitor child supervisor
    this.subSupervisors.set(parentTaskId, childSupervisor);
    
    return parentTask;
  }
  
  /**
   * Generate subtasks from description (placeholder implementation)
   * In production, this would use AI/LLM to analyze and decompose
   */
  _generateSubtasks(description, maxWorkers) {
    // Simple decomposition based on keywords
    const subtasks = [];
    const parts = description.split(/[,;]| and | then /i).filter(p => p.trim());
    
    const numSubtasks = Math.min(parts.length || 1, maxWorkers);
    
    if (parts.length >= numSubtasks) {
      for (let i = 0; i < numSubtasks; i++) {
        subtasks.push({
          id: `sub_${Date.now()}_${i}`,
          description: parts[i].trim(),
          priority: 'normal'
        });
      }
    } else {
      // Single task
      subtasks.push({
        id: `sub_${Date.now()}_0`,
        description: description,
        priority: 'normal'
      });
    }
    
    return subtasks;
  }
  
  /**
   * Schedule tasks to available workers
   */
  async scheduleTask(task) {
    if (!task.canExecute()) {
      if (task.dependencies.length > 0) {
        task.status = TaskStatus.BLOCKED;
        console.log(`[HiClaw:${this.supervisorId}] Task blocked: ${task.id}`);
      }
      return false;
    }
    
    // Find available worker
    const worker = this.findAvailableWorker();
    if (!worker) {
      console.log(`[HiClaw:${this.supervisorId}] No available worker for: ${task.id}`);
      return false;
    }
    
    // Assign task
    worker.assign(task);
    
    // Send to worker
    await this.dispatchToWorker(worker, task);
    
    return true;
  }
  
  /**
   * Find an available worker
   */
  findAvailableWorker() {
    for (const [id, worker] of this.workers) {
      if (worker.isAvailable()) {
        return worker;
      }
    }
    return null;
  }
  
  /**
   * Dispatch task to worker via Redis
   */
  async dispatchToWorker(worker, task) {
    const message = {
      type: 'task',
      taskId: task.id,
      supervisorId: this.supervisorId,
      description: task.description,
      metadata: task.metadata,
      timeout: this.options.workerTimeout
    };
    
    if (this.redis) {
      await this.redis.publish(`${CONFIG.channels.workerTasks}:${worker.id}`, JSON.stringify(message));
    }
    
    console.log(`[HiClaw:${this.supervisorId}] Task dispatched to ${worker.id}: ${task.id}`);
  }
  
  /**
   * Unblock tasks whose dependencies are now complete
   */
  unblockTasks() {
    const blockedTasks = TaskManager.getByStatus(TaskStatus.BLOCKED);
    
    for (const task of blockedTasks) {
      if (task.canExecute()) {
        task.status = TaskStatus.PENDING;
        console.log(`[HiClaw:${this.supervisorId}] Task unblocked: ${task.id}`);
        this.scheduleTask(task);
      }
    }
  }
  
  /**
   * Start the supervisor loop
   */
  async start() {
    await this.initialize();
    
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log(`[HiClaw:${this.supervisorId}] Supervisor started`);
    
    // Main loop
    while (this.isRunning) {
      // Clean up stale workers
      this.cleanupStaleWorkers();
      
      // Schedule pending tasks
      const pendingTasks = TaskManager.getByStatus(TaskStatus.PENDING);
      for (const task of pendingTasks) {
        this.scheduleTask(task);
      }
      
      // Check child supervisors
      for (const [parentId, child] of this.subSupervisors) {
        const parentTask = TaskManager.get(parentId);
        if (parentTask && parentTask.status === TaskStatus.COMPLETED) {
          child.stop();
          this.subSupervisors.delete(parentId);
        }
      }
      
      // Auto-scale if enabled
      if (this.options.autoScaleUp || this.options.autoScaleUp) {
        this.evaluateScaling();
      }
      
      // Wait before next iteration
      await this.sleep(1000);
    }
  }
  
  /**
   * Stop the supervisor
   */
  async stop() {
    this.isRunning = false;
    
    // Stop child supervisors
    for (const child of this.subSupervisors.values()) {
      await child.stop();
    }
    
    // Cancel running tasks
    const runningTasks = TaskManager.getByStatus(TaskStatus.RUNNING);
    for (const task of runningTasks) {
      task.markFailed('Supervisor stopped');
    }
    
    console.log(`[HiClaw:${this.supervisorId}] Supervisor stopped`);
  }
  
  /**
   * Clean up stale workers
   */
  cleanupStaleWorkers() {
    for (const [id, worker] of this.workers) {
      if (worker.isStale()) {
        console.log(`[HiClaw:${this.supervisorId}] Worker stale, removing: ${id}`);
        this.unregisterWorker(id);
      }
    }
  }
  
  /**
   * Evaluate scaling needs
   */
  evaluateScaling() {
    if (this.workers.size === 0) return;
    
    const activeWorkers = Array.from(this.workers.values()).filter(w => w.status !== WorkerStatus.OFFLINE);
    const busyRatio = activeWorkers.filter(w => w.status === WorkerStatus.BUSY).length / activeWorkers.length;
    
    if (this.options.autoScaleUp && busyRatio >= this.options.scaleUpThreshold) {
      // Scale up - would trigger worker creation in production
      console.log(`[HiClaw:${this.supervisorId}] Scale up triggered (${(busyRatio * 100).toFixed(0)}% busy)`);
    }
    
    if (this.options.autoScaleDown && busyRatio <= this.options.scaleDownThreshold) {
      // Scale down - would trigger worker removal in production
      console.log(`[HiClaw:${this.supervisorId}] Scale down triggered (${(busyRatio * 100).toFixed(0)}% busy)`);
    }
  }
  
  /**
   * Get supervisor status
   */
  getStatus() {
    return {
      supervisorId: this.supervisorId,
      depth: this.depth,
      isRunning: this.isRunning,
      workers: {
        total: this.workers.size,
        available: Array.from(this.workers.values()).filter(w => w.isAvailable()).length,
        busy: Array.from(this.workers.values()).filter(w => w.status === WorkerStatus.BUSY).length
      },
      tasks: TaskManager.getStats(),
      childSupervisors: this.subSupervisors.size
    };
  }
  
  /**
   * Sleep helper
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export
module.exports = HiClaw;
module.exports.Task = Task;
module.exports.Worker = Worker;
module.exports.TaskManager = TaskManager;
module.exports.TaskStatus = TaskStatus;
module.exports.WorkerStatus = WorkerStatus;

// Allow running directly for testing
if (require.main === module) {
  const hiclaw = new HiClaw('test-supervisor');
  
  (async () => {
    await hiclaw.initialize();
    
    // Register workers
    hiclaw.registerWorker('worker-1', ['code', 'review'], 2);
    hiclaw.registerWorker('worker-2', ['research', 'analysis'], 1);
    
    // Submit tasks
    await hiclaw.submitTask('Analyze this data', { priority: 'high' });
    await hiclaw.submitTask('Generate report', { priority: 'normal' });
    
    // Get status
    console.log('Status:', hiclaw.getStatus());
    
    // Decompose complex task
    await hiclaw.decompose('Research, analyze, and report on AI trends', {
      maxWorkers: 3
    });
    
    console.log('Status after decompose:', hiclaw.getStatus());
    
    await hiclaw.stop();
    process.exit(0);
  })();
}