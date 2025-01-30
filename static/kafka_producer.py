from confluent_kafka import Producer
import json
import socket
from datetime import datetime

class GameEventProducer:
    def __init__(self, bootstrap_servers='localhost:9092'):
        # Configure the Kafka producer
        conf = {
            'bootstrap.servers': bootstrap_servers,
            'client.id': socket.gethostname()
        }
        self.producer = Producer(conf)
        self.topic = 'game_events'

    def delivery_report(self, err, msg):
        """Callback invoked on successful or failed delivery"""
        if err:
            print(f'Message delivery failed: {err}')
        else:
            print(f'Message delivered to {msg.topic()} [{msg.partition()}]')

    def send_event(self, event_type, event_data, user_id, session_id):
        """Send a game event to Kafka with required user and session info"""
        event = {
            'event_type': event_type,
            'timestamp': datetime.now().isoformat(),
            'user_id': user_id,
            'session_id': session_id,
            'data': event_data
        }
        try:
            self.producer.produce(
                self.topic,
                key=event_type,
                value=json.dumps(event),
                callback=self.delivery_report
            )
            # Trigger delivery callbacks
            self.producer.poll(0)
        except Exception as e:
            print(f'Error sending event to Kafka: {e}')

    def close(self):
        """Flush any pending messages and close the producer"""
        self.producer.flush()