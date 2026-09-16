package com.neuromind.neuromind_backend.Config;

import com.neuromind.neuromind_backend.model.Activity;
import com.neuromind.neuromind_backend.repo.ActivityRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
@Slf4j
public class ActivityDataSeeder implements CommandLineRunner {

    private final ActivityRepository activityRepository;

    @Override
    @Transactional
    public void run(String... args) {
        // Second full replacement: the original 25 activities were scaled down
        // to 10 generic cognitive games (Word Recall, Object Naming, etc.).
        // Those are now replaced entirely by 10 activities modeled on
        // validated neuropsychological tests, for clinical credibility.
        //
        // Weight rationale (accuracy / speed / consistency) — not a uniform
        // 0.5/0.3/0.2 across the board, because these tests don't all measure
        // the same thing clinically:
        //   - Trail Making, Choice Reaction Time: primarily speed tests in
        //     real neuropsych practice (errors are rare once understood) →
        //     speed-weighted.
        //   - Stroop, Go/No-Go: the clinical signal IS the error (interference
        //     failures, false alarms), not how fast you go → accuracy-weighted,
        //     matching the original default.
        //   - Digit Span, Corsi Block: span-length tests — the score already
        //     *is* the accuracy (how far you got before failing), speed is
        //     almost irrelevant to the underlying construct → accuracy-heavy.
        //   - N-Back: sustained attention is fundamentally about not lapsing
        //     over time → consistency bumped above the other tests' 0.2.
        //   - Word Fluency: rate of valid output is the construct itself →
        //     accuracy and speed weighted evenly.
        List<Activity> targetActivities = List.of(
            activity("ACT-201", "Trail Making A", "Processing Speed", "Medium",
                    35, 60, "processing_speed", 65, "0.35", "0.45", "0.20"),
            activity("ACT-202", "Trail Making B", "Executive Function", "High",
                    45, 90, "task_switching", 75, "0.45", "0.35", "0.20"),
            activity("ACT-203", "Stroop Challenge", "Attention & Inhibition", "Medium",
                    35, 60, "inhibitory_control", 65, "0.50", "0.30", "0.20"),
            activity("ACT-204", "Go/No-Go Task", "Attention & Inhibition", "Medium",
                    35, 60, "response_inhibition", 65, "0.55", "0.25", "0.20"),
            activity("ACT-205", "Digit Span Forward", "Working Memory", "Medium",
                    35, 90, "working_memory", 65, "0.60", "0.20", "0.20"),
            activity("ACT-206", "Digit Span Backward", "Working Memory", "High",
                    45, 90, "working_memory", 75, "0.60", "0.20", "0.20"),
            activity("ACT-207", "Block Recall (Corsi)", "Visuospatial Memory", "High",
                    45, 90, "visuospatial_memory", 75, "0.60", "0.20", "0.20"),
            activity("ACT-208", "N-Back Focus", "Sustained Attention", "High",
                    45, 120, "sustained_attention", 70, "0.50", "0.20", "0.30"),
            activity("ACT-209", "Word Fluency", "Language", "Medium",
                    35, 60, "verbal_fluency", 60, "0.40", "0.40", "0.20"),
            activity("ACT-210", "Choice Reaction Time", "Processing Speed", "Medium",
                    35, 60, "processing_speed", 65, "0.35", "0.45", "0.20")
        );

        Set<String> allowedIds = targetActivities.stream()
                .map(Activity::getActivityId)
                .collect(Collectors.toSet());

        // Cleanup: remove any activity not in the allowed list. This only
        // touches the `activities` table — game_sessions.activity_id is a
        // plain string column with no foreign key to it, so historical
        // sessions referencing a retired activity are untouched and continue
        // to render via the existing "Activity (removed)" fallback.
        List<Activity> existingActivities = activityRepository.findAll();
        List<Activity> obsoleteActivities = existingActivities.stream()
                .filter(activity -> !allowedIds.contains(activity.getActivityId()))
                .collect(Collectors.toList());

        if (!obsoleteActivities.isEmpty()) {
            activityRepository.deleteAll(obsoleteActivities);
            log.info("Removed {} retired activities from the playable set.", obsoleteActivities.size());
        }

        activityRepository.saveAll(targetActivities);
        log.info("Reconciled activities table to the 10 neuropsychological-test activities.");
    }

    private Activity activity(String id, String name, String category, String difficulty,
                              int baseScore, int expectedTime, String targetSkill,
                              int successThreshold, String accWeight, String spdWeight, String conWeight) {
        return Activity.builder()
                .activityId(id)
                .activityName(name)
                .category(category)
                .difficultyLevel(difficulty)
                .baseScore(baseScore)
                .expectedTimeSec(expectedTime)
                .targetSkill(targetSkill)
                .successThreshold(successThreshold)
                .accuracyWeight(new BigDecimal(accWeight))
                .speedWeight(new BigDecimal(spdWeight))
                .consistencyWeight(new BigDecimal(conWeight))
                .build();
    }
}
