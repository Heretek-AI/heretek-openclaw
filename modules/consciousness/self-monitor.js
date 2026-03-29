#!/usr/bin/env node
/**
 * Self-Monitoring Module
 * 
 * Implements self-monitoring capabilities for consciousness:
 * - Internal state observation
 * - Performance metrics tracking
 * - Anomaly detection in behavior
 * - Self-evaluation mechanisms
 * - Calibration monitoring
 * 
 * Based on research in meta-cognitive AI and introspection mechanisms.
 */

const fs = require('fs');
const path = require('path');

class SelfMonitor {
  constructor(config) {
    this.config = Object.assign({
      monitoringIntervalMs: 5000,
      anomalyThreshold: 2.0,
      historySize: 100,
      calibrationWindowSize: 50,
      statePath: './state/self-monitor-state.json'
    }, config || {});
    
    // Internal state observation
    this.internalState = {
      cognitiveLoad: 0,
      attentionLevel: 0,
      processingSpeed: 1.0,
      memoryUtilization: 0,
      errorRate: 0,
      lastUpdate: Date.now()
    };
    
    // Performance metrics
    this.performanceMetrics = {
      taskSuccessRate: 0,
      averageResponseTime: 0,
      goalAchievementRate: 0,
      learningProgress: 0,
      adaptationRate: 0
    };
    
    // Behavioral baseline for anomaly detection
    this.behavioralBaseline = {
      meanResponseTime: 0,
      stdResponseTime: 0,
      meanSuccessRate: 0,
      stdSuccessRate: 0,
      typicalPatterns: [],
      established: false
    };
    
    // Anomaly tracking
    this.anomalies = [];
    this.anomalyCount = 0;
    
    // Self-evaluation scores
    self.evaluationScores = {
      overallPerformance: 0,
      confidenceCalibration: 0,
      goalAlignment: 0,
      resourceEfficiency: 0,
      adaptability: 0
    };
    
    // History buffers
    this.stateHistory = [];
    this.metricHistory = [];
    this.calibrationHistory = [];
    
    // Monitoring state
    this.isMonitoring = false;
    this.monitorInterval = null;
    
    // Callbacks for meta-cognitive feedback
    this.onAnomalyDetected = null;
    this.onStateChange = null;
    this.onCalibrationDrift = null;
    
    // Load persisted state
    this.loadState();
  }
  
  /**
   * Start self-monitoring
   */
  start() {
    var self = this;
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.monitorInterval = setInterval(function() {
      self.performMonitoring();
    }, this.config.monitoringIntervalMs);
    
    console.log('[SelfMonitor] Started self-monitoring');
  }
  
