package com.neuromind.neuromind_backend.Controller;

import com.neuromind.neuromind_backend.Service.RecommendationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/recommend")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class RecommendationController {

    private final RecommendationService recommendationService;

    @GetMapping("/{patientId}")
    public ResponseEntity<Map<String, Object>> getRecommendations(@PathVariable Long patientId) {
        Map<String, Object> recommendations = recommendationService.getRecommendations(patientId);
        return ResponseEntity.ok(recommendations);
    }
}
