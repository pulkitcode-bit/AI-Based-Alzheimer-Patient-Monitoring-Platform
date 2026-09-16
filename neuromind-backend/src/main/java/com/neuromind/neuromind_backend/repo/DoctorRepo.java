package com.neuromind.neuromind_backend.repo;

import com.neuromind.neuromind_backend.model.Doctor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DoctorRepo extends JpaRepository<Doctor,Long> {
    Optional<Doctor> findByEmail(String email);

}
