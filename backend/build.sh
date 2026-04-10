#!/usr/bin/env bash
# Exit on error
set -o errexit

echo "🚀 Starting Balkanji Backend Build..."

# If we are in the repository root, move to backend directory
if [[ -d "backend" && "$PWD" != *"/backend" ]]; then
    echo "📂 Root directory detected. Moving into 'backend'..."
    cd backend
fi

echo "📍 Current Directory: $PWD"

echo "📦 Installing dependencies from requirements.txt..."
pip install -r requirements.txt

echo "✨ Collecting static files..."
python manage.py collectstatic --noinput

echo "🗄️ Running database migrations..."
python manage.py migrate

echo "✅ Build Process Complete!"
