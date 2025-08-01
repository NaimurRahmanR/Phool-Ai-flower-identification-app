from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
import base64
import uuid
from datetime import datetime
import asyncio
from emergentintegrations.llm.chat import LlmChat, UserMessage, FileContentWithMimeType
from pydantic import BaseModel
from typing import Optional, List
import tempfile
import json

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

# Get API key from environment
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')

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

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "Phool Flower Identification API"}

@app.post("/api/identify-flower", response_model=FlowerIdentificationResponse)
async def identify_flower(file: UploadFile = File(...)):
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
                timestamp=datetime.now().isoformat()
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)