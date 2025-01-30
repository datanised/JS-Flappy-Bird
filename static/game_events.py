from .kafka_producer import GameEventProducer
from .session_manager import SessionManager
import datetime
import logging

logger = logging.getLogger(__name__)
class GameEvents:
    def __init__(self, bootstrap_servers='localhost:9092'):
        self.producer = GameEventProducer(bootstrap_servers)
        self.session_manager = SessionManager()
        self.last_game_over = None  # Track last game over timestamp
        
    def start_session(self, user_id):
        return self.session_manager.create_session(user_id)
        
    def track_event(self, event_type, event_data, user_id, session_id):
        self.producer.send_event(event_type, event_data, user_id, session_id)

    def on_game_start(self, player_id):
        self.producer.send_event('game_start', {
            'player_id': player_id,
            'timestamp': self.get_timestamp()
        })

    def on_game_over(self, score):
        # Add timestamp check to prevent duplicates within 2 seconds
        current_time = datetime.now()
        if self.last_game_over and (current_time - self.last_game_over).total_seconds() < 2:
            logger.debug("Skipping duplicate game_over event")
            return
            
        self.last_game_over = current_time
        logger.debug(f"Sending game_over event with score: {score}")
        
        self.producer.send_event('game_over', {
            'score': score,
            'timestamp': self.get_timestamp()
        })

    def on_score_update(self, new_score):
        self.producer.send_event('score_update', {
            'score': new_score,
            'timestamp': self.get_timestamp()
        })

    def on_collision(self, collision_type):
        self.producer.send_event('collision', {
            'type': collision_type,
            'timestamp': self.get_timestamp()
        })

    def get_timestamp(self):
        from datetime import datetime
        return datetime.now().isoformat()

    def cleanup(self):
        self.producer.close()