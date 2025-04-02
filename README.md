# Medicine - Pet Tracking Application

This repository contains a pet tracking application with frontend (React Native) and backend (Node.js) components, featuring working danger zone detection with medication management.

## Features

- Track pets on a map in real-time
- Monitor pet activity and health
- Manage veterinary appointments and medication schedules
- Set up safe zones and get alerts

## Repository Setup

To push this repository to GitHub:

1. Create a new repository named "Medicine" at https://github.com/new
2. After creating the repository, run these commands:

```bash
git remote set-url origin https://github.com/YOUR-USERNAME/Medicine.git
git push -u origin main
```

## Project Structure

- **Frontend**: React Native application in the `Fronted` directory
- **Backend**: Node.js server in the `Backend` directory

## Local Development

### Requirements

- Node.js 16+
- Expo CLI for frontend development
- MongoDB for the backend database

### Running the Frontend

```bash
cd Fronted/MyBachelor-testing
npm install
expo start
```

### Running the Backend

```bash
cd Backend/MyBachelor_Backend-main/MyBachelor_Backend-main
npm install
npm start
```

## Using Expo

This project can be run with Expo Go, which eliminates the need for storing all dependencies locally:

1. Install Expo Go on your mobile device
2. Run `expo start` from the frontend directory
3. Scan the QR code with your device
