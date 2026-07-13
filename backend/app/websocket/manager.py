import uuid
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self) -> None:
        self.active_connections: dict[uuid.UUID, WebSocket] = {}

    async def connect(self, user_id: uuid.UUID, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections[user_id] = websocket

    async def disconnect(self, user_id: uuid.UUID) -> None:
        self.active_connections.pop(user_id, None)

    async def broadcast_to_user(self, user_id: uuid.UUID, message: dict) -> None:
        websocket = self.active_connections.get(user_id)
        if websocket is not None:
            await websocket.send_json(message)

# Instantiate the single, global shared instance right here!
manager = ConnectionManager()