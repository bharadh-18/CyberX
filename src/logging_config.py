import logging
from pythonjsonlogger import jsonlogger
from datetime import datetime
import sys

from src.config import settings

class CustomJsonFormatter(jsonlogger.JsonFormatter):
    def add_fields(self, log_record, record, message_dict):
        super(CustomJsonFormatter, self).add_fields(log_record, record, message_dict)
        if not log_record.get('timestamp'):
            # ISO 8601 string
            now = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%S.%fZ')
            log_record['timestamp'] = now
        
        # Ensure severity is present
        if log_record.get('severity'):
            log_record['severity'] = record.levelname
        else:
            log_record['severity'] = record.levelname

        # Set default empty fields if not explicitly provided
        defaults = {
            'event_id': None,
            'category': 'GENERAL',
            'user_id': None,
            'session_id': None,
            'source_ip': None,
            'request_id': None,
            'method': None,
            'path': None,
            'status_code': None,
            'response_time_ms': None,
            'threat_indicators': {}
        }
        
        for key, default_val in defaults.items():
            if key not in log_record:
                log_record[key] = getattr(record, key, default_val)

def setup_logging():
    logger = logging.getLogger()
    
    # Configure log level
    level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)
    logger.setLevel(level)
    
    # Configure json formatter
    log_handler = logging.StreamHandler(sys.stdout)
    formatter = CustomJsonFormatter('%(timestamp)s %(severity)s %(name)s %(message)s')
    log_handler.setFormatter(formatter)
    
    # Remove all default handlers and use only the json formatter
    if logger.hasHandlers():
        logger.handlers.clear()
        
    logger.addHandler(log_handler)
    
    return logger

# Create a logger instance for easy import
logger = logging.getLogger("zerotrust")
