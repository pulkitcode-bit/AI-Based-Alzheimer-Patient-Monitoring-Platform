package com.neuromind.neuromind_backend.repo;

import com.neuromind.neuromind_backend.model.Reminder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReminderRepository extends JpaRepository<Reminder, Long> {
    List<Reminder> findByPatientIdOrderBySentAtDesc(Long patientId);
    long countByPatientIdAndIsReadFalse(Long patientId);
    List<Reminder> findByPatientIdAndIsReadFalse(Long patientId);
}
