package com.neuromind.neuromind_backend.Service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.neuromind.neuromind_backend.Dto.GameScoreRequest;
import com.neuromind.neuromind_backend.model.GameScore;
import com.neuromind.neuromind_backend.repo.GameScoreRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class GameService {
    private final GameScoreRepository gameScoreRepository;

    public void submitScore(GameScoreRequest request) {
        GameScore gameScore = GameScore.builder().patientId(request.getPatientId()).gameType(request.getGameType())
                .score(request.getScore())
                .moves(request.getMoves()).time(request.getTime()).level(request.getLevel()).build();
        gameScoreRepository.save(gameScore);

    }

    public List<GameScore> gethistory(Long patientId) {
        return gameScoreRepository.findByPatientIdOrderByCreatedAtDesc(patientId);
    }

    public Double getAverageScore(Long patientId) {
        Double avg = gameScoreRepository.getAverageScore(patientId);
        return avg != null ? Math.round(avg * 10.0) / 10.0 : 0.0;
    }

    public Long getTotalGamesPlayed(Long patientId) {
        return gameScoreRepository.getTotalGamesPlayed(patientId);
    }

}
