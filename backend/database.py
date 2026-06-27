from config import MONGO_URL, MONGO_DB

# Monkey patch mongomock_motor to prevent infinite recursion wrapping bug
try:
    import mongomock_motor.patches
    orig_patch_iter = mongomock_motor.patches._patch_iter_documents
    orig_patch_insert = mongomock_motor.patches._patch_insert_and_ensure_uniques

    def custom_patch_iter(collection):
        if hasattr(collection._iter_documents, "__is_patched__"):
            return collection
        res = orig_patch_iter(collection)
        try:
            collection._iter_documents.__is_patched__ = True
        except Exception:
            pass
        return res

    def custom_patch_insert(collection):
        if hasattr(collection._insert, "__is_patched__"):
            return collection
        res = orig_patch_insert(collection)
        try:
            collection._insert.__is_patched__ = True
        except Exception:
            pass
        return res

    mongomock_motor.patches._patch_iter_documents = custom_patch_iter
    mongomock_motor.patches._patch_insert_and_ensure_uniques = custom_patch_insert
    print("🔧 mongomock_motor recursion patch applied successfully")
except Exception as e:
    print(f"⚠️ Failed to apply mongomock_motor patch: {e}")

client = None
db = None


async def connect_db():
    global client, db

    if MONGO_URL.startswith("mongomock://"):
        # Local dev: use in-memory mongomock
        try:
            from mongomock_motor import AsyncMongoMockClient
            client = AsyncMongoMockClient()
            print("✅ MongoDB (mongomock in-memory) connected")
        except ImportError:
            raise RuntimeError("mongomock-motor not installed. Run: pip3 install --user mongomock-motor")
    else:
        from motor.motor_asyncio import AsyncIOMotorClient
        client = AsyncIOMotorClient(MONGO_URL)
        print("✅ MongoDB connected")

    db = client[MONGO_DB]

    # Create indexes (mongomock silently ignores index options it doesn't support)
    try:
        await db.telemetry.create_index([("asset_id", 1), ("timestamp", -1)])
        await db.alarms.create_index([("asset_id", 1), ("timestamp", -1)])
        await db.health_scores.create_index([("asset_id", 1), ("timestamp", -1)])
    except Exception:
        pass  # indexes are optional for dev


async def disconnect_db():
    global client
    if client:
        try:
            client.close()
        except Exception:
            pass


def get_db():
    return db
