package com.neuromind.neuromind_backend.Controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.neuromind.neuromind_backend.Dto.GameScoreRequest;
import com.neuromind.neuromind_backend.Service.GameService;
import com.neuromind.neuromind_backend.model.GameScore;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/game")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class GameController {

    private final GameService gameService;

    // api/game/submit-score
    @PostMapping("/submit-score")
    public ResponseEntity<?> submitScore(@Valid @RequestBody GameScoreRequest request) {
        try {
            gameService.submitScore(request);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/history")
    public ResponseEntity<List<GameScore>> gethistory(@Valid @RequestBody Long patientId) {
        try {
            List<GameScore> history = gameService.gethistory(patientId);
            return ResponseEntity.ok(history);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
}
