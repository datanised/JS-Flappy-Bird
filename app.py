from flask import Flask, render_template, request, jsonify, session
from static.game_events import GameEvents
import atexit
import os
import logging
from flask_cors import CORS

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.secret_key = os.urandom(24)  # Generate secure secret key
game_events = GameEvents()
CORS(app)

leaderboard_data = []

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/start-session', methods=['POST'])
def start_session():
    try:
        user_id = request.json.get('user_id')
        if not user_id:
            return jsonify({'error': 'Missing user_id'}), 400
            
        session_id = game_events.start_session(user_id)
        session['user_id'] = user_id
        session['session_id'] = session_id
        logger.info(f"Started session {session_id} for user {user_id}")
        return jsonify({'session_id': session_id})
    except Exception as e:
        logger.error(f"Session start failed: {str(e)}")
        return jsonify({'error': 'Failed to start session'}), 500

@app.route('/event', methods=['POST'])
def track_event():
    try:
        data = request.json
        user_id = session.get('user_id')
        session_id = session.get('session_id')
        
        if not user_id or not session_id:
            logger.warning(f"No active session for event: {data}")
            return jsonify({'error': 'No active session'}), 400
            
        if not data or 'type' not in data:
            return jsonify({'error': 'Invalid event data'}), 400

        event_type = data.get('type')
        game_events.track_event(
            event_type,
            data.get('data', {}),
            user_id,
            session_id
        )
        
        # Suppose we store the game_over score:
        if event_type == 'game_over':
            leaderboard_data.append({'player': data.get('player_id'), 'score': data.get('score')})
        
        return jsonify({'status': 'success'})
    except Exception as e:
        logger.error(f"Event tracking failed: {str(e)}")
        return jsonify({'error': 'Failed to track event'}), 500

@app.route('/end-session', methods=['POST'])
def end_session():
    session.clear()
    return jsonify({'status': 'success'})

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'kafka': game_events.check_connection()})

@app.route('/leaderboard', methods=['GET'])
def get_leaderboard():
    # Convert None scores to 0 or skip them
    cleaned_data = []
    for entry in leaderboard_data:
        score = entry.get('score', 0)
        if score is None:
            score = 0
        cleaned_data.append({
            'player': entry.get('player', 'Unknown'),
            'score': score
        })
    top_scores = sorted(cleaned_data, key=lambda x: x['score'], reverse=True)[:5]
    return jsonify(top_scores)

@app.route('/api/leaderboard', methods=['GET'])
def get_leaderboard_api():
    try:
        # Add your CrateDB connection/query here
        return jsonify({'scores': leaderboard_data})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/scores', methods=['POST']) 
def save_score():
    try:
        data = request.json
        player_name = data.get('playerName')
        score = data.get('score')
        # Add your CrateDB save logic here
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def shutdown():
    try:
        game_events.cleanup()
        logger.info("Game events cleanup completed")
    except Exception as e:
        logger.error(f"Cleanup failed: {str(e)}")

atexit.register(shutdown)

if __name__ == '__main__':
    app.run(debug=True)