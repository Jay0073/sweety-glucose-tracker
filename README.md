# Sweety

Sweety is a blood glucose tracker for diabetes patients. A patient can record one reading in each of four daily time slots and review daily, month-to-date, and previous-month reports.

This repository is under active development. Complete installation, database, test, and demo instructions will be added as each feature is finished.

## Stack

- React and Vite
- Node.js and Express
- PostgreSQL with parameterized SQL queries
- JWT authentication and bcrypt password hashing

The assignment title mentions MERN and PostgreSQL. This implementation follows the email body and uses PostgreSQL while retaining React and Node.js from the MERN stack.

## Quick start

1. Copy `.env.example` to `.env`.
2. Run `docker compose up --build`.
3. Open `http://localhost:5173`.

The API health endpoint is available at `http://localhost:4000/api/health`.
