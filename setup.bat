@echo off
echo Creating virtual environment...
python -m venv venv

echo.
echo Activating virtual environment...
call venv\Scripts\activate.bat

echo.
echo Installing dependencies...
pip install -r requirements.txt

echo.
echo Setup complete!
echo.
echo To run the app:
echo   1. Activate venv: venv\Scripts\activate
echo   2. Run app: python app.py
echo.
pause
