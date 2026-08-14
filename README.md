````markdown
# Cake Delight — Cloud Native Microservices

A cloud-native cake ordering application built using independently deployable
microservices. Customers can browse cakes, filter the catalogue, manage a
basket, place orders, submit verified ratings, and receive asynchronous order
notifications.

The project demonstrates REST-based microservice communication, event-driven
architecture using RabbitMQ, transactional outbox processing, Docker
containerization, Kubernetes deployment, Minikube, health checks, Swagger/OpenAPI
documentation, and Horizontal Pod Autoscaling.

**Tech Stack:** Node.js · Express.js · MySQL · RabbitMQ · Docker · Kubernetes · Minikube

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Microservices](#microservices)
- [Features](#features)
- [Project Structure](#project-structure)
- [Technology Stack](#technology-stack)
- [Quick Start with Docker Compose](#quick-start-with-docker-compose)
- [Application URLs](#application-urls)
- [API Documentation](#api-documentation)
- [API Endpoints](#api-endpoints)
- [Event-Driven Architecture](#event-driven-architecture)
- [RabbitMQ](#rabbitmq)
- [Reliability](#reliability)
- [Kubernetes Deployment](#kubernetes-deployment)
- [Kubernetes Services](#kubernetes-services)
- [Kubernetes Health and Scaling](#kubernetes-health-and-scaling)
- [Docker](#docker)
- [Configuration](#configuration)
- [Environment Files](#environment-files)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Documentation](#documentation)
- [Submission Preparation](#submission-preparation)
- [Final Verification Checklist](#final-verification-checklist)
- [License](#license)

---

# Overview

Cake Delight is a cloud-native cake ordering platform designed using a
microservices architecture.

The system separates business capabilities into independent services:

- Cake catalogue management
- Customer ratings and reviews
- Shopping basket and orders
- Inventory management
- Notifications
- Analytics
- API Gateway

Each service owns its own database and communicates with other services using
REST APIs or asynchronous RabbitMQ events.

The application can be executed in two environments:

1. **Docker Compose** for local development and evaluation
2. **Kubernetes / Minikube** for container orchestration and scaling

---

# Architecture

```text
                           ┌──────────────────────────┐
                           │      Browser Frontend     │
                           │      HTML / CSS / JS      │
                           └────────────┬─────────────┘
                                        │
                                        ▼
                           ┌──────────────────────────┐
                           │      API Gateway :8080   │
                           │                          │
                           │  Routing · CORS · Health │
                           │  Static Frontend         │
                           └────────────┬─────────────┘
                                        │
          ┌───────────────┬─────────────┼─────────────┬───────────────┐
          │               │             │             │               │
          ▼               ▼             ▼             ▼               ▼
   ┌────────────┐  ┌────────────┐ ┌────────────┐ ┌────────────┐
   │  Catalog   │  │   Rating   │ │   Order    │ │ Inventory  │
   │   :8081    │  │   :8082    │ │   :8083    │ │   :8084    │
   └─────┬──────┘  └─────┬──────┘ └─────┬──────┘ └─────┬──────┘
         │               │              │              │
         ▼               ▼              ▼              ▼
   ┌────────────┐  ┌────────────┐ ┌────────────┐ ┌────────────┐
   │ catalog-db │  │ rating-db  │ │  order-db  │ │inventory-db│
   └────────────┘  └────────────┘ └──────┬─────┘ └────────────┘
                                         │
                                         │ Transactional
                                         │ Outbox
                                         ▼
                                  ┌──────────────┐
                                  │   RabbitMQ   │
                                  │ order.events │
                                  └──────┬───────┘
                                         │
                         ┌───────────────┼────────────────┐
                         │               │                │
                         ▼               ▼                ▼
                  ┌────────────┐ ┌────────────┐ ┌────────────┐
                  │Notification│ │ Inventory  │ │ Analytics  │
                  │   :8085    │ │  Consumer  │ │   :8086    │
                  └─────┬──────┘ └────────────┘ └─────┬──────┘
                        │                              │
                        ▼                              ▼
                 ┌──────────────┐              ┌──────────────┐
                 │notification-db│              │ analytics-db │
                 └──────────────┘              └──────────────┘
````

### Communication

The architecture uses two types of communication.

**Synchronous communication**

```text
API Gateway → Microservice
Microservice → Microservice
```

using REST APIs.

**Asynchronous communication**

```text
Order Service
      │
      ▼
Transactional Outbox
      │
      ▼
RabbitMQ
      │
      ├── Inventory Service
      ├── Notification Service
      └── Analytics Service
```

Each microservice owns its own database. No service directly accesses another
service's database tables.

---

# Microservices

| Service              | Port | Database             | Responsibility                                       |
| -------------------- | ---: | -------------------- | ---------------------------------------------------- |
| API Gateway          | 8080 | —                    | Public entry point, routing, frontend, health checks |
| Catalog Service      | 8081 | `cake_catalog`       | Cakes, categories, filtering and catalogue           |
| Rating Service       | 8082 | `cake_ratings`       | Verified ratings and reviews                         |
| Order Service        | 8083 | `cake_orders`        | Basket, checkout, orders and outbox                  |
| Inventory Service    | 8084 | `cake_inventory`     | Stock and reservations                               |
| Notification Service | 8085 | `cake_notifications` | Order notifications                                  |
| Analytics Service    | 8086 | `cake_analytics`     | Revenue and sales analytics                          |

---

# Features

* Cake catalogue
* Cake category browsing
* Cake filtering and search
* Shopping basket
* Checkout
* Order management
* Order status management
* Order cancellation
* Customer ratings and reviews
* Verified ratings based on purchased orders
* Inventory tracking
* Inventory reservation
* RabbitMQ event processing
* Email / SMS / In-app notification support
* Analytics and revenue reporting
* Transactional outbox pattern
* RabbitMQ publisher confirms
* Retry and dead-letter queue handling
* Idempotent event consumers
* API Gateway
* Health checks
* Correlation IDs
* Swagger/OpenAPI documentation
* Docker Compose deployment
* Kubernetes deployment
* Minikube support
* Kubernetes Metrics Server
* Horizontal Pod Autoscaling
* Persistent storage for databases and RabbitMQ

---

# Project Structure

```text
myproject/
│
├── api-gateway/
│   ├── src/
│   ├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   └── .env
│
├── services/
│   ├── catalog-service/
│   │   ├── src/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── .env
│   │
│   ├── rating-service/
│   ├── order-service/
│   ├── inventory-service/
│   ├── notification-service/
│   └── analytics-service/
│
├── frontend/
│   ├── css/
│   ├── images/
│   ├── js/
│   └── *.html
│
├── database/
│   ├── catalog/
│   ├── rating/
│   ├── order/
│   ├── inventory/
│   ├── notification/
│   └── analytics/
│
├── kubernetes/
│   ├── 00-namespace.yaml
│   ├── 01-secrets.yaml
│   ├── analytics/
│   ├── catalog/
│   ├── database/
│   ├── gateway/
│   ├── hpa/
│   ├── inventory/
│   ├── notification/
│   ├── order/
│   ├── rabbitmq/
│   └── rating/
│
├── docs/
│   └── screenshots/
│
├── scripts/
│
├── docker-compose.yml
├── .dockerignore
├── .gitignore
├── .env.example
├── package.json
├── package-lock.json
└── README.md
```

---

# Technology Stack

| Category          | Technology                |
| ----------------- | ------------------------- |
| Runtime           | Node.js                   |
| Backend           | Express.js                |
| Database          | MySQL 8.4                 |
| Messaging         | RabbitMQ                  |
| API               | REST                      |
| API Documentation | OpenAPI / Swagger         |
| Containerization  | Docker                    |
| Orchestration     | Kubernetes                |
| Local Kubernetes  | Minikube                  |
| Package Manager   | npm                       |
| Frontend          | HTML, CSS, JavaScript     |
| Scaling           | Kubernetes HPA            |
| Metrics           | Kubernetes Metrics Server |

---

# Quick Start with Docker Compose

## Prerequisites

Install:

* Docker Desktop
* Docker Compose v2
* Git

Node.js and MySQL are not required on the host when running the complete
application using Docker Compose.

Verify Docker:

```bash
docker --version
docker compose version
```

## Start the application

From the project root:

```bash
docker compose up -d --build
```

Check the containers:

```bash
docker compose ps
```

The application contains:

* API Gateway
* 6 microservices
* 6 MySQL databases
* RabbitMQ

---

# Application URLs

When running with Docker Compose:

| Component           | URL                                                                                        |
| ------------------- | ------------------------------------------------------------------------------------------ |
| Frontend            | [http://localhost:8080](http://localhost:8080)                                             |
| API Gateway Health  | [http://localhost:8080/health](http://localhost:8080/health)                               |
| Aggregated Health   | [http://localhost:8080/health/services](http://localhost:8080/health/services)             |
| Swagger UI          | [http://localhost:8080/api-docs](http://localhost:8080/api-docs)                           |
| OpenAPI YAML        | [http://localhost:8080/api-docs/openapi.yaml](http://localhost:8080/api-docs/openapi.yaml) |
| RabbitMQ Management | [http://localhost:15672](http://localhost:15672)                                           |

RabbitMQ local credentials:

```text
Username: guest
Password: guest
```

---

# Health Checks

## Gateway health

```bash
curl http://localhost:8080/health
```

Expected response:

```json
{
  "status": "UP",
  "service": "API Gateway"
}
```

## Aggregated health

```bash
curl http://localhost:8080/health/services
```

This checks the availability of the backend services through the API Gateway.

---

# Stop Docker Compose

Stop the application:

```bash
docker compose down
```

Stop the application and remove database volumes:

```bash
docker compose down -v
```

> `docker compose down -v` removes the local database data.

---

# API Documentation

Swagger UI is available at:

```text
http://localhost:8080/api-docs
```



Customer-scoped requests use:

```http
X-Customer-Id: customer-1001
```

Example:

```bash
curl http://localhost:8080/api/v1/orders \
  -H "X-Customer-Id: customer-1001"
```

---

# API Endpoints

## Catalog

```text
GET    /api/v1/cakes
POST   /api/v1/cakes
GET    /api/v1/cakes/categories
GET    /api/v1/cakes/batch?ids=a,b,c
GET    /api/v1/cakes/{cakeId}
PUT    /api/v1/cakes/{cakeId}
DELETE /api/v1/cakes/{cakeId}
```

Catalogue filtering supports parameters such as:

```text
name
category
minPrice
maxPrice
search
available
page
size
sortBy
sortDir
includeRatings
```

---

## Basket

```text
GET    /api/v1/basket
POST   /api/v1/basket/items
PUT    /api/v1/basket/items/{cakeId}
DELETE /api/v1/basket/items/{cakeId}
DELETE /api/v1/basket
```

---

## Orders

```text
POST   /api/v1/orders/checkout
GET    /api/v1/orders
GET    /api/v1/orders/{orderId}
GET    /api/v1/orders/by-number/{orderNumber}
PATCH  /api/v1/orders/{orderId}/status
POST   /api/v1/orders/{orderId}/cancel
```

---

## Ratings

```text
POST   /api/v1/ratings
GET    /api/v1/ratings/summary
GET    /api/v1/ratings/cake/{cakeId}
GET    /api/v1/ratings/cake/{cakeId}/summary
GET    /api/v1/ratings/customer/{customerId}
GET    /api/v1/ratings/{ratingId}
DELETE /api/v1/ratings/{ratingId}
```

---

## Notifications

```text
GET /api/v1/notifications
GET /api/v1/notifications/customer/{customerId}
```

---

## Inventory

```text
GET /api/v1/inventory/{cakeId}
```

---

## Analytics

```text
GET /api/v1/analytics/summary
GET /api/v1/analytics/top-cakes?limit=10
GET /api/v1/analytics/daily-revenue
```

---

# Event-Driven Architecture

Order completion uses the **Transactional Outbox Pattern**.

When a customer checks out, the Order Service performs the following within a
database transaction:

```text
Create Order
     │
     ├── Create Order Items
     │
     ├── Clear Basket
     │
     └── Create Outbox Event
               │
               ▼
        Transaction Commit
               │
               ▼
        Outbox Publisher
               │
               ▼
           RabbitMQ
               │
               ▼
        order.completed
               │
       ┌───────┼────────┐
       │       │        │
       ▼       ▼        ▼
   Inventory Notification Analytics
```

This ensures that an accepted order does not lose its corresponding event when
RabbitMQ is temporarily unavailable.

---

# RabbitMQ

RabbitMQ exchange:

```text
order.events
```

Routing key:

```text
order.completed
```

Consumer queues:

```text
inventory.order.completed
notification.order.completed
analytics.order.completed
```

Dead-letter queues:

```text
inventory.order.completed.dlq
notification.order.completed.dlq
analytics.order.completed.dlq
```

The consumers are designed to process duplicate messages safely using
idempotency controls.

---

# Reliability

| Concern                | Mechanism                           |
| ---------------------- | ----------------------------------- |
| Database startup       | Connection retries with backoff     |
| RabbitMQ startup       | Background connection retry         |
| RabbitMQ disconnect    | Automatic reconnection              |
| Event loss             | Transactional outbox                |
| Broker acknowledgement | Publisher confirms                  |
| Failed message         | Retry handling                      |
| Poison message         | Dead-letter queue                   |
| Duplicate events       | Idempotency constraints             |
| Rating unavailable     | Catalogue continues without ratings |
| Service unavailable    | Gateway error handling              |
| Request tracing        | `X-Correlation-Id`                  |
| Health monitoring      | Health endpoints                    |
| Kubernetes monitoring  | Metrics Server                      |

---

# Kubernetes Deployment

Cake Delight can also be deployed using Kubernetes with Minikube.

## Prerequisites

Install:

* Docker Desktop
* Minikube
* kubectl

Verify:

```bash
docker --version
minikube version
kubectl version --client
```

---

# Start Minikube

The recommended configuration for this project is:

```bash
minikube start --driver=docker --cpus=4 --memory=6144
```

Check the cluster:

```bash
minikube status
```

Check the node:

```bash
kubectl get nodes
```

Expected:

```text
NAME       STATUS   ROLES           AGE   VERSION
minikube   Ready    control-plane   ...   ...
```

> Docker Desktop must have sufficient memory allocated to support Minikube and
> the application workloads.

---

# Deploy Cake Delight to Kubernetes

All Kubernetes manifests are stored under:

```text
kubernetes/
```

## 1. Create namespace

```bash
kubectl apply -f kubernetes/00-namespace.yaml
```

## 2. Create secrets

```bash
kubectl apply -f kubernetes/01-secrets.yaml
```

## 3. Apply database initialization configuration

```bash
kubectl apply -f kubernetes/database/
```

## 4. Deploy RabbitMQ

```bash
kubectl apply -f kubernetes/rabbitmq/
```

## 5. Deploy microservices

```bash
kubectl apply -f kubernetes/catalog/
kubectl apply -f kubernetes/rating/
kubectl apply -f kubernetes/order/
kubectl apply -f kubernetes/inventory/
kubectl apply -f kubernetes/notification/
kubectl apply -f kubernetes/analytics/
kubectl apply -f kubernetes/gateway/
```

## 6. Enable Metrics Server

```bash
minikube addons enable metrics-server
```

## 7. Deploy Horizontal Pod Autoscaling

```bash
kubectl apply -f kubernetes/hpa/
```

---

# Verify Kubernetes

Check all pods:

```bash
kubectl get pods -n cake-delight
```

Check deployments:

```bash
kubectl get deployments -n cake-delight
```

Check services:

```bash
kubectl get services -n cake-delight
```

Check HPA:

```bash
kubectl get hpa -n cake-delight
```

Check CPU metrics:

```bash
kubectl top pods -n cake-delight
```

---

# Kubernetes Services

The application uses the `cake-delight` namespace.

| Service         | Type      |         Port |
| --------------- | --------- | -----------: |
| API Gateway     | NodePort  | 8080 → 30080 |
| Catalog         | ClusterIP |         8081 |
| Rating          | ClusterIP |         8082 |
| Order           | ClusterIP |         8083 |
| Inventory       | ClusterIP |         8084 |
| Notification    | ClusterIP |         8085 |
| Analytics       | ClusterIP |         8086 |
| RabbitMQ        | ClusterIP | 5672 / 15672 |
| MySQL Databases | ClusterIP |         3306 |

The API Gateway is the publicly exposed application service.

---

# Access the Application in Minikube

Run:

```bash
minikube service api-gateway -n cake-delight --url
```

Example output:

```text
http://127.0.0.1:61259
```

Keep this command running while accessing the application.

The port may change when the service tunnel is restarted.

Test the Gateway:

```bash
curl http://127.0.0.1:61259/health
```

Example:

```json
{
  "status": "UP",
  "service": "API Gateway"
}
```

Test the catalogue:

```bash
curl http://127.0.0.1:61259/api/v1/cakes
```

Test customer orders:

```bash
curl http://127.0.0.1:61259/api/v1/orders \
  -H "X-Customer-Id: customer-1001"
```

Test customer ratings:

```bash
curl "http://127.0.0.1:61259/api/v1/ratings/customer/customer-1001?page=0&size=20" \
  -H "X-Customer-Id: customer-1001"
```

---

# Kubernetes Health and Scaling

The project uses Kubernetes readiness/liveness probes and Horizontal Pod
Autoscaling.

Configured HPAs:

| Deployment      | Minimum Pods | Maximum Pods | CPU Target |
| --------------- | -----------: | -----------: | ---------: |
| API Gateway     |            2 |            6 |        70% |
| Catalog Service |            2 |            8 |        70% |
| Order Service   |            2 |            6 |        70% |
| Rating Service  |            1 |            4 |        70% |

Example:

```bash
kubectl get hpa -n cake-delight
```

A healthy cluster should show actual CPU usage instead of `<unknown>`.

Example:

```text
NAME                  TARGETS       MINPODS   MAXPODS
api-gateway-hpa       6%/70%        2         6
catalog-service-hpa   4%/70%        2         8
order-service-hpa     9%/70%        2         6
rating-service-hpa    4%/70%        1         4
```

---

# Docker

Each microservice has its own Dockerfile.

The services use Node.js Alpine-based images and production dependency
installation.

Example image names:

```text
cake-api-gateway
cake-catalog-service
cake-rating-service
cake-order-service
cake-inventory-service
cake-notification-service
cake-analytics-service
```

Build an individual image:

```bash
docker build -t cake-api-gateway ./api-gateway
```

The complete application is normally built using:

```bash
docker compose up -d --build
```

---

# Configuration

Environment variables are documented in `.env.example`.

Common database configuration:

```text
DB_USER
DB_PASSWORD
DB_HOST
DB_NAME
DB_PORT
```

RabbitMQ configuration:

```text
RABBITMQ_URL
RABBITMQ_EXCHANGE
RABBITMQ_DLX
RABBITMQ_QUEUE
RABBITMQ_DLQ
RABBITMQ_ROUTING_KEY
```

Order configuration:

```text
DELIVERY_FEE
FREE_DELIVERY_THRESHOLD
TAX_RATE
OUTBOX_POLL_INTERVAL_MS
OUTBOX_MAX_ATTEMPTS
```

Service URLs used by the API Gateway:

```text
CATALOG_SERVICE_URL
RATING_SERVICE_URL
ORDER_SERVICE_URL
INVENTORY_SERVICE_URL
NOTIFICATION_SERVICE_URL
ANALYTICS_SERVICE_URL
```

For local development, development credentials may be present in the project
configuration.

**Do not use development credentials in production.**

Never commit real `.env` files or production secrets.

---

# Environment Files

The project contains `.env.example` files for documenting configuration.

Actual `.env` files are excluded from version control through `.gitignore`.

Example:

```text
.env
!.env.example
```

This prevents local secrets from being accidentally committed.

---

# Testing

## Gateway health

```bash
curl http://localhost:8080/health
```

## Aggregated health

```bash
curl http://localhost:8080/health/services
```

## Get cakes

```bash
curl http://localhost:8080/api/v1/cakes
```

## Get customer orders

```bash
curl http://localhost:8080/api/v1/orders \
  -H "X-Customer-Id: customer-1001"
```

## Get customer ratings

```bash
curl "http://localhost:8080/api/v1/ratings/customer/customer-1001?page=0&size=20" \
  -H "X-Customer-Id: customer-1001"
```

## Kubernetes health

```bash
kubectl get pods -n cake-delight
```

## Kubernetes services

```bash
kubectl get services -n cake-delight
```

## Kubernetes HPA

```bash
kubectl get hpa -n cake-delight
```

---

# Troubleshooting

## Docker daemon is not running

Check:

```bash
docker info
```

Start Docker Desktop if the Docker daemon is unavailable.

---

## Kubernetes API server unavailable

Check:

```bash
minikube status
```

Restart Minikube:

```bash
minikube stop
minikube start --driver=docker --cpus=4 --memory=6144
```

Then:

```bash
kubectl get nodes
```

---

## Pods show ImagePullBackOff

Check the required images:

```bash
docker images | grep cake-
```

Check images available inside Minikube:

```bash
minikube image ls | grep cake-
```

Load local images into Minikube:

```bash
minikube image load cake-api-gateway:latest
minikube image load cake-catalog-service:latest
minikube image load cake-rating-service:latest
minikube image load cake-order-service:latest
minikube image load cake-inventory-service:latest
minikube image load cake-notification-service:latest
minikube image load cake-analytics-service:latest
```

Restart deployments:

```bash
kubectl rollout restart deployment -n cake-delight
```

---

## HPA shows `<unknown>`

Enable Metrics Server:

```bash
minikube addons enable metrics-server
```

Check:

```bash
kubectl get pods -n kube-system | grep metrics
```

Then:

```bash
kubectl top pods -n cake-delight
kubectl get hpa -n cake-delight
```

---

## Gateway URL stops working

When using:

```bash
minikube service api-gateway -n cake-delight --url
```

the command creates a temporary local forwarding tunnel.

Keep the command running.

If it is stopped with `Ctrl+C`, the generated localhost URL will stop working.

Run it again:

```bash
minikube service api-gateway -n cake-delight --url
```

---

# Documentation

Additional screenshots are stored in:

```text
docs/
└── screenshots/
```

API documentation is available through the API Gateway when the application is
running:

```text
http://localhost:8080/api-docs
```

---

