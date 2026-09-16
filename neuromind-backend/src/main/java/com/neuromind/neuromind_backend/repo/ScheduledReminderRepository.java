package com.neuromind.neuromind_backend.repo;

import com.neuromind.neuromind_backend.model.ScheduledReminder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ScheduledReminderRepository extends JpaRepository<ScheduledReminder, Long> {
    List<ScheduledReminder> findByPatientIdAndActiveTrueOrderByNextTriggerAtAsc(Long patientId);

    List<ScheduledReminder> findByActiveTrueAndNextTriggerAtLessThanEqual(LocalDateTime now);
}
