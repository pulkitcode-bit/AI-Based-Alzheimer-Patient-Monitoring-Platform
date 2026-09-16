package com.neuromind.neuromind_backend.Service;

import com.neuromind.neuromind_backend.Dto.GameSessionRequest;
import com.neuromind.neuromind_backend.Dto.GameSessionResponse;
import com.neuromind.neuromind_backend.model.Activity;
import com.neuromind.neuromind_backend.model.GameSession;
import com.neuromind.neuromind_backend.repo.ActivityRepository;
import com.neuromind.neuromind_backend.repo.GameSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Service
@RequiredArgsConstructor
public class GameSessionService {

    private final GameSessionRepository gameSessionRepository;
    private final ActivityRepository activityRepository;

    /**
     * Computes finalScore and persists a GameSession.
     *
     * Formula:
     *   speed = min(1, expectedTimeSec / timeTaken)
     *   finalScore = baseScore * (accuracy * accuracyWeight + speed * speedWeight + consistency * consistencyWeight)
     */
    public GameSessionResponse submitSession(GameSessionRequest request) {
        // 1. Look up the Activity (throws if not found)
        Activity activity = activityRepository.findById(request.getActivityId())
                .orElseThrow(() -> new ActivityNotFoundException(
                        "Activity not found: " + request.getActivityId()));

        // 2. Compute speed = min(1, expectedTimeSec / timeTaken)
        BigDecimal expectedTime = BigDecimal.valueOf(activity.getExpectedTimeSec());
        BigDecimal timeTaken = BigDecimal.valueOf(request.getTimeTaken());
        BigDecimal speedRaw = expectedTime.divide(timeTaken, 4, RoundingMode.HALF_UP);
        BigDecimal speed = speedRaw.min(BigDecimal.ONE);

        // 3. Compute finalScore = baseScore * (accuracy*accW + speed*spdW + consistency*conW)
        BigDecimal weightedSum = request.getAccuracy().multiply(activity.getAccuracyWeight())
                .add(speed.multiply(activity.getSpeedWeight()))
                .add(request.getConsistency().multiply(activity.getConsistencyWeight()));

        BigDecimal finalScore = BigDecimal.valueOf(activity.getBaseScore())
                .multiply(weightedSum)
                .setScale(2, RoundingMode.HALF_UP);

        // 4. Save the session
        GameSession session = GameSession.builder()
                .patientId(request.getPatientId())
                .activityId(request.getActivityId())
                .accuracy(request.getAccuracy())
                .consistency(request.getConsistency())
                .timeTaken(request.getTimeTaken())
                .rawScore(request.getRawScore())
                .finalScore(finalScore)
                .build();

        GameSession saved = gameSessionRepository.save(session);

        // 5. Build response
        return GameSessionResponse.builder()
                .sessionId(saved.getId())
                .patientId(saved.getPatientId())
                .activityId(saved.getActivityId())
                .activityName(activity.getActivityName())
                .finalScore(saved.getFinalScore())
                .accuracy(saved.getAccuracy())
                .speed(speed.setScale(2, RoundingMode.HALF_UP))
                .consistency(saved.getConsistency())
                .timeTaken(saved.getTimeTaken())
                .rawScore(saved.getRawScore())
                .createdAt(saved.getCreatedAt())
                .build();
    }

    /** Custom exception for missing activities — handled by the controller. */
    public static class ActivityNotFoundException extends RuntimeException {
        public ActivityNotFoundException(String message) {
            super(message);
        }
    }
}
