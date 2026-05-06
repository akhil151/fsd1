import { Types } from "mongoose";
import StudentPerformance from "./models/StudentPerformance";
import MatchResult from "./models/MatchResult";
import Quiz, { IQuestion } from "./models/Quiz";

/**
 * INTELLIGENCE BACKGROUND WORKER
 * Decouples heavy analytics from realtime gameplay.
 */

interface IntelligenceJob {
    userId: string;
    quizId: string;
    responses: any[];
    questions: IQuestion[];
    score: number;
}

const DIFFICULTY_MULTIPLIERS = {
    easy: 0.8,
    beginner: 0.8,
    medium: 1.0,
    intermediate: 1.0,
    hard: 1.3,
    advanced: 1.3,
    expert: 1.5,
};

export async function processIntelligence(job: IntelligenceJob) {
    const { userId, quizId, responses, questions, score } = job;
    
    try {
        const playerAccuracy = (responses.filter(r => r.isCorrect).length / questions.length) * 100;
        const playerAvgTime = responses.reduce((sum, r) => sum + r.responseTimeMs, 0) / responses.length;

        let perf = await StudentPerformance.findOne({ userId });
        if (!perf) {
            perf = new StudentPerformance({ userId });
        }

        // 1. DYNAMIC CONTEXTUAL INTELLIGENCE
        // Update topic mastery with difficulty weighting and confidence
        responses.forEach((resp, idx) => {
            const q = questions[idx];
            if (!q || !q.topic) return;

            let topic = perf!.topicMastery.find(t => t.topic === q.topic);
            if (!topic) {
                topic = { 
                    topic: q.topic, 
                    accuracy: 0, 
                    avgResponseTimeMs: 0, 
                    totalAttempts: 0, 
                    lastAttemptAt: new Date(),
                    confidenceScore: 0,
                    difficultyWeightedMastery: 0
                };
                perf!.topicMastery.push(topic);
            }

            const diffMult = DIFFICULTY_MULTIPLIERS[q.difficulty] || 1.0;
            topic.totalAttempts += 1;
            
            // Accuracy is weighted by difficulty
            const correctWeight = resp.isCorrect ? 100 * diffMult : 0;
            topic.accuracy = (topic.accuracy * (topic.totalAttempts - 1) + (resp.isCorrect ? 100 : 0)) / topic.totalAttempts;
            topic.difficultyWeightedMastery = (topic.difficultyWeightedMastery * (topic.totalAttempts - 1) + correctWeight) / topic.totalAttempts;
            
            topic.avgResponseTimeMs = (topic.avgResponseTimeMs * (topic.totalAttempts - 1) + resp.responseTimeMs) / topic.totalAttempts;
            topic.lastAttemptAt = new Date();

            // Confidence Score: Grows with sample size, stabilizes after 15 questions per topic
            topic.confidenceScore = Math.min(1.0, topic.totalAttempts / 15);
        });

        // 2. BEHAVIORAL PATTERN DETECTION (Context-Aware)
        const rushingFreq = responses.filter(r => r.responseTimeMs < 2000).length / responses.length;
        const hesitationFreq = responses.filter(r => r.hesitationDetected).length / responses.length;

        // Consistency calculation: Standard deviation of accuracy or response time (simplified)
        const avgSpeed = playerAvgTime;
        const consistencyScore = responses.filter(r => Math.abs(r.responseTimeMs - avgSpeed) < 2000).length / responses.length;

        const patterns = [
            { 
                type: "rushing", 
                freq: rushingFreq, 
                desc: rushingFreq > 0.4 ? "Student frequently rushes through content." : "Healthy response speed.",
                conf: rushingFreq > 0.6 ? "high" : "medium"
            },
            { 
                type: "hesitation", 
                freq: hesitationFreq, 
                desc: hesitationFreq > 0.4 ? "High hesitation detected on difficult topics." : "Good confidence profile.",
                conf: hesitationFreq > 0.6 ? "high" : "medium"
            },
            {
                type: "consistency",
                freq: consistencyScore,
                desc: consistencyScore > 0.7 ? "Highly consistent behavior." : "Erratic performance patterns.",
                conf: "medium"
            }
        ];

        patterns.forEach(p => {
            let pattern = perf!.behavioralPatterns.find(bp => bp.patternType === p.type);
            if (!pattern) {
                pattern = { patternType: p.type as any, frequency: p.freq, description: p.desc, confidence: p.conf as any };
                perf!.behavioralPatterns.push(pattern);
            } else {
                pattern.frequency = (pattern.frequency * 0.7) + (p.freq * 0.3);
                pattern.description = p.desc;
                pattern.confidence = p.conf as any;
            }
        });

        // 3. RETENTION & FORGETTING ANALYSIS
        perf.topicMastery.forEach(tm => {
            let retention = perf!.retentionMetrics.find(r => r.topic === tm.topic);
            if (!retention) {
                retention = { topic: tm.topic, retentionStrength: 1.0, lastReinforcedAt: new Date() };
                perf!.retentionMetrics.push(retention);
            }
            
            // Simple linear decay for demo (0.05 per day since last reinforcement)
            const daysSince = (Date.now() - retention.lastReinforcedAt.getTime()) / (1000 * 60 * 60 * 24);
            retention.retentionStrength = Math.max(0, 1.0 - (daysSince * 0.05));
            
            // If just played this topic, reinforce it
            if (responses.some((r, i) => questions[i].topic === tm.topic)) {
                retention.retentionStrength = Math.min(1.0, retention.retentionStrength + 0.2);
                retention.lastReinforcedAt = new Date();
            }
        });

        // 4. ACTIONABLE RECOMMENDATION ENGINE (Confidence-Backed)
        perf.recommendations = [];
        
        // High Risk / Urgent Intervention
        if (playerAccuracy < 40) {
            perf.recommendations.push({
                text: "Schedule 1-on-1 intervention for this topic.",
                priority: "high",
                reason: "Performance fell below 40% threshold in recent session.",
                confidence: 0.9
            });
            perf.riskLevel = "high";
        } else if (playerAccuracy < 60) {
            perf.riskLevel = "medium";
        } else {
            perf.riskLevel = "low";
        }

        // Behavior-based
        if (rushingFreq > 0.5) {
            perf.recommendations.push({
                text: "Encourage 'Stop & Think' strategies.",
                priority: "medium",
                reason: "Student is answering 50%+ of questions in under 2 seconds.",
                confidence: rushingFreq
            });
        }

        // Mastery-based
        const weakTopic = perf.topicMastery.sort((a, b) => a.difficultyWeightedMastery - b.difficultyWeightedMastery)[0];
        if (weakTopic && weakTopic.difficultyWeightedMastery < 50) {
            perf.recommendations.push({
                text: `Assign remedial practice for ${weakTopic.topic}.`,
                priority: "medium",
                reason: `Weighted mastery in ${weakTopic.topic} is currently ${Math.round(weakTopic.difficultyWeightedMastery)}%.`,
                confidence: weakTopic.confidenceScore
            });
        }

        // Global metrics update
        perf.totalQuizzesPlayed += 1;
        perf.globalAccuracy = (perf.globalAccuracy * (perf.totalQuizzesPlayed - 1) + playerAccuracy) / perf.totalQuizzesPlayed;
        perf.globalAvgResponseTimeMs = (perf.globalAvgResponseTimeMs * (perf.totalQuizzesPlayed - 1) + playerAvgTime) / perf.totalQuizzesPlayed;

        perf.quizHistory.push({
            quizId: new Types.ObjectId(quizId),
            accuracy: playerAccuracy,
            score: score,
            avgResponseTimeMs: playerAvgTime,
            date: new Date()
        });

        if (perf.quizHistory.length > 20) perf.quizHistory.shift();

        await perf.save();
        console.log(`[Intelligence Worker] Successfully processed student ${userId}`);

    } catch (error) {
        console.error(`[Intelligence Worker] Error processing student ${userId}:`, error);
    }
}
