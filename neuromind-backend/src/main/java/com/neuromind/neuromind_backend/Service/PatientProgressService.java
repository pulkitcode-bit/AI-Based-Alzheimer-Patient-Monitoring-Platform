package com.neuromind.neuromind_backend.Service;

import com.neuromind.neuromind_backend.Dto.GameDistributionDto;
import com.neuromind.neuromind_backend.Dto.GameSessionDto;
import com.neuromind.neuromind_backend.Dto.PatientHistoryResponse;
import com.neuromind.neuromind_backend.Dto.PatientStatsResponse;
import com.neuromind.neuromind_backend.model.Activity;
import com.neuromind.neuromind_backend.model.GameScore;
import com.neuromind.neuromind_backend.model.GameSession;
import com.neuromind.neuromind_backend.repo.ActivityRepository;
import com.neuromind.neuromind_backend.repo.GameScoreRepository;
import com.neuromind.neuromind_backend.repo.GameSessionRepository;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PatientProgressService {

    private final GameScoreRepository gameScoreRepository;
    private final GameSessionRepository gameSessionRepository;
    private final ActivityRepository activityRepository;

    /**
     * The activities table uses "Sustained Attention" as N-Back's own
     * category (matching the master activity spec exactly), but domain-level
     * views — this service's getDomainScores, the recommendation engine, and
     * the progress page's domain chart — are built around 6 domains, not 7.
     * Sustained attention and inhibitory control are closely related
     * constructs, so it's folded into "Attention & Inhibition" here; the
     * activity's own `category` column elsewhere is untouched.
     */
    private static final Map<String, String> CATEGORY_TO_DOMAIN = Map.of(
            "Processing Speed", "Processing Speed",
            "Executive Function", "Executive Function",
            "Attention & Inhibition", "Attention & Inhibition",
            "Working Memory", "Working Memory",
            "Visuospatial Memory", "Visuospatial Memory",
            "Sustained Attention", "Attention & Inhibition",
            "Language", "Language"
    );

    @Data
    @AllArgsConstructor
    private static class UnifiedSession {
        private Long id;
        private String gameType;
        private Integer score;
        private Double rawScoreDouble;
        private Integer time;
        private LocalDateTime createdAt;
        /** Cognitive domain this session's activity belongs to; null for legacy
         *  GameScore rows (predate the domain concept) or an orphaned activityId. */
        private String domain;
    }

    private List<UnifiedSession> getUnifiedSessions(Long patientId) {
        Map<String, Activity> activityMap = activityRepository.findAll().stream()
                .collect(Collectors.toMap(
                        Activity::getActivityId,
                        a -> a,
                        (existing, replacement) -> existing
                ));

        List<GameScore> legacyScores = gameScoreRepository.findByPatientIdOrderByCreatedAtDesc(patientId);
        List<GameSession> newSessions = gameSessionRepository.findByPatientIdOrderByCreatedAtDesc(patientId);

        List<UnifiedSession> unifiedList = new ArrayList<>();

        if (legacyScores != null) {
            for (GameScore score : legacyScores) {
                int sc = score.getScore() != null ? score.getScore() : 0;
                int tm = score.getTime() != null ? score.getTime() : 0;
                unifiedList.add(new UnifiedSession(
                        // game_scores and game_sessions are separate tables,
                        // each with its own IDENTITY sequence starting at 1 —
                        // a legacy score and a new session can legitimately
                        // share the same raw id. Negating the legacy id keeps
                        // every merged UnifiedSession id unique (IDENTITY ids
                        // are always positive) without changing the field's
                        // type, since it's rendered as a React list key on
                        // the frontend and nothing looks a session up by it.
                        -score.getId(),
                        score.getGameType() != null ? score.getGameType() : "Unknown Game",
                        sc,
                        (double) sc,
                        tm,
                        score.getCreatedAt() != null ? score.getCreatedAt() : LocalDateTime.now(),
                        null
                ));
            }
        }

        if (newSessions != null) {
            for (GameSession session : newSessions) {
                String rawActivityId = session.getActivityId();
                Activity act = rawActivityId != null ? activityMap.get(rawActivityId) : null;
                String gameType = act != null ? act.getActivityName() : "Activity (removed)";
                String domain = act != null ? CATEGORY_TO_DOMAIN.getOrDefault(act.getCategory(), act.getCategory()) : null;
                double finalScoreDouble = session.getFinalScore() != null
                        ? session.getFinalScore().doubleValue()
                        : (session.getRawScore() != null ? session.getRawScore().doubleValue() : 0.0);
                int scoreInt = (int) Math.round(finalScoreDouble);
                int tm = session.getTimeTaken() != null ? session.getTimeTaken() : 0;

                unifiedList.add(new UnifiedSession(
                        session.getId(),
                        gameType,
                        scoreInt,
                        finalScoreDouble,
                        tm,
                        session.getCreatedAt() != null ? session.getCreatedAt() : LocalDateTime.now(),
                        domain
                ));
            }
        }

        unifiedList.sort(Comparator.comparing(UnifiedSession::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())));
        return unifiedList;
    }

    /**
     * Average score per cognitive domain for one patient, derived only from
     * sessions whose activity resolves to a known domain (legacy GameScore
     * rows and orphaned/retired activities are excluded — they predate or
     * fall outside the domain model entirely). Powers both the
     * recommendation engine (weakest-domain targeting) and the progress
     * page's domain chart.
     */
    public Map<String, Double> getDomainScores(Long patientId) {
        List<UnifiedSession> sessions = getUnifiedSessions(patientId);
        Map<String, List<Double>> byDomain = new LinkedHashMap<>();
        for (UnifiedSession s : sessions) {
            if (s.getDomain() == null) continue;
            byDomain.computeIfAbsent(s.getDomain(), k -> new ArrayList<>()).add(s.getRawScoreDouble());
        }

        Map<String, Double> result = new LinkedHashMap<>();
        for (Map.Entry<String, List<Double>> e : byDomain.entrySet()) {
            double avg = e.getValue().stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
            result.put(e.getKey(), Math.round(avg * 100.0) / 100.0);
        }
        return result;
    }

    /**
     * Batched equivalent of {@link #getUnifiedSessions(Long)} for a set of
     * patients — one query per table total instead of one per patient. The
     * doctor-facing endpoints below (chart data, decline alerts, inactivity)
     * all iterate every patient a doctor has, so the per-patient version
     * would mean N calls to activityRepository.findAll() and N separate
     * session queries for N patients; this does it in a fixed three queries
     * regardless of how many patients there are.
     */
    private Map<Long, List<UnifiedSession>> getUnifiedSessionsBatch(List<Long> patientIds) {
        Map<Long, List<UnifiedSession>> byPatient = new HashMap<>();
        if (patientIds == null || patientIds.isEmpty()) {
            return byPatient;
        }

        Map<String, Activity> activityMap = activityRepository.findAll().stream()
                .collect(Collectors.toMap(
                        Activity::getActivityId,
                        a -> a,
                        (existing, replacement) -> existing
                ));

        List<GameScore> legacyScores = gameScoreRepository.findByPatientIdIn(patientIds);
        List<GameSession> newSessions = gameSessionRepository.findByPatientIdIn(patientIds);

        if (legacyScores != null) {
            for (GameScore score : legacyScores) {
                int sc = score.getScore() != null ? score.getScore() : 0;
                int tm = score.getTime() != null ? score.getTime() : 0;
                UnifiedSession u = new UnifiedSession(
                        -score.getId(), // see getUnifiedSessions — keeps ids unique across the two source tables
                        score.getGameType() != null ? score.getGameType() : "Unknown Game",
                        sc,
                        (double) sc,
                        tm,
                        score.getCreatedAt() != null ? score.getCreatedAt() : LocalDateTime.now(),
                        null
                );
                byPatient.computeIfAbsent(score.getPatientId(), k -> new ArrayList<>()).add(u);
            }
        }

        if (newSessions != null) {
            for (GameSession session : newSessions) {
                String rawActivityId = session.getActivityId();
                Activity act = rawActivityId != null ? activityMap.get(rawActivityId) : null;
                String gameType = act != null ? act.getActivityName() : "Activity (removed)";
                String domain = act != null ? CATEGORY_TO_DOMAIN.getOrDefault(act.getCategory(), act.getCategory()) : null;
                double finalScoreDouble = session.getFinalScore() != null
                        ? session.getFinalScore().doubleValue()
                        : (session.getRawScore() != null ? session.getRawScore().doubleValue() : 0.0);
                int scoreInt = (int) Math.round(finalScoreDouble);
                int tm = session.getTimeTaken() != null ? session.getTimeTaken() : 0;
                UnifiedSession u = new UnifiedSession(
                        session.getId(),
                        gameType,
                        scoreInt,
                        finalScoreDouble,
                        tm,
                        session.getCreatedAt() != null ? session.getCreatedAt() : LocalDateTime.now(),
                        domain
                );
                byPatient.computeIfAbsent(session.getPatientId(), k -> new ArrayList<>()).add(u);
            }
        }

        for (List<UnifiedSession> sessions : byPatient.values()) {
            sessions.sort(Comparator.comparing(UnifiedSession::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())));
        }
        return byPatient;
    }

    public PatientHistoryResponse getPatientHistory(Long patientId) {
        List<UnifiedSession> allUnified = getUnifiedSessions(patientId);

        // 1. recentSessions
        List<GameSessionDto> recentSessions = allUnified.stream()
                .map(u -> GameSessionDto.builder()
                        .id(u.getId())
                        .gameType(u.getGameType())
                        .score(u.getScore())
                        .time(u.getTime())
                        .date(u.getCreatedAt())
                        .build())
                .collect(Collectors.toList());

        // 2. gameDistribution
        Map<String, Long> distributionMap = allUnified.stream()
                .collect(Collectors.groupingBy(UnifiedSession::getGameType, Collectors.counting()));

        List<GameDistributionDto> gameDistribution = distributionMap.entrySet().stream()
                .map(entry -> GameDistributionDto.builder()
                        .game(entry.getKey())
                        .sessions(entry.getValue())
                        .build())
                .collect(Collectors.toList());

        // 3. scoreHistory (Group by Date YYYY-MM-DD)
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        Map<String, Map<String, Double>> groupedScores = allUnified.stream()
                .collect(Collectors.groupingBy(
                        u -> u.getCreatedAt().format(formatter),
                        Collectors.groupingBy(
                                UnifiedSession::getGameType,
                                Collectors.averagingInt(UnifiedSession::getScore)
                        )
                ));

        List<Map<String, Object>> scoreHistory = new ArrayList<>();
        List<String> sortedDates = new ArrayList<>(groupedScores.keySet());
        Collections.sort(sortedDates);

        for (String date : sortedDates) {
            Map<String, Double> gameAverages = groupedScores.get(date);
            Map<String, Object> historyEntry = new HashMap<>();
            historyEntry.put("date", date);
            for (Map.Entry<String, Double> entry : gameAverages.entrySet()) {
                historyEntry.put(entry.getKey(), Math.round(entry.getValue()));
            }
            scoreHistory.add(historyEntry);
        }

        return PatientHistoryResponse.builder()
                .recentSessions(recentSessions)
                .gameDistribution(gameDistribution)
                .scoreHistory(scoreHistory)
                .build();
    }

    public PatientStatsResponse getPatientStats(Long patientId) {
        List<UnifiedSession> allUnified = getUnifiedSessions(patientId);

        long totalGames = allUnified.size();
        double averageScore = 0.0;

        if (totalGames > 0) {
            double totalScoreSum = allUnified.stream()
                    .mapToDouble(UnifiedSession::getRawScoreDouble)
                    .sum();
            averageScore = totalScoreSum / totalGames;
        }

        int streak = calculateCurrentStreak(allUnified);

        return PatientStatsResponse.builder()
                .totalGames(totalGames)
                .averageScore(Math.round(averageScore * 100.0) / 100.0)
                .currentStreak(streak)
                .build();
    }

    private int calculateCurrentStreak(List<UnifiedSession> sessions) {
        if (sessions == null || sessions.isEmpty()) {
            return 0;
        }

        List<LocalDate> playDates = sessions.stream()
                .map(s -> s.getCreatedAt().toLocalDate())
                .distinct()
                .sorted(Comparator.reverseOrder())
                .collect(Collectors.toList());

        if (playDates.isEmpty()) return 0;

        int streak = 1;
        LocalDate expectedDate = playDates.get(0).minusDays(1);

        for (int i = 1; i < playDates.size(); i++) {
            if (playDates.get(i).equals(expectedDate)) {
                streak++;
                expectedDate = expectedDate.minusDays(1);
            } else {
                break;
            }
        }
        return streak;
    }

    /**
     * Compute chart data for the doctor analytics page, windowed to the last
     * {@code rangeDays} days.
     *
     * Returns:
     *   gameCompletionData → { date, completed } per day, last rangeDays days
     *   scoreProgressData  → { week, avgScore } per ISO week, spanning the same range
     *   improvementTrend   → % change of the latest week's avg score vs the week before it
     *   gameTypeData       → { name, value } session counts per game/activity, most-played first
     *   avgScoreAcrossPatients   → mean of each patient's own average score
     *   avgGamesPlayedPerPatient → mean of each patient's total game count
     *
     * improvementTrend and gameTypeData used to be hardcoded stubs (a fixed
     * "+8%" and an always-empty list) on the doctor dashboard — this computes
     * both from the same session data as the charts, so the stat tile and the
     * chart beneath it can never disagree.
     *
     * The last two fields exist so DoctorController.getAnalytics doesn't need
     * its own per-patient getPatientStats() loop: that loop called
     * getPatientStats() twice per patient (once for avg score, once for game
     * count), and each call did its own 3-query fetch — for a doctor with N
     * patients that was up to 6N database round trips just for two numbers,
     * on top of the batched fetch this method was already doing. Computing
     * them here reuses the one batch already fetched below.
     */
    public Map<String, Object> getDoctorChartData(List<Long> patientIds, int rangeDays) {
        Map<String, Object> chartData = new HashMap<>();

        if (patientIds == null || patientIds.isEmpty()) {
            chartData.put("gameCompletionData", Collections.emptyList());
            chartData.put("scoreProgressData", Collections.emptyList());
            chartData.put("gameTypeData", Collections.emptyList());
            chartData.put("improvementTrend", 0.0);
            chartData.put("avgScoreAcrossPatients", 0.0);
            chartData.put("avgGamesPlayedPerPatient", 0.0);
            return chartData;
        }

        Map<Long, List<UnifiedSession>> byPatient = getUnifiedSessionsBatch(patientIds);
        List<UnifiedSession> all = byPatient.values().stream()
                .flatMap(List::stream)
                .collect(Collectors.toList());

        double avgScoreAcrossPatients = patientIds.stream()
                .mapToDouble(id -> {
                    List<UnifiedSession> sessions = byPatient.getOrDefault(id, Collections.emptyList());
                    if (sessions.isEmpty()) return 0.0;
                    return sessions.stream().mapToDouble(UnifiedSession::getRawScoreDouble).average().orElse(0.0);
                })
                .average()
                .orElse(0.0);
        double avgGamesPlayedPerPatient = patientIds.stream()
                .mapToDouble(id -> byPatient.getOrDefault(id, Collections.emptyList()).size())
                .average()
                .orElse(0.0);
        chartData.put("avgScoreAcrossPatients", Math.round(avgScoreAcrossPatients * 100.0) / 100.0);
        chartData.put("avgGamesPlayedPerPatient", avgGamesPlayedPerPatient);

        // ── 1) gameCompletionData — last `rangeDays` days, grouped by day ──
        LocalDate today = LocalDate.now();
        DateTimeFormatter dayFmt = DateTimeFormatter.ofPattern("yyyy-MM-dd");

        Map<LocalDate, Long> dayCounts = all.stream()
                .collect(Collectors.groupingBy(s -> s.getCreatedAt().toLocalDate(), Collectors.counting()));

        List<Map<String, Object>> gameCompletionData = new ArrayList<>();
        for (int i = rangeDays - 1; i >= 0; i--) {
            LocalDate day = today.minusDays(i);
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("date", day.format(dayFmt));
            entry.put("completed", dayCounts.getOrDefault(day, 0L));
            gameCompletionData.add(entry);
        }
        chartData.put("gameCompletionData", gameCompletionData);

        // ── 2) scoreProgressData — grouped by ISO week, covering the range ──
        int weekCount = Math.max(2, (int) Math.ceil(rangeDays / 7.0));
        LocalDate thisMonday = today.with(java.time.DayOfWeek.MONDAY);
        List<LocalDate> weekStarts = new ArrayList<>();
        for (int i = weekCount - 1; i >= 0; i--) {
            weekStarts.add(thisMonday.minusWeeks(i));
        }

        Map<LocalDate, List<Double>> weekScoreMap = new LinkedHashMap<>();
        for (LocalDate ws : weekStarts) {
            weekScoreMap.put(ws, new ArrayList<>());
        }
        for (UnifiedSession s : all) {
            LocalDate mondayOfDate = s.getCreatedAt().toLocalDate().with(java.time.DayOfWeek.MONDAY);
            if (weekScoreMap.containsKey(mondayOfDate)) {
                weekScoreMap.get(mondayOfDate).add(s.getRawScoreDouble());
            }
        }

        List<Map<String, Object>> scoreProgressData = new ArrayList<>();
        int weekNum = 1;
        for (LocalDate ws : weekStarts) {
            List<Double> scores = weekScoreMap.get(ws);
            double avg = scores.isEmpty() ? 0.0 : scores.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("week", "Week " + weekNum);
            entry.put("avgScore", Math.round(avg * 10.0) / 10.0);
            scoreProgressData.add(entry);
            weekNum++;
        }
        chartData.put("scoreProgressData", scoreProgressData);

        // ── 3) improvementTrend — latest week's avg vs the week before it ──
        // Reuses the buckets built above rather than re-querying, so this
        // number always agrees with the chart it sits next to.
        double improvementTrend = 0.0;
        List<Double> currentWeekScores = weekScoreMap.get(weekStarts.get(weekStarts.size() - 1));
        List<Double> priorWeekScores = weekScoreMap.get(weekStarts.get(weekStarts.size() - 2));
        double currentAvg = currentWeekScores.isEmpty() ? 0.0
                : currentWeekScores.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
        double priorAvg = priorWeekScores.isEmpty() ? 0.0
                : priorWeekScores.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
        if (priorAvg > 0) {
            improvementTrend = ((currentAvg - priorAvg) / priorAvg) * 100.0;
        }
        chartData.put("improvementTrend", Math.round(improvementTrend * 10.0) / 10.0);

        // ── 4) gameTypeData — session count per game/activity, top 8 ───────
        Map<String, Long> gameTypeCounts = all.stream()
                .collect(Collectors.groupingBy(UnifiedSession::getGameType, Collectors.counting()));

        List<Map<String, Object>> gameTypeData = gameTypeCounts.entrySet().stream()
                .sorted((a, b) -> Long.compare(b.getValue(), a.getValue()))
                .limit(8)
                .map(e -> {
                    Map<String, Object> entry = new LinkedHashMap<>();
                    entry.put("name", e.getKey());
                    entry.put("value", e.getValue());
                    return entry;
                })
                .collect(Collectors.toList());
        chartData.put("gameTypeData", gameTypeData);

        return chartData;
    }

    /**
     * Flags patients whose average score over the last 7 days is at least
     * 20% below their average over the 7 days before that. Mirrors the
     * threshold already implemented in the ML service's
     * PatientState._check_alert — that logic runs today but its result is
     * never returned to anyone; this is the first place it reaches a doctor.
     *
     * Skipped for a patient with fewer than 2 sessions in either window,
     * since a single session's swing either way isn't a meaningful trend.
     */
    public List<Map<String, Object>> getDeclineAlerts(List<Long> patientIds) {
        List<Map<String, Object>> alerts = new ArrayList<>();
        if (patientIds == null || patientIds.isEmpty()) {
            return alerts;
        }

        Map<Long, List<UnifiedSession>> byPatient = getUnifiedSessionsBatch(patientIds);
        LocalDate today = LocalDate.now();
        LocalDate thisWeekStart = today.minusDays(6);
        LocalDate prevWeekStart = today.minusDays(13);
        LocalDate prevWeekEnd = today.minusDays(7);

        for (Map.Entry<Long, List<UnifiedSession>> patientEntry : byPatient.entrySet()) {
            List<UnifiedSession> sessions = patientEntry.getValue();

            List<Double> thisWeek = sessions.stream()
                    .filter(s -> !s.getCreatedAt().toLocalDate().isBefore(thisWeekStart))
                    .map(UnifiedSession::getRawScoreDouble)
                    .collect(Collectors.toList());
            List<Double> prevWeek = sessions.stream()
                    .filter(s -> {
                        LocalDate d = s.getCreatedAt().toLocalDate();
                        return !d.isBefore(prevWeekStart) && !d.isAfter(prevWeekEnd);
                    })
                    .map(UnifiedSession::getRawScoreDouble)
                    .collect(Collectors.toList());

            if (thisWeek.size() < 2 || prevWeek.size() < 2) {
                continue;
            }

            double thisAvg = thisWeek.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
            double prevAvg = prevWeek.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
            if (prevAvg <= 0) {
                continue;
            }

            double declinePercent = ((prevAvg - thisAvg) / prevAvg) * 100.0;
            if (declinePercent >= 20.0) {
                Map<String, Object> alert = new HashMap<>();
                alert.put("patientId", patientEntry.getKey());
                alert.put("declinePercent", Math.round(declinePercent * 10.0) / 10.0);
                alert.put("thisWeekAvg", Math.round(thisAvg * 10.0) / 10.0);
                alert.put("prevWeekAvg", Math.round(prevAvg * 10.0) / 10.0);
                alerts.add(alert);
            }
        }

        alerts.sort((a, b) -> Double.compare((double) b.get("declinePercent"), (double) a.get("declinePercent")));
        return alerts;
    }

    /**
     * Patients who haven't logged a single session in at least
     * {@code minDaysInactive} days, most-inactive first, so a doctor can
     * nudge them before they drop off the product entirely. A patient with
     * no sessions at all is treated as maximally inactive.
     */
    public List<Map<String, Object>> getInactivePatients(List<Long> patientIds, int minDaysInactive) {
        List<Map<String, Object>> inactive = new ArrayList<>();
        if (patientIds == null || patientIds.isEmpty()) {
            return inactive;
        }

        Map<Long, List<UnifiedSession>> byPatient = getUnifiedSessionsBatch(patientIds);
        LocalDate today = LocalDate.now();

        for (Long patientId : patientIds) {
            List<UnifiedSession> sessions = byPatient.get(patientId);
            // Each list is already sorted most-recent-first by getUnifiedSessionsBatch.
            LocalDate lastPlayed = (sessions != null && !sessions.isEmpty())
                    ? sessions.get(0).getCreatedAt().toLocalDate()
                    : null;
            long daysSince = lastPlayed != null ? ChronoUnit.DAYS.between(lastPlayed, today) : Long.MAX_VALUE;

            if (daysSince >= minDaysInactive) {
                Map<String, Object> entry = new HashMap<>();
                entry.put("patientId", patientId);
                entry.put("lastPlayedDate", lastPlayed != null ? lastPlayed.toString() : null);
                entry.put("daysSinceLastPlayed", lastPlayed != null ? daysSince : null);
                inactive.add(entry);
            }
        }

        inactive.sort((a, b) -> {
            Long da = (Long) a.get("daysSinceLastPlayed");
            Long db = (Long) b.get("daysSinceLastPlayed");
            long va = da != null ? da : Long.MAX_VALUE;
            long vb = db != null ? db : Long.MAX_VALUE;
            return Long.compare(vb, va);
        });
        return inactive;
    }
}

