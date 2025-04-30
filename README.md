# 🚀 RideAlerts - YYC Backend

> **Turnkey real-time mobility backend — open-data driven, push-readied, and user-centric 🚀**

## 📖 Overview

RideAlerts powers real-time public transit alerting and vehicle tracking across Calgary, Alberta. This backend provides scalable APIs for:

- **Live vehicle tracking** (buses, trains)
- **Push notifications** via FCM & Expo
- **User and subscription management**
- **Real-time data parsing from GTFS feeds**
- **Robust authentication and admin controls**

---

## 🧰 Tech Stack

| Layer              | Tech                                                                 |
|--------------------|----------------------------------------------------------------------|
| Runtime            | Node.js (async, event-driven)                                        |
| Framework          | Express.js (routing, middleware)                                     |
| Database           | MongoDB + Mongoose (schema-based NoSQL)                             |
| Notifications      | Firebase Admin SDK + Expo Server SDK (FCM, push tokens)              |
| Transit Data       | GTFS-Realtime-Bindings (protobuf parsing for live vehicle data)      |
| HTTP Client        | axios (API requests, e.g. open data feeds)                           |
| Caching            | node-cache (in-memory performance boost)                             |
| Config Management  | dotenv (.env and .env.template)                                      |
| Validation         | validatorjs (robust schema/input validation)                         |
| Data Parsing       | csv-parse (static transit schedule support)                          |
| Dev Workflow       | nodemon (auto-reload for development)                                |

---

## 📂 Project Structure

```
/controllers   → Handles HTTP logic per resource (users, routes, vehicles)
/models        → Mongoose schemas & DB logic
/services      → Core business logic (tracking, push, caching, etc)
/middleware    → Auth, logging, error handling (DRY, reusable)
/routes        → RESTful route files by resource
/helpers       → Small reusable functions (e.g., Haversine, validators)
/utils         → Utility functions and wrappers
/config        → Environment and external config loaders
/scripts       → CLI tools for batch data loading and maintenance
```

---

## ✨ Features

### 🚍 Real-time Vehicle Tracking
- GTFS-realtime (protobuf) every 30s via Calgary open data
- Smart in-memory caching (vehicleCache) with invalidation logic
- Geospatial proximity queries using Haversine distance
- Optimized route-to-trip resolution with LRU caching

### 📲 Push Notifications
- Firebase Admin SDK for FCM delivery
- Expo token support for React Native apps
- User preferences: frequency, range, sound, vibration
- Batched multicast support
- Token fallback and transparent handling

### 🔐 Authentication & Security
- Firebase Auth with custom claims (e.g. admin)
- Middleware for role-based access control
- Secure user routes and profile protection

### 🛠️ Robust Engineering Practices
- Graceful shutdown (SIGTERM/SIGINT safe)
- Structured access/error logging middleware
- Environment-based config (.env / .env.template)
- Fully async/await — non-blocking I/O
- Modular, testable services

---

## 🧩 Engineering Principles

- **Separation of concerns**: Controllers vs Services vs Models
- **Reusable logic**: Utilities and services are independently testable
- **DevOps ready**: Environment-driven config, CLI tooling for data ingestion
- **City-agnostic**: Extendable to other cities with modular GTFS loaders

---

## 🔧 CLI Scripts

Under `/scripts`, utilities exist for:
- Bulk GTFS data load
- Transit route/stop analysis
- System health checks and metrics

---

## 🔮 Future-Ready

- Extendable for other transit systems
- Easily integrates with a React Native frontend
- Ready for horizontal scaling with cache layers and async queuing

---

## 💎 Summary

RideAlerts is a scalable and modular backend built for real-time transit and notification services. It leverages modern web technologies to deliver reliable mobility insights, and is designed with extensibility and performance in mind.



