from fastapi import FastAPI

app = FastAPI()

@app.get("/")
async def root():
    return {"message": "¡Bienvenido a TravelSplit Backend!"}

@app.get("/ping")
async def ping():
    return {"result":"pong"}
