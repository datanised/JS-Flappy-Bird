from confluent_kafka import Consumer
import json
import psycopg2
from datetime import datetime
import socket
import logging

class GameEventsConsumer:
    def __init__(self):
        # Kafka consumer configuration
        conf = {
            'bootstrap.servers': 'localhost:9092',
            'group.id': 'game_events_consumer',
            'auto.offset.reset': 'earliest',
            'client.id': socket.gethostname()
        }
        self.consumer = Consumer(conf)
        self.topic = 'game_events'
        
        # CrateDB connection
        self.conn = psycopg2.connect(
            dbname="doc",  # CrateDB default schema
            user="crate",
            host="localhost",
            port="5432"
        )
        self.cur = self.conn.cursor()
        self.create_table()

    def create_table(self):
        """Create the game_events table if it doesn't exist"""
        self.cur.execute("""
            CREATE TABLE IF NOT EXISTS game_events (
                event_type STRING,
                timestamp TIMESTAMP,
                user_id STRING,
                session_id STRING,
                event_data OBJECT(DYNAMIC)
            )
        """)
        self.conn.commit()

    def validate_event(self, event):
        """Validate and normalize event data"""
        # Map incoming 'data' field to 'event_data'
        if 'data' in event and 'event_data' not in event:
            event['event_data'] = event.pop('data')
        
        # Validate required fields
        required_fields = ['event_type', 'timestamp', 'user_id', 'session_id']
        for field in required_fields:
            if field not in event:
                raise ValueError(f"Missing required field: {field}")
        
        # Ensure event_data exists
        if not event.get('event_data'):
            event['event_data'] = {}
        
        # Ensure event_data is a dictionary
        if not isinstance(event['event_data'], dict):
            event['event_data'] = {'raw_data': str(event['event_data'])}
        
        logging.debug(f"Normalized event: {json.dumps(event, default=str)}")
        
        return event

    def store_event(self, event):
        """Store event in CrateDB"""
        try:
            validated_event = self.validate_event(event)
            logging.info(f"Storing event type: {validated_event['event_type']} with data: {validated_event['event_data']}")
            
            sql = """
                INSERT INTO game_events (
                    event_type, timestamp, user_id, session_id, event_data
                )
                VALUES (%s, %s, %s, %s, %s)
            """
            self.cur.execute(sql, (
                validated_event['event_type'],
                datetime.fromisoformat(validated_event['timestamp']),
                validated_event['user_id'],
                validated_event['session_id'],
                json.dumps(validated_event['event_data'])
            ))
            self.conn.commit()
            
        except Exception as e:
            logging.error(f"Failed to store event: {str(e)}")
            raise

    def start_consuming(self):
        """Start consuming messages"""
        try:
            self.consumer.subscribe([self.topic])
            
            while True:
                msg = self.consumer.poll(1.0)
                if msg is None:
                    continue
                if msg.error():
                    logging.error(f"Consumer error: {msg.error()}")
                    continue

                try:
                    event = json.loads(msg.value())
                    self.store_event(event)
                    logging.info(f"Stored event: {event['event_type']}")
                except json.JSONDecodeError as e:
                    logging.error(f"Invalid JSON message: {e}")
                except Exception as e:
                    logging.error(f"Error processing message: {e}")

        except KeyboardInterrupt:
            logging.info("Shutting down consumer...")
        finally:
            self.consumer.close()
            self.cur.close()
            self.conn.close()

if __name__ == "__main__":
    consumer = GameEventsConsumer()
    consumer.start_consuming()