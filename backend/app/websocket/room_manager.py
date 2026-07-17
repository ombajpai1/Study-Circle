from collections import defaultdict
from fastapi import WebSocket

class RoomConnectionManager:
    def __init__(self):
        # room_id (str) -> dict of { user_id (str): WebSocket }
        self.rooms: dict[str, dict[str, WebSocket]] = defaultdict(dict)

    async def connect(self, room_id: str, user_id: str, ws: WebSocket):
        await ws.accept()
        self.rooms[room_id][user_id] = ws

    def disconnect(self, room_id: str, user_id: str):
        if room_id in self.rooms:
            self.rooms[room_id].pop(user_id, None)
            if not self.rooms[room_id]:
                del self.rooms[room_id]

    def get_peers(self, room_id: str, exclude_user_id: str) -> list[str]:
        if room_id not in self.rooms:
            return []
        return [uid for uid in self.rooms[room_id].keys() if uid != exclude_user_id]

    async def send_to_user(self, room_id: str, target_user_id: str, msg: dict):
        ws = self.rooms.get(room_id, {}).get(target_user_id)
        if ws:
            try:
                await ws.send_json(msg)
            except Exception:
                pass

    async def broadcast_room(self, room_id: str, msg: dict, exclude_user_id: str = None):
        if room_id in self.rooms:
            for uid, ws in list(self.rooms[room_id].items()):
                if uid != exclude_user_id:
                    try:
                        await ws.send_json(msg)
                    except Exception:
                        pass

room_manager = RoomConnectionManager()
