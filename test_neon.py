import asyncio
import sys
import os

# Add the project root to sys.path
sys.path.append(os.getcwd())

from app.database import init_db, engine
from sqlalchemy import text

async def test_neon_connection():
    print("Initializing Neon database and creating tables...")
    try:
        await init_db()
        print("Tables created successfully.")
        
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT current_database();"))
            db_name = result.scalar()
            print(f"Connected to database: {db_name}")
            
            result = await conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';"))
            tables = result.scalars().all()
            print(f"Existing tables: {tables}")
            
    except Exception as e:
        print(f"Error connecting to Neon: {e}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(test_neon_connection())
