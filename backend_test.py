#!/usr/bin/env python3
"""
HaxBall Backend API and WebSocket Test Suite
Tests REST API endpoints and Socket.IO functionality
"""

import requests
import socketio
import asyncio
import json
import time
import sys
from typing import Dict, Any

# Backend URL from frontend/.env
BACKEND_URL = "https://futbol-online-4.preview.emergentagent.com"
API_BASE_URL = f"{BACKEND_URL}/api"

class HaxBallTester:
    def __init__(self):
        self.session = requests.Session()
        self.sio = None
        self.test_results = []
        self.socket_events = []
        
    def log_result(self, test_name: str, success: bool, message: str, details: Any = None):
        """Log test result"""
        result = {
            'test': test_name,
            'success': success,
            'message': message,
            'details': details,
            'timestamp': time.time()
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        if details and not success:
            print(f"   Details: {details}")
    
    def test_api_root(self):
        """Test GET /api/ endpoint"""
        try:
            response = self.session.get(f"{API_BASE_URL}/")
            
            if response.status_code == 200:
                data = response.json()
                if "message" in data and "HaxBall" in data["message"]:
                    self.log_result("API Root", True, "Welcome message received correctly", data)
                else:
                    self.log_result("API Root", False, "Unexpected response format", data)
            else:
                self.log_result("API Root", False, f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("API Root", False, f"Request failed: {str(e)}")
    
    def test_auth_login(self):
        """Test POST /api/auth/login endpoint"""
        try:
            test_user = {"username": "TestPlayer"}
            response = self.session.post(f"{API_BASE_URL}/auth/login", json=test_user)
            
            if response.status_code == 200:
                data = response.json()
                if "error" in data:
                    self.log_result("Auth Login", False, "API returned error", data)
                elif all(key in data for key in ["id", "username", "token"]):
                    if data["username"] == "TestPlayer" and data["token"].startswith("token_"):
                        self.log_result("Auth Login", True, "User authenticated successfully", data)
                    else:
                        self.log_result("Auth Login", False, "Invalid response data", data)
                else:
                    self.log_result("Auth Login", False, "Missing required fields", data)
            else:
                self.log_result("Auth Login", False, f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("Auth Login", False, f"Request failed: {str(e)}")
    
    def test_get_rooms(self):
        """Test GET /api/rooms endpoint"""
        try:
            response = self.session.get(f"{API_BASE_URL}/rooms")
            
            if response.status_code == 200:
                data = response.json()
                if "error" in data:
                    self.log_result("Get Rooms", False, "API returned error", data)
                elif "rooms" in data and isinstance(data["rooms"], list):
                    self.log_result("Get Rooms", True, f"Rooms list received ({len(data['rooms'])} rooms)", data)
                else:
                    self.log_result("Get Rooms", False, "Invalid response format", data)
            else:
                self.log_result("Get Rooms", False, f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("Get Rooms", False, f"Request failed: {str(e)}")
    
    def test_socket_endpoint_availability(self):
        """Test if Socket.IO endpoint is accessible"""
        try:
            # Test external URL (should fail due to routing issue)
            external_response = self.session.get(f"{BACKEND_URL}/socket.io/?transport=polling&EIO=4")
            external_working = "sid" in external_response.text and "upgrades" in external_response.text
            
            # Test internal URL (should work)
            internal_response = self.session.get("http://localhost:8001/socket.io/?transport=polling&EIO=4")
            internal_working = "sid" in internal_response.text and "upgrades" in internal_response.text
            
            if internal_working and not external_working:
                self.log_result("Socket Endpoint", False, 
                              "Socket.IO works internally but external routing is misconfigured",
                              {
                                  "internal_status": "working",
                                  "external_status": "routing_issue",
                                  "external_response_preview": external_response.text[:200] + "..." if len(external_response.text) > 200 else external_response.text
                              })
            elif internal_working and external_working:
                self.log_result("Socket Endpoint", True, "Socket.IO endpoint accessible both internally and externally")
            elif not internal_working:
                self.log_result("Socket Endpoint", False, "Socket.IO server not working internally")
            else:
                self.log_result("Socket Endpoint", False, "Unexpected Socket.IO endpoint behavior")
                
        except Exception as e:
            self.log_result("Socket Endpoint", False, f"Failed to test Socket.IO endpoint: {str(e)}")

    async def test_socket_connection(self):
        """Test Socket.IO connection (internal only due to routing issues)"""
        try:
            # Only test internal connection since external routing is broken
            self.sio = socketio.AsyncClient(logger=False, engineio_logger=False)
            
            # Setup event handlers
            @self.sio.event
            async def connect():
                self.socket_events.append({"event": "connect", "data": None})
                
            @self.sio.event
            async def disconnect():
                self.socket_events.append({"event": "disconnect", "data": None})
                
            @self.sio.event
            async def room_list_update(data):
                self.socket_events.append({"event": "room_list_update", "data": data})
                
            @self.sio.event
            async def room_created(data):
                self.socket_events.append({"event": "room_created", "data": data})
                
            @self.sio.event
            async def error(data):
                self.socket_events.append({"event": "error", "data": data})
            
            # Try to connect to internal URL
            print("  Testing internal Socket.IO connection...")
            await asyncio.wait_for(self.sio.connect("http://localhost:8001"), timeout=10)
            
            # Wait a moment for connection to establish
            await asyncio.sleep(2)
            
            if self.sio.connected:
                self.log_result("Socket Connection (Internal)", True, "Successfully connected to internal Socket.IO server")
                return True
            else:
                self.log_result("Socket Connection (Internal)", False, "Failed to establish internal connection")
                return False
                
        except Exception as e:
            self.log_result("Socket Connection (Internal)", False, f"Internal connection failed: {str(e)}")
            return False
    
    async def test_join_lobby(self):
        """Test join_lobby socket event"""
        if not self.sio or not self.sio.connected:
            self.log_result("Join Lobby", False, "Socket not connected")
            return
            
        try:
            # Clear previous events
            self.socket_events.clear()
            
            # Emit join_lobby event
            await self.sio.emit('join_lobby')
            
            # Wait for response
            await asyncio.sleep(2)
            
            # Check if we received room_list_update
            room_updates = [e for e in self.socket_events if e["event"] == "room_list_update"]
            
            if room_updates:
                data = room_updates[0]["data"]
                if "rooms" in data and isinstance(data["rooms"], list):
                    self.log_result("Join Lobby", True, f"Joined lobby, received room list ({len(data['rooms'])} rooms)", data)
                else:
                    self.log_result("Join Lobby", False, "Invalid room list format", data)
            else:
                self.log_result("Join Lobby", False, "No room list update received", self.socket_events)
                
        except Exception as e:
            self.log_result("Join Lobby", False, f"Event failed: {str(e)}")
    
    async def test_create_room(self):
        """Test create_room socket event"""
        if not self.sio or not self.sio.connected:
            self.log_result("Create Room", False, "Socket not connected")
            return
            
        try:
            # Clear previous events
            self.socket_events.clear()
            
            # Create room data
            room_data = {
                "name": "Test Room",
                "host": "TestPlayer",
                "maxPlayers": 6
            }
            
            # Emit create_room event
            await self.sio.emit('create_room', room_data)
            
            # Wait for response
            await asyncio.sleep(2)
            
            # Check for room_created event
            room_created = [e for e in self.socket_events if e["event"] == "room_created"]
            errors = [e for e in self.socket_events if e["event"] == "error"]
            
            if errors:
                self.log_result("Create Room", False, "Server returned error", errors[0]["data"])
            elif room_created:
                data = room_created[0]["data"]
                if "room" in data:
                    room = data["room"]
                    if room.get("name") == "Test Room" and room.get("host") == "TestPlayer":
                        self.log_result("Create Room", True, "Room created successfully", data)
                    else:
                        self.log_result("Create Room", False, "Room data mismatch", data)
                else:
                    self.log_result("Create Room", False, "Invalid room created response", data)
            else:
                self.log_result("Create Room", False, "No room created event received", self.socket_events)
                
        except Exception as e:
            self.log_result("Create Room", False, f"Event failed: {str(e)}")
    
    async def test_socket_disconnect(self):
        """Test socket disconnection"""
        if self.sio and self.sio.connected:
            try:
                await self.sio.disconnect()
                self.log_result("Socket Disconnect", True, "Successfully disconnected from Socket.IO server")
            except Exception as e:
                self.log_result("Socket Disconnect", False, f"Disconnect failed: {str(e)}")
        else:
            self.log_result("Socket Disconnect", False, "Socket was not connected")
    
    def print_summary(self):
        """Print test summary"""
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if r['success']])
        failed_tests = total_tests - passed_tests
        
        print("\n" + "="*60)
        print("HAXBALL BACKEND TEST SUMMARY")
        print("="*60)
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print("\nFAILED TESTS:")
            for result in self.test_results:
                if not result['success']:
                    print(f"  ❌ {result['test']}: {result['message']}")
                    if result['details']:
                        print(f"     Details: {result['details']}")
        
        print("\nDETAILED RESULTS:")
        for result in self.test_results:
            status = "✅" if result['success'] else "❌"
            print(f"  {status} {result['test']}: {result['message']}")
        
        return failed_tests == 0

async def main():
    """Run all tests"""
    print("Starting HaxBall Backend Tests...")
    print(f"Testing backend at: {BACKEND_URL}")
    print("-" * 60)
    
    tester = HaxBallTester()
    
    # Test REST API endpoints
    print("\n🔍 Testing REST API Endpoints...")
    tester.test_api_root()
    tester.test_auth_login()
    tester.test_get_rooms()
    
    # Test WebSocket functionality
    print("\n🔌 Testing WebSocket Functionality...")
    socket_connected = await tester.test_socket_connection()
    
    if socket_connected:
        await tester.test_join_lobby()
        await tester.test_create_room()
        await tester.test_socket_disconnect()
    else:
        print("⚠️  Skipping socket tests due to connection failure")
    
    # Print summary
    success = tester.print_summary()
    
    return 0 if success else 1

if __name__ == "__main__":
    try:
        exit_code = asyncio.run(main())
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\nUnexpected error: {e}")
        sys.exit(1)