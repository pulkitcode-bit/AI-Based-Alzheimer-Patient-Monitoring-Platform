package com.neuromind.neuromind_backend.Service;

import com.neuromind.neuromind_backend.model.Reminder;
import com.neuromind.neuromind_backend.model.ScheduledReminder;
import com.neuromind.neuromind_backend.repo.ReminderRepository;
import com.neuromind.neuromind_backend.repo.ScheduledReminderRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ScheduledReminderService {
    private static final Logger log = LoggerFactory.getLogger(ScheduledReminderService.class);

    private final ScheduledReminderRepository scheduledReminderRepository;
    private final ReminderRepository reminderRepository;

    public ScheduledReminder create(Long patientId, String label, LocalTime timeOfDay, String recurrence, LocalDate onDate) {
        LocalDate targetDate = onDate != null ? onDate : LocalDate.now();
        LocalDateTime nextTrigger = LocalDateTime.of(targetDate, timeOfDay);
        boolean daily = "DAILY".equalsIgnoreCase(recurrence);

        // If the requested time has already passed today: a daily reminder
        // simply starts tomorrow, but a one-time "remind me at 5pm" request
        // made at 6pm should still fire — soon — rather than silently doing
        // nothing until a time that's already gone.
        if (nextTrigger.isBefore(LocalDateTime.now())) {
            nextTrigger = daily ? nextTrigger.plusDays(1) : LocalDateTime.now().plusMinutes(1);
        }

        ScheduledReminder reminder = ScheduledReminder.builder()
                .patientId(patientId)
                .label(label)
                .recurrence(daily ? "DAILY" : "ONCE")
                .nextTriggerAt(nextTrigger)
                .active(true)
                .build();

        return scheduledReminderRepository.save(reminder);
    }

    public List<ScheduledReminder> list(Long patientId) {
        return scheduledReminderRepository.findByPatientIdAndActiveTrueOrderByNextTriggerAtAsc(patientId);
    }

    public void deactivate(Long id, Long patientId) {
        scheduledReminderRepository.findById(id).ifPresent(r -> {
            if (r.getPatientId().equals(patientId)) {
                r.setActive(false);
                scheduledReminderRepository.save(r);
            }
        });
    }

    /**
     * Runs every minute; fires any due scheduled reminder by writing a real
     * {@link Reminder} notification the patient will see in their bell. This
     * is the piece that was entirely missing before — a reminder could be
     * logged, but nothing ever actually delivered one at the time it was for.
     */
    @Scheduled(fixedRate = 60_000)
    public void deliverDueReminders() {
        List<ScheduledReminder> due = scheduledReminderRepository
                .findByActiveTrueAndNextTriggerAtLessThanEqual(LocalDateTime.now());

        for (ScheduledReminder sr : due) {
            Reminder notification = Reminder.builder()
                    .patientId(sr.getPatientId())
                    .message(sr.getLabel())
                    .build();
            reminderRepository.save(notification);

            if ("DAILY".equalsIgnoreCase(sr.getRecurrence())) {
                sr.setNextTriggerAt(sr.getNextTriggerAt().plusDays(1));
            } else {
                sr.setActive(false);
            }
            scheduledReminderRepository.save(sr);
        }

        if (!due.isEmpty()) {
            log.info("Delivered {} scheduled reminder(s)", due.size());
        }
    }
}
