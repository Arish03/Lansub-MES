import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL", "mongomock://localhost/lansub_mes")
MONGO_DB = os.getenv("MONGO_DB", "lansub_mes")

MQTT_HOST = os.getenv("MQTT_HOST", "localhost")
MQTT_PORT = int(os.getenv("MQTT_PORT", 1883))

JWT_SECRET = os.getenv("JWT_SECRET", "local_dev_secret_change_in_production")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", 1440))

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
