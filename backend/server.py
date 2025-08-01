from fastapi import FastAPI, File, UploadFile, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
import os
import base64
import uuid
from datetime import datetime, timedelta
import asyncio
from emergentintegrations.llm.chat import LlmChat, UserMessage, FileContentWithMimeType
from pydantic import BaseModel
from typing import Optional, List
import tempfile
import json
import requests
from dotenv import load_dotenv
import pymongo
from pymongo import MongoClient

# Load environment variables from .env file
load_dotenv()

# Initialize FastAPI app
app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Get environment variables
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME', 'phool_db')

# Initialize MongoDB connection
client = MongoClient(MONGO_URL)
db = client[DB_NAME]
users_collection = db.users
sessions_collection = db.sessions

class FlowerIdentificationResponse(BaseModel):
    id: str
    flower_name: str
    scientific_name: str
    family: str
    basic_facts: str
    care_instructions: str
    symbolic_meanings: str
    cultivation_tips: str
    seasonal_info: str
    interesting_story: str
    confidence: str
    timestamp: str
    user_id: Optional[str] = None

class UserProfile(BaseModel):
    id: str
    email: str
    name: str
    picture: str

class SessionData(BaseModel):
    session_id: str

async def get_current_user(x_session_id: Optional[str] = Header(None)):
    """Get current user from session ID"""
    if not x_session_id:
        return None
    
    # Check if session exists and is valid
    session = sessions_collection.find_one({
        "session_token": x_session_id,
        "expires_at": {"$gt": datetime.utcnow()}
    })
    
    if not session:
        return None
    
    # Get user data
    user = users_collection.find_one({"id": session["user_id"]})
    return user

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "Phool Flower Identification API"}

@app.post("/api/auth/profile")
async def authenticate_user(session_data: SessionData):
    """Authenticate user with Emergent auth service"""
    try:
        # Call Emergent auth API
        headers = {"X-Session-ID": session_data.session_id}
        response = requests.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers=headers,
            timeout=10
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session")
        
        user_data = response.json()
        
        # Check if user already exists
        existing_user = users_collection.find_one({"email": user_data["email"]})
        
        if not existing_user:
            # Create new user
            user_doc = {
                "id": user_data["id"],
                "email": user_data["email"],
                "name": user_data["name"],
                "picture": user_data["picture"],
                "created_at": datetime.utcnow()
            }
            users_collection.insert_one(user_doc)
        
        # Create session token
        session_token = str(uuid.uuid4())
        expires_at = datetime.utcnow() + timedelta(days=7)
        
        # Save session
        session_doc = {
            "session_token": session_token,
            "user_id": user_data["id"],
            "expires_at": expires_at,
            "created_at": datetime.utcnow()
        }
        sessions_collection.insert_one(session_doc)
        
        return {
            "user": UserProfile(
                id=user_data["id"],
                email=user_data["email"],
                name=user_data["name"],
                picture=user_data["picture"]
            ),
            "session_token": session_token,
            "expires_at": expires_at.isoformat()
        }
        
    except Exception as e:
        print(f"Authentication error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Authentication failed: {str(e)}")