  /**
   * Stop self-monitoring
   */
  stop() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    this.isMonitoring = false;
    this.saveState();
    console.log('[SelfMonitor] Stopped self-monitoring');
  }
  
  /**
   * Perform monitoring cycle
   */
  performMonitoring() {
    var timestamp = Date.now();
    
    // Update internal state observation
    this.observeInternalState();
    
    // Update performance metrics
    this.updatePerformanceMetrics();
    
    // Check for anomalies
    this.detectAnomalies();
    
    // Perform self-evaluation
    this.performSelfEvaluation();
    
    // Check calibration
    this.checkCalibration();
    
    // Record history
    this.recordHistory(timestamp);
    
    // Save state periodically
    this.saveState();
    
    // Notify state change
    if (this.onStateChange) {
      this.onStateChange(this.getMonitoringReport());
    }
  }
  
  /**
   * Observe internal state
   */
  observeInternalState() {
    var now = Date.now();
    var elapsed = now - this.internalState.lastUpdate;
    
    // Update cognitive load based on pending tasks
    this.internalState.cognitiveLoad = this.calculateCognitiveLoad();
    
    // Update attention level
    this.internalState.attentionLevel = this.calculateAttentionLevel();
    
    // Update processing speed (based on recent performance)
    this.internalState.processingSpeed = this.calculateProcessingSpeed();
    
    // Update memory utilization
    this.internalState.memoryUtilization = this.calculateMemoryUtilization();
    
    // Update error rate
    this.internalState.errorRate = this.calculateErrorRate();
    
    this.internalState.lastUpdate = now;
  }
  
  /**
   * Calculate cognitive load (0-1 scale)
   */
  calculateCognitiveLoad() {
    // Estimate based on concurrent processes and complexity
    var load = 0;
    
    // Factor in state history size
    load += Math.min(this.stateHistory.length / this.config.historySize, 0.3);
    
    // Factor in anomaly count (indicates processing difficulty)
    load += Math.min(this.anomalyCount * 0.05, 0.3);
    
    // Factor in metric complexity
    var metricComplexity = Object.keys(this.performanceMetrics).length * 0.02;
    load += Math.min(metricComplexity, 0.4);
    
    return Math.min(load, 1.0);
  }
  
  /**
   * Calculate attention level (0-1 scale)
   */
  calculateAttentionLevel() {
    // Higher attention when anomalies detected or performance drops
    var attention = 0.5; // Base attention
    
    // Increase attention if anomalies present
    if (this.anomalies.length > 0) {
      attention += 0.2;
    }
    
    // Increase attention if performance below baseline
    if (this.behavioralBaseline.established) {
      if (this.performanceMetrics.taskSuccessRate < this.behavioralBaseline.meanSuccessRate) {
        attention += 0.2;
      }
    }
    
    // Decrease attention if cognitive load is very high (overwhelmed)
    if (this.internalState.cognitiveLoad > 0.8) {
      attention -= 0.2;
    }
    
    return Math.max(0, Math.min(attention, 1.0));
  }
  
  /**
   * Calculate processing speed relative to baseline
   */
  calculateProcessingSpeed() {
    if (!this.behavioralBaseline.established) {
      return 1.0;
    }
    
    var currentSpeed = this.performanceMetrics.averageResponseTime;
    var baselineSpeed = this.behavioralBaseline.meanResponseTime;
    
    if (baselineSpeed === 0) return 1.0;
    
    // Ratio of baseline to current (higher is better)
    var ratio = baselineSpeed / Math.max(currentSpeed, 1);
    return Math.max(0.1, Math.min(ratio, 2.0));
  }
  
  /**
   * Calculate memory utilization (0-1 scale)
   */
  calculateMemoryUtilization() {
    // Estimate based on history buffer usage
    var historyUsage = this.stateHistory.length / this.config.historySize;
    var metricUsage = this.metricHistory.length / this.config.historySize;
    var calibrationUsage = this.calibrationHistory.length / this.config.calibrationWindowSize;
    
    return (historyUsage + metricUsage + calibrationUsage) / 3;
  }
  
  /**
   * Calculate error rate (0-1 scale)
   */
  calculateErrorRate() {
    var successRate = this.performanceMetrics.taskSuccessRate;
    return 1.0 - successRate;
  }
  
  /**
   * Update performance metrics
   */
  updatePerformanceMetrics() {
    // These would typically be updated by external calls
    // Here we compute derived metrics
    
    // Calculate learning progress from metric improvements
    if (this.metricHistory.length >= 2) {
      var recent = this.metricHistory[this.metricHistory.length - 1];
      var previous = this.metricHistory[this.metricHistory.length - 2];
      
      var improvement = 0;
      if (previous.taskSuccessRate > 0) {
        improvement = (recent.taskSuccessRate - previous.taskSuccessRate) / previous.taskSuccessRate;
      }
      
      this.performanceMetrics.learningProgress = Math.max(0, 
        this.performanceMetrics.learningProgress + improvement * 0.1
      );
    }
  }
  
  /**
   * Detect anomalies in behavior
   */
  detectAnomalies() {
    if (!this.behavioralBaseline.established) {
      // Need more data to establish baseline
      if (this.metricHistory.length >= 10) {
        this.establishBaseline();
      }
      return;
    }
    
    var anomaly = null;
    
    // Check response time anomaly
    var responseTimeZ = this.calculateZScore(
      this.performanceMetrics.averageResponseTime,
      this.behavioralBaseline.meanResponseTime,
      this.behavioralBaseline.stdResponseTime
    );
    
    if (Math.abs(responseTimeZ) > this.config.anomalyThreshold) {
      anomaly = {
        type: 'response_time',
        value: this.performanceMetrics.averageResponseTime,
        zScore: responseTimeZ,
        timestamp: Date.now(),
        severity: Math.abs(responseTimeZ) / this.config.anomalyThreshold
      };
    }
    
    // Check success rate anomaly
    var successRateZ = this.calculateZScore(
      this.performanceMetrics.taskSuccessRate,
      this.behavioralBaseline.meanSuccessRate,
      this.behavioralBaseline.stdSuccessRate
    );
    
    if (Math.abs(successRateZ) > this.config.anomalyThreshold) {
      anomaly = {
        type: 'success_rate',
        value: this.performanceMetrics.taskSuccessRate,
        zScore: successRateZ,
        timestamp: Date.now(),
        severity: Math.abs(successRateZ) / this.config.anomalyThreshold
      };
    }
    
    // Check cognitive load anomaly
    if (this.internalState.cognitiveLoad > 0.9) {
      anomaly = {
        type: 'cognitive_overload',
        value: this.internalState.cognitiveLoad,
        threshold: 0.9,
        timestamp: Date.now(),
        severity: this.internalState.cognitiveLoad
      };
    }
    
    if (anomaly) {
      this.anomalies.push(anomaly);
      this.anomalyCount++;
      
      // Keep anomaly list bounded
      if (this.anomalies.length > 50) {
        this.anomalies.shift();
      }
      
      // Notify callback
      if (this.onAnomalyDetected) {
        this.onAnomalyDetected(anomaly);
      }
    }
  }
  
  /**
   * Calculate Z-score for anomaly detection
   */
  calculateZScore(value, mean, std) {
    if (std === 0) return 0;
    return (value - mean) / std;
  }
  
  /**
   * Establish behavioral baseline from history
   */
  establishBaseline() {
    if (this.metricHistory.length < 10) return;
    
    var responseTimes = this.metricHistory.map(function(m) { return m.averageResponseTime; });
    var successRates = this.metricHistory.map(function(m) { return m.taskSuccessRate; });
    
    this.behavioralBaseline.meanResponseTime = this.mean(responseTimes);
    this.behavioralBaseline.stdResponseTime = this.stdDev(responseTimes);
    this.behavioralBaseline.meanSuccessRate = this.mean(successRates);
    this.behavioralBaseline.stdSuccessRate = this.stdDev(successRates);
    this.behavioralBaseline.established = true;
    
    console.log('[SelfMonitor] Behavioral baseline established');
  }
  
  /**
   * Calculate mean of array
   */
  mean(arr) {
    if (arr.length === 0) return 0;
    var sum = arr.reduce(function(a, b) { return a + b; }, 0);
    return sum / arr.length;
  }
  
  /**
   * Calculate standard deviation of array
   */
  stdDev(arr) {
    if (arr.length < 2) return 0;
    var avg = this.mean(arr);
    var squareDiffs = arr.map(function(value) {
      var diff = value - avg;
      return diff * diff;
    });
    var avgSquareDiff = this.mean(squareDiffs);
    return Math.sqrt(avgSquareDiff);
  }
  
  /**
   * Perform self-evaluation
   */
  performSelfEvaluation() {
    // Overall performance score
    this.evaluationScores.overallPerformance = this.calculateOverallPerformance();
    
    // Confidence calibration score
    this.evaluationScores.confidenceCalibration = this.calculateConfidenceCalibration();
    
    // Goal alignment score
    this.evaluationScores.goalAlignment = this.calculateGoalAlignment();
    
    // Resource efficiency score
    this.evaluationScores.resourceEfficiency = this.calculateResourceEfficiency();
    
    // Adaptability score
    this.evaluationScores.adaptability = this.calculateAdaptability();
  }
  
  /**
   * Calculate overall performance score
   */
  calculateOverallPerformance() {
    var successWeight = 0.4;
    var speedWeight = 0.3;
    var goalWeight = 0.3;
    
    var score = (
      successWeight * this.performanceMetrics.taskSuccessRate +
      speedWeight * Math.min(this.internalState.processingSpeed, 1.0) +
      goalWeight * this.performanceMetrics.goalAchievementRate
    );
    
    return Math.max(0, Math.min(score, 1.0));
  }
  
  /**
   * Calculate confidence calibration score
   */
  calculateConfidenceCalibration() {
    if (this.calibrationHistory.length < 5) return 0.5;
    
    // Calculate Expected Calibration Error (ECE)
    var recentCalibration = this.calibrationHistory.slice(-10);
    var ece = this.mean(recentCalibration.map(function(c) { 
      return Math.abs(c.confidence - c.accuracy); 
    }));
    
    // Convert to score (lower ECE = higher score)
    return Math.max(0, 1.0 - ece);
  }
  
  /**
   * Calculate goal alignment score
   */
  calculateGoalAlignment() {
    return this.performanceMetrics.goalAchievementRate;
  }
  
  /**
   * Calculate resource efficiency score
   */
  calculateResourceEfficiency() {
    var memoryEfficiency = 1.0 - this.internalState.memoryUtilization;
    var processingEfficiency = this.internalState.processingSpeed;
    var lowErrorBonus = 1.0 - this.internalState.errorRate;
    
    return (memoryEfficiency + processingEfficiency + lowErrorBonus) / 3;
  }
  
  /**
   * Calculate adaptability score
   */
  calculateAdaptability() {
    // Based on learning progress and adaptation rate
    return (this.performanceMetrics.learningProgress + this.performanceMetrics.adaptationRate) / 2;
  }
  
  /**
   * Check calibration drift
   */
  checkCalibration() {
    if (this.calibrationHistory.length < this.config.calibrationWindowSize) return;
    
    var recentECE = this.calculateRecentECE();
    var historicalECE = this.calculateHistoricalECE();
    
    // Detect calibration drift
    var drift = Math.abs(recentECE - historicalECE);
    
    if (drift > 0.2 && this.onCalibrationDrift) {
      this.onCalibrationDrift({
        recentECE: recentECE,
        historicalECE: historicalECE,
        drift: drift,
        timestamp: Date.now()
      });
    }
  }
  
  /**
   * Calculate recent Expected Calibration Error
   */
  calculateRecentECE() {
    var recent = this.calibrationHistory.slice(-10);
    return this.mean(recent.map(function(c) { 
      return Math.abs(c.confidence - c.accuracy); 
    }));
  }
  
  /**
   * Calculate historical Expected Calibration Error
   */
  calculateHistoricalECE() {
    return this.mean(this.calibrationHistory.map(function(c) { 
      return Math.abs(c.confidence - c.accuracy); 
    }));
  }
  
  /**
   * Record history
   */
  recordHistory(timestamp) {
    // Record state snapshot
    this.stateHistory.push({
      timestamp: timestamp,
      state: Object.assign({}, this.internalState)
    });
    
    // Record metrics snapshot
    this.metricHistory.push({
      timestamp: timestamp,
      taskSuccessRate: this.performanceMetrics.taskSuccessRate,
      averageResponseTime: this.performanceMetrics.averageResponseTime,
      goalAchievementRate: this.performanceMetrics.goalAchievementRate
    });
    
    // Trim histories to configured size
    while (this.stateHistory.length > this.config.historySize) {
      this.stateHistory.shift();
    }
    while (this.metricHistory.length > this.config.historySize) {
      this.metricHistory.shift();
    }
  }
  
  /**
   * Record calibration point
   */
  recordCalibration(confidence, accuracy) {
    this.calibrationHistory.push({
      timestamp: Date.now(),
      confidence: confidence,
      accuracy: accuracy
    });
    
    while (this.calibrationHistory.length > this.config.calibrationWindowSize) {
      this.calibrationHistory.shift();
    }
  }
  
  /**
   * Update performance metric (external interface)
   */
  updateMetric(metricName, value) {
    if (this.performanceMetrics.hasOwnProperty(metricName)) {
      this.performanceMetrics[metricName] = value;
    }
  }
  
  /**
   * Get monitoring report
   */
  getMonitoringReport() {
    return {
      timestamp: Date.now(),
      internalState: Object.assign({}, this.internalState),
      performanceMetrics: Object.assign({}, this.performanceMetrics),
      evaluationScores: Object.assign({}, this.evaluationScores),
      anomalyCount: this.anomalyCount,
      recentAnomalies: this.anomalies.slice(-5),
      baselineEstablished: this.behavioralBaseline.established,
      isMonitoring: this.isMonitoring
    };
  }
  
  /**
   * Get self-evaluation summary
   */
  getSelfEvaluation() {
    return {
      timestamp: Date.now(),
      scores: Object.assign({}, this.evaluationScores),
      overallScore: this.mean(Object.values(this.evaluationScores)),
      recommendations: this.generateRecommendations()
    };
  }
  
  /**
   * Generate recommendations based on self-evaluation
   */
  generateRecommendations() {
    var recommendations = [];
    
    if (this.evaluationScores.overallPerformance < 0.5) {
      recommendations.push({
        area: 'performance',
        priority: 'high',
        suggestion: 'Consider reducing task complexity or improving resource allocation'
      });
    }
    
    if (this.evaluationScores.confidenceCalibration < 0.7) {
      recommendations.push({
        area: 'calibration',
        priority: 'medium',
        suggestion: 'Confidence estimates may need recalibration'
      });
    }
    
    if (this.internalState.cognitiveLoad > 0.8) {
      recommendations.push({
        area: 'cognitive_load',
        priority: 'high',
        suggestion: 'Cognitive overload detected - consider task prioritization'
      });
    }
    
    if (this.anomalyCount > 5) {
      recommendations.push({
        area: 'anomalies',
        priority: 'medium',
        suggestion: 'Multiple anomalies detected - review behavioral patterns'
      });
    }
    
    return recommendations;
  }
  
  /**
   * Save state to disk
   */
  saveState() {
    var state = {
      internalState: this.internalState,
      performanceMetrics: this.performanceMetrics,
      behavioralBaseline: this.behavioralBaseline,
      evaluationScores: this.evaluationScores,
      anomalyCount: this.anomalyCount,
      lastSave: Date.now()
    };
    
    try {
      var dir = path.dirname(this.config.statePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.config.statePath, JSON.stringify(state, null, 2));
    } catch (e) {
      console.error('[SelfMonitor] Failed to save state:', e.message);
    }
  }
  
  /**
   * Load state from disk
   */
  loadState() {
    try {
      if (fs.existsSync(this.config.statePath)) {
        var data = fs.readFileSync(this.config.statePath, 'utf8');
        var state = JSON.parse(data);
        
        this.internalState = state.internalState || this.internalState;
        this.performanceMetrics = state.performanceMetrics || this.performanceMetrics;
        this.behavioralBaseline = state.behavioralBaseline || this.behavioralBaseline;
        this.evaluationScores = state.evaluationScores || this.evaluationScores;
        this.anomalyCount = state.anomalyCount || 0;
        
        console.log('[SelfMonitor] Loaded state from', this.config.statePath);
      }
    } catch (e) {
      console.error('[SelfMonitor] Failed to load state:', e.message);
    }
  }
}

module.exports = SelfMonitor;
