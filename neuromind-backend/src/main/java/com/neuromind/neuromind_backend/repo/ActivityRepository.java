package com.neuromind.neuromind_backend.repo;

import com.neuromind.neuromind_backend.model.Activity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ActivityRepository extends JpaRepository<Activity, String> {

    List<Activity> findByCategory(String category);
}
