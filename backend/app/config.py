# import os

# class Settings:
#     PROJECT_NAME:str="Study-Circle"

#     SECRET_KEY:str
#     ALGORITHM:str="HS256"
#     ACCESS_TOKEN_EXPIRE_MINUTES:int=60*24*7
#     REFRESH_TOKEN_EXPIRE_MINUTES:int=60*24*30

# settings=Settings()    


from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    PROJECT_NAME: str = "Study Circle"
    
    # Database & Redis
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/study_circle"
    REDIS_URL: str = "redis://localhost"
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    
    # Security / JWT
    SECRET_KEY: str = "default_secret_key_change_me_in_production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    
    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000"
    
    # Automatically read from a .env file in the backend directory
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()