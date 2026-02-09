#!/usr/bin/env bash
# Exit on error
set -o errexit

# Upgrade pip
pip install --upgrade pip

# Install dependencies
pip install -r requirements.txt

# Verify gunicorn is installed
echo "Checking gunicorn installation..."
pip show gunicorn || echo "Gunicorn not found!"
which gunicorn || echo "Gunicorn not in PATH!"

# Collect static files
python manage.py collectstatic --no-input

# Run migrations
python manage.py migrate

echo "Build completed successfully!"