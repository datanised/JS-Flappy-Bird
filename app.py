from flask import Flask, render_template, request, jsonify, session
from static.game_events import GameEvents
import atexit
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.secret_key = os.urandom(24)  # Generate secure secret key
game_events = GameEvents()

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

        game_events.track_event(
            data.get('type'),
            data.get('data', {}),
            user_id,
            session_id
        )
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

def shutdown():
    try:
        game_events.cleanup()
        logger.info("Game events cleanup completed")
    except Exception as e:
        logger.error(f"Cleanup failed: {str(e)}")

atexit.register(shutdown)

if __name__ == '__main__':
    app.run(debug=True)