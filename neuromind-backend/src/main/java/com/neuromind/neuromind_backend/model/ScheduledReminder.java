package com.neuromind.neuromind_backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * A future or recurring reminder a patient wants delivered at a specific time
 * — "take medication at 8am daily", "play a game at 5pm today". Distinct from
 * {@link Reminder}, which is a delivered notification a patient sees in their
 * bell right now; this is the schedule that eventually produces one.
 */
@Entity
@Table(name = "scheduled_reminders")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ScheduledReminder {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long patientId;

    @Column(nullable = false)
    private String label;

    /** "ONCE" fires a single time then deactivates; "DAILY" fires every day at the same time. */
    @Column(nullable = false)
    private String recurrence;

    @Column(name = "next_trigger_at", nullable = false)
    private LocalDateTime nextTriggerAt;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
