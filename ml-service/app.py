import warnings

import pandas as pd
from flask import Flask, request, jsonify
from flask_cors import CORS

warnings.filterwarnings('ignore')

app = Flask(__name__)
CORS(app)

df_activities = None

# The activities table uses "Sustained Attention" as N-Back's own category
# (matching the master activity spec exactly), but the domain-level views
# this service and the frontend progress page use are built around 6
# domains, not 7. Sustained attention and inhibitory control are closely
# related constructs, so it's folded into "Attention & Inhibition" for
# aggregation — the activity's own `category` column is untouched.
CATEGORY_TO_DOMAIN = {
    'Processing Speed': 'Processing Speed',
    'Executive Function': 'Executive Function',
    'Attention & Inhibition': 'Attention & Inhibition',
    'Working Memory': 'Working Memory',
    'Visuospatial Memory': 'Visuospatial Memory',
    'Sustained Attention': 'Attention & Inhibition',
    'Language': 'Language',
}


def init_engine():
    global df_activities
    try:
        import os
        base_dir = os.path.dirname(os.path.abspath(__file__))
        csv_path = os.path.join(base_dir, 'alzheimer_activities.csv')
        df_activities = pd.read_csv(csv_path)
        df_activities['domain'] = df_activities['category'].map(CATEGORY_TO_DOMAIN).fillna(df_activities['category'])
        print("Recommendation engine initialized with the 10 neuropsychological-test activities.")
    except Exception as e:
        print(f"Initialization failed: {e}")


init_engine()


def pick_activity_for_domain(domain, domain_avg_score, activities_df):
    """
    Picks one activity within the given domain. When a domain has more than
    one activity at different difficulties (e.g. Working Memory has both
    Digit Span Forward and Backward), a patient who is genuinely struggling
    in that domain (low average score) gets steered to the easier variant
    rather than the harder one — recommending "the thing you're worst at, at
    its hardest difficulty" would be counterproductive, not clinically sound.
    """
    candidates = activities_df[activities_df['domain'] == domain]
    if len(candidates) == 0:
        return None
    if len(candidates) == 1:
        return candidates.iloc[0]

    if domain_avg_score is not None and domain_avg_score < 60:
        easier = candidates[candidates['difficulty_level'] != 'High']
        if len(easier) > 0:
            return easier.sample(1).iloc[0]

    return candidates.sample(1).iloc[0]


def build_recommendation(domain_scores):
    """
    domain_scores: {domain_name: avg_score_0_to_100, ...} — only domains the
    patient has actually played contribute an entry. Recommends an activity
    from whichever domain (among those present) has the lowest average
    score, since targeting a patient's weakest area is the clinically
    meaningful approach, rather than reinforcing what they're already good at.
    """
    if not domain_scores:
        # Cold start — no sessions yet for any domain. Pick literally any
        # activity at the easiest available difficulty (there is no "Low"
        # tier in this activity set, so "Medium" is the floor) rather than
        # guessing at a domain with zero evidence.
        candidates = df_activities[df_activities['difficulty_level'] != 'High']
        chosen = candidates.sample(1).iloc[0] if len(candidates) > 0 else df_activities.sample(1).iloc[0]
        return {
            'recommended_activity': chosen['activity_name'],
            'activity_id': chosen['activity_id'],
            'difficulty': chosen['difficulty_level'],
            'category': chosen['category'],
            'confidence': 0.5,
            'reason': "Cold start — no sessions yet, so we're starting you with an approachable activity.",
            'suggested_duration_minutes': max(1, int(chosen['expected_time_sec']) // 60) or 1,
            'caregiver_alert': False,
        }

    weakest_domain = min(domain_scores, key=domain_scores.get)
    weakest_score = domain_scores[weakest_domain]
    chosen = pick_activity_for_domain(weakest_domain, weakest_score, df_activities)
    if chosen is None:
        chosen = df_activities.sample(1).iloc[0]

    # More domains with real data, and a clearer gap between the weakest and
    # the rest, both mean this recommendation is standing on firmer ground.
    other_scores = [v for k, v in domain_scores.items() if k != weakest_domain]
    avg_other = sum(other_scores) / len(other_scores) if other_scores else weakest_score
    gap = max(0.0, avg_other - weakest_score)
    confidence = min(0.95, 0.55 + 0.05 * len(domain_scores) + min(0.2, gap / 100))

    return {
        'recommended_activity': chosen['activity_name'],
        'activity_id': chosen['activity_id'],
        'difficulty': chosen['difficulty_level'],
        'category': chosen['category'],
        'confidence': round(confidence, 2),
        'reason': f"Your {weakest_domain} performance ({weakest_score:.0f}) is your weakest area right now — this activity is designed to build it up.",
        'suggested_duration_minutes': max(1, int(chosen['expected_time_sec']) // 60) or 1,
        'caregiver_alert': weakest_score < 40,
    }


@app.route("/")
def home():
    return "NeuroMind Recommendation Engine Running Successfully"


@app.route('/recommend/<patient_id>', methods=['GET', 'POST'])
def recommend_endpoint(patient_id):
    """
    GET  — cold start / no domain data available to this call.
    POST — body {"domain_scores": {"Working Memory": 42.0, ...}} computed by
           the Spring Boot backend from the patient's real session history;
           recommends toward whichever domain present is weakest.
    """
    try:
        domain_scores = {}
        if request.method == 'POST':
            payload = request.get_json(silent=True) or {}
            domain_scores = payload.get('domain_scores') or {}
            domain_scores = {k: float(v) for k, v in domain_scores.items() if v is not None}

        result = build_recommendation(domain_scores)
        result['patient_id'] = str(patient_id)
        return jsonify({"status": "success", "data": result}), 200
    except Exception as e:
        print(f"Error building recommendation: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


if __name__ == '__main__':
    app.run(port=5000, debug=True)
