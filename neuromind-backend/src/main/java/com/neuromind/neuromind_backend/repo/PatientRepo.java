package com.neuromind.neuromind_backend.repo;

import com.neuromind.neuromind_backend.model.Patient;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PatientRepo extends JpaRepository<Patient,Long> {
    Optional<Patient> findByEmail(String email);

    boolean existsByEmail(String email);

    List<Patient> findByDoctorId(Long doctorId);
}