@app.get("/api/user/profile")
async def get_user_profile(current_user = Depends(get_current_user)):
    """Get current user profile"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    return UserProfile(
        id=current_user["id"],
        email=current_user["email"],
        name=current_user["name"],
        picture=current_user["picture"]
    )

@app.post("/api/identify-flower", response_model=FlowerIdentificationResponse)
async def identify_flower(file: UploadFile = File(...), current_user = Depends(get_current_user)):
    try:
        if not GEMINI_API_KEY:
            raise HTTPException(status_code=500, detail="Gemini API key not configured")
        
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read the uploaded file
        file_content = await file.read()
        
        # Create a temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as temp_file:
            temp_file.write(file_content)
            temp_file_path = temp_file.name
        
        try:
            # Initialize Gemini chat
            chat = LlmChat(
                api_key=GEMINI_API_KEY,
                session_id=f"flower-identification-{uuid.uuid4()}",
                system_message="""You are an expert botanist and flower identification specialist. 
                When given an image of a flower, provide comprehensive information in the following JSON format:
                {
                    "flower_name": "Common name of the flower",
                    "scientific_name": "Scientific/Latin name",
                    "family": "Plant family name",
                    "basic_facts": "Key characteristics and basic information",
                    "care_instructions": "How to care for this flower if grown",
                    "symbolic_meanings": "Cultural and symbolic significance",
                    "cultivation_tips": "Growing and cultivation advice",
                    "seasonal_info": "Blooming season and seasonal care",
                    "interesting_story": "Fascinating historical facts, legends, or stories about this flower",
                    "confidence": "High/Medium/Low - your confidence in this identification"
                }
                
                If you cannot clearly identify the flower, be honest about it and provide your best guess with lower confidence.
                Make all responses detailed and informative."""
            ).with_model("gemini", "gemini-2.0-flash")
            
            # Create image file content
            image_file = FileContentWithMimeType(
                file_path=temp_file_path,
                mime_type=file.content_type
            )
            
            # Create user message with image
            user_message = UserMessage(
                text="Please identify this flower and provide comprehensive information about it in JSON format.",
                file_contents=[image_file]
            )
            
            # Send message to Gemini
            response = await chat.send_message(user_message)
            
            # Parse the JSON response
            try:
                # Extract JSON from response if it's wrapped in markdown
                response_text = response.strip()
                if response_text.startswith('```json'):
                    response_text = response_text.split('```json')[1].split('```')[0].strip()
                elif response_text.startswith('```'):
                    response_text = response_text.split('```')[1].split('```')[0].strip()
                
                flower_data = json.loads(response_text)
            except json.JSONDecodeError:
                # If JSON parsing fails, create a structured response from the text
                flower_data = {
                    "flower_name": "Identification Result",
                    "scientific_name": "Unknown",
                    "family": "Unknown",
                    "basic_facts": response[:200] + "..." if len(response) > 200 else response,
                    "care_instructions": "Unable to parse detailed care instructions",
                    "symbolic_meanings": "Unable to parse symbolic meanings",
                    "cultivation_tips": "Unable to parse cultivation tips",
                    "seasonal_info": "Unable to parse seasonal information",
                    "interesting_story": "Unable to parse historical information",
                    "confidence": "Low"
                }
            
            # Create response
            identification_result = FlowerIdentificationResponse(
                id=str(uuid.uuid4()),
                flower_name=flower_data.get("flower_name", "Unknown Flower"),
                scientific_name=flower_data.get("scientific_name", "Unknown"),
                family=flower_data.get("family", "Unknown"),
                basic_facts=flower_data.get("basic_facts", "No basic facts available"),
                care_instructions=flower_data.get("care_instructions", "No care instructions available"),
                symbolic_meanings=flower_data.get("symbolic_meanings", "No symbolic meanings available"),
                cultivation_tips=flower_data.get("cultivation_tips", "No cultivation tips available"),
                seasonal_info=flower_data.get("seasonal_info", "No seasonal information available"),
                interesting_story=flower_data.get("interesting_story", "No interesting stories available"),
                confidence=flower_data.get("confidence", "Medium"),
                timestamp=datetime.now().isoformat(),
                user_id=current_user["id"] if current_user else None
            )
            
            return identification_result
            
        finally:
            # Clean up temporary file
            try:
                os.unlink(temp_file_path)
            except:
                pass
        
    except Exception as e:
        print(f"Error in flower identification: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error identifying flower: {str(e)}")

@app.post("/api/logout")
async def logout(current_user = Depends(get_current_user), x_session_id: Optional[str] = Header(None)):
    """Logout user and invalidate session"""
    if x_session_id:
        sessions_collection.delete_one({"session_token": x_session_id})
    
    return {"message": "Logged out successfully"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)