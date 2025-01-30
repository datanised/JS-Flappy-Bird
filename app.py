from flask import Flask, render_template, request, jsonify, session
from static.game_events import GameEvents
import atexit
import os
import logging
from flask_cors import CORS
from crate import client
import uuid
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.secret_key = os.urandom(24)  # Generate secure secret key
game_events = GameEvents()
CORS(app)

leaderboard_data = []

# CrateDB connection
connection = client.connect("localhost:4200")

# Add new event type constant at top
SCORE_EVENT = 'score'

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
def handle_event():
    try:
        event_data = request.json
        event_type = event_data.get('type')
        
        if event_type == SCORE_EVENT:
            # Handle score event
            player_name = event_data.get('playerName', 'Anonymous')
            score = event_data.get('score', 0)
            
            cursor = connection.cursor()
            score_id = str(uuid.uuid4())
            
            query = """
                INSERT INTO leaderboard (id, player_name, score, created) 
                VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            """
            
            cursor.execute(query, (score_id, player_name, score))
            connection.commit()
            
            logger.info(f"Score saved: {player_name} - {score}")
            return jsonify({'success': True, 'id': score_id})
            
        # ... handle other events ...
        
        user_id = session.get('user_id')
        session_id = session.get('session_id')
        
        if not user_id or not session_id:
            logger.warning(f"No active session for event: {event_data}")
            return jsonify({'error': 'No active session'}), 400
            
        if not event_data or 'type' not in event_data:
            return jsonify({'error': 'Invalid event data'}), 400

        game_events.track_event(
            event_type,
            event_data.get('data', {}),
            user_id,
            session_id
        )
        
        # Suppose we store the game_over score:
        if event_type == 'game_over':
            leaderboard_data.append({'player': event_data.get('player_id'), 'score': event_data.get('score')})
        
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
        cursor = connection.cursor()
        cursor.execute("""
            SELECT player_name, score 
            FROM leaderboard 
            ORDER BY score DESC 
            LIMIT 5
        """)
        rows = cursor.fetchall()
        scores = [{'playerName': row[0], 'score': row[1]} for row in rows]
        return jsonify({'scores': scores})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/scores', methods=['POST'])
def save_score():
    try:
        data = request.json
        logger.debug(f"Received data: {data}")
        player_name = data.get('playerName')
        score = data.get('score')
        
        if not player_name or not isinstance(score, (int, float)):
            return jsonify({'success': False, 'error': 'Invalid input'}), 400

        logger.info(f"Saving score: {player_name} - {score}")
        
        cursor = connection.cursor()
        score_id = str(uuid.uuid4())
        
        cursor.execute("""
            INSERT INTO leaderboard (id, player_name, score, created) 
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        """, (score_id, player_name, score))
        
        connection.commit()
        logger.info(f"Score saved with ID: {score_id}")
        
        return jsonify({
            'success': True,
            'id': score_id
        })
        
    except Exception as e:
        logger.error(f"Error saving score: {str(e)}")
        return jsonify({
            'success': False, 
            'error': str(e)
        }), 500

def shutdown():
    try:
        game_events.cleanup()
        logger.info("Game events cleanup completed")
    except Exception as e:
        logger.error(f"Cleanup failed: {str(e)}")

atexit.register(shutdown)

if __name__ == '__main__':
    app.run(debug=True)