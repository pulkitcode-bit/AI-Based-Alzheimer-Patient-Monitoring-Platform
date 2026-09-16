package com.neuromind.neuromind_backend.repo;

import com.neuromind.neuromind_backend.model.Appointment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AppointmentRepo extends JpaRepository<Appointment, Long> {
    List<Appointment> findByPatientIdOrderByCreatedAtDesc(Long patientId);

    List<Appointment> findByDoctorIdOrderByCreatedAtDesc(Long doctorId);
}
